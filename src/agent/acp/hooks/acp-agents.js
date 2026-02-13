/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ACP Agent Team Initialization - Module-Based Hooks
 *
 * This module handles agent team setup for ACP backends:
 * 1. onSetup: Detect team mode from teamMembers, set env vars
 * 2. onWorkspaceInit: Copy agent files from assistant agents/ folder,
 *    generate subagent .md files from teamMembers with inline systemPrompt
 */

const fs = require('fs');
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
    priority: 10,
  },

  /**
   * Workspace initialization hook — agent file setup
   * Copies agent .md files from {assistantPath}/agents/ and generates
   * subagent files from teamMembers with inline systemPrompt.
   */
  onWorkspaceInit: {
    handler: async (context) => {
      const { workspace, assistantPath, isTeam, teamMembers, utils } = context;

      // Copy agent files from {assistantPath}/agents/ to {workspace}/.claude/agents/
      if (assistantPath) {
        const assistantAgentsDir = path.join(assistantPath, 'agents');
        const hasAgentsDir = await utils.exists(assistantAgentsDir);

        if (hasAgentsDir) {
          const workspaceAgentsDir = path.join(workspace, '.claude', 'agents');
          await utils.ensureDir(workspaceAgentsDir);

          try {
            const agentFiles = fs.readdirSync(assistantAgentsDir);
            const mdFiles = agentFiles.filter((f) => f.endsWith('.md'));
            for (const file of mdFiles) {
              await fs.promises.copyFile(path.join(assistantAgentsDir, file), path.join(workspaceAgentsDir, file));
            }
            if (mdFiles.length > 0) {
              console.log(`[acp-agents] Copied ${mdFiles.length} agent files from ${assistantAgentsDir}`);
            }
          } catch (error) {
            console.warn(`[acp-agents] Failed to copy agent files:`, error.message);
          }
        }
      }

      // Generate .claude/agents/*.md from teamMembers with inline systemPrompt
      // Only for members that have systemPrompt — others use agents/ folder files
      if (isTeam && teamMembers && teamMembers.length > 0) {
        const membersToGenerate = teamMembers.filter((m) => m.role !== 'lead' && m.systemPrompt);

        if (membersToGenerate.length > 0) {
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
              console.error(`[acp-agents] Failed to generate subagent file for ${member.id}:`, error.message);
            }
          }
          console.log(`[acp-agents] Generated ${membersToGenerate.length} subagent files`);
        }
      }
    },
    priority: 20, // After skills (10), before default
  },
};
