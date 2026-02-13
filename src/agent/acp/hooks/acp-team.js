/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ACP Team Operations - Module-Based Hooks
 *
 * This module handles agent team setup for ACP backends:
 * 1. onSetup: Detect team mode from teamMembers or env vars
 * 2. onWorkspaceInit: Generate subagent .md files from teamMembers
 *    that have inline systemPrompt (members without systemPrompt
 *    reuse agent files already copied by acp-agents.js)
 *
 * Priority is set to 30, which runs AFTER acp-agents.js (20).
 * This means team members can reference or override agents that
 * were already copied from the assistant's agents/ folder.
 */

const path = require('path');

module.exports = {
  /**
   * Setup hook — team detection and environment configuration
   * Runs BEFORE any file operations so the team env var is set early.
   */
  onSetup: {
    handler: async (context) => {
      const { teamMembers, customEnv } = context;
      let isTeam = context.isTeam || false;

      // Detect team from teamMembers count
      if (teamMembers && teamMembers.length >= 2) {
        isTeam = true;
      }

      // Also check frontend-provided customEnv
      if (customEnv && customEnv.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === '1') {
        isTeam = true;
      }

      if (!isTeam) return {};

      // Auto-set team env var when team detected
      const envUpdate = {};
      if (!customEnv || !customEnv.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS) {
        envUpdate.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = '1';
      }

      return {
        isTeam,
        customEnv: Object.keys(envUpdate).length > 0 ? envUpdate : undefined,
      };
    },
    priority: 30,
  },

  /**
   * Workspace initialization hook — generate team member subagent files
   * Only generates .md files for members that have inline systemPrompt.
   * Members without systemPrompt are expected to reuse agent files
   * already copied by acp-agents.js from the assistant's agents/ folder.
   */
  onWorkspaceInit: {
    handler: async (context) => {
      const { workspace, isTeam, teamMembers, utils } = context;

      if (!isTeam || !teamMembers || teamMembers.length === 0) return;

      // Only generate files for non-lead members with inline systemPrompt
      const membersToGenerate = teamMembers.filter((m) => m.role !== 'lead' && m.systemPrompt);

      if (membersToGenerate.length === 0) return;

      const agentsDir = path.join(workspace, '.claude', 'agents');
      await utils.ensureDir(agentsDir);

      for (const member of membersToGenerate) {
        const lines = ['---'];
        lines.push(`name: ${member.id}`);
        lines.push(`description: "${member.name}"`);
        if (member.model) lines.push(`model: ${member.model}`);
        if (member.skills && member.skills.length) lines.push(`skills: ${JSON.stringify(member.skills)}`);
        lines.push('---');
        lines.push('');
        lines.push(member.systemPrompt);

        const agentFilePath = path.join(agentsDir, `${member.id}.md`);
        try {
          await utils.writeFile(agentFilePath, lines.join('\n'));
        } catch (error) {
          console.error(`[acp-team] Failed to generate subagent file for ${member.id}:`, error.message);
        }
      }
      console.log(`[acp-team] Generated ${membersToGenerate.length} subagent files from team members`);
    },
    priority: 30, // After agents (20), so team can reuse/override agent files
  },
};
