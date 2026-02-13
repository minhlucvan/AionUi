/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ACP Agent File Operations - Module-Based Hooks
 *
 * This module handles agent file setup for ACP backends:
 * - onWorkspaceInit: Copy agent .md files from {assistantPath}/agents/
 *   to {workspace}/.claude/agents/ so they are available as subagents.
 *
 * Agents copied here can be used standalone (as subagents) or reused
 * by team members defined in acp-team.js.
 */

const fs = require('fs');
const path = require('path');

module.exports = {
  /**
   * Workspace initialization hook — copy agent files
   * Copies agent .md files from {assistantPath}/agents/ to {workspace}/.claude/agents/
   */
  onWorkspaceInit: {
    handler: async (context) => {
      const { workspace, assistantPath, utils } = context;

      if (!assistantPath) return;

      const assistantAgentsDir = path.join(assistantPath, 'agents');
      const hasAgentsDir = await utils.exists(assistantAgentsDir);

      if (!hasAgentsDir) return;

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
    },
    priority: 20, // After skills (10), before team (30)
  },
};
