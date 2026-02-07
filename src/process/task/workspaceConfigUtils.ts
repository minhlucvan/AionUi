/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Workspace .claude/config.json structure (partial)
 * 工作区 .claude/config.json 结构（部分）
 */
interface WorkspaceConfig {
  /** Default agent to auto-invoke for every message / 每条消息自动调用的默认 agent */
  defaultAgent?: string;
  /** Available agents in this workspace / 此工作区可用的 agents */
  agents?: string[];
}

/**
 * Read the defaultAgent setting from workspace .claude/config.json
 * 从工作区 .claude/config.json 读取 defaultAgent 设置
 *
 * @param workspacePath - Path to the workspace directory
 * @returns The default agent name or undefined if not configured
 */
export function resolveWorkspaceDefaultAgent(workspacePath: string): string | undefined {
  try {
    const configPath = path.join(workspacePath, '.claude', 'config.json');
    if (!fs.existsSync(configPath)) {
      return undefined;
    }

    const content = fs.readFileSync(configPath, 'utf-8');
    const config: WorkspaceConfig = JSON.parse(content);

    if (!config.defaultAgent || typeof config.defaultAgent !== 'string') {
      return undefined;
    }

    // Validate that the defaultAgent is listed in the agents array (if agents array exists)
    if (config.agents && config.agents.length > 0 && config.agents.indexOf(config.defaultAgent) === -1) {
      console.warn(`[workspaceConfigUtils] defaultAgent "${config.defaultAgent}" is not listed in agents array, ignoring`);
      return undefined;
    }

    return config.defaultAgent;
  } catch (error) {
    console.warn('[workspaceConfigUtils] Failed to read workspace config:', error);
    return undefined;
  }
}
