/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ICreateConversationParams } from '@/common/ipcBridge';
import type { TChatConversation, TProviderWithModel } from '@/common/storage';
import type { IAgentTeamMemberDefinition } from '@/common/agentTeam';
import type { AgentType } from '@/assistant/hooks/AgentHooks';
import { uuid } from '@/common/utils';
import fs from 'fs/promises';
import path from 'path';
import { getSystemDir } from './initStorage';
import { runHooks } from '@/assistant/hooks';
import { runAgentHooks } from '@/assistant/hooks/AgentHooks';
import { ConfigStorage } from '@/common/storage';
import { getAssistantsDir } from './migrations/assistantMigration';
import { copyDirectoryRecursively } from './utils';

// Regex to match AionUI timestamp suffix pattern
const AIONUI_TIMESTAMP_REGEX = /^(.+?)_aionui_\d+(\.[^.]+)$/;

/**
 * Build workspace with hook-driven lifecycle:
 *
 *   Phase 1: Config resolution — load assistant config, resolve workspace path
 *   Phase 2: onSetup hook     — team detection, env setup (BEFORE file ops)
 *   Phase 3: onWorkspaceInit  — workspace file init (template copying, default files)
 *   Phase 4: onConversationInit — legacy backward compat
 *
 * This flow is shared by all agent types (ACP, Gemini, Codex, etc.)
 */
const buildWorkspaceWidthFiles = async (
  defaultWorkspaceName: string,
  workspace?: string,
  defaultFiles?: string[],
  providedCustomWorkspace?: boolean,
  presetAssistantId?: string,
  /** Extra options for hook context (e.g., backend, customEnv, agentType) */
  options?: { backend?: string; customEnv?: Record<string, string>; agentType?: AgentType }
) => {
  // 使用前端提供的customWorkspace标志，如果没有则根据workspace参数判断
  const customWorkspace = providedCustomWorkspace !== undefined ? providedCustomWorkspace : !!workspace;

  // ──────────────────────────────────────────────────────────────
  // Phase 1: Config resolution — load assistant config, paths
  // ──────────────────────────────────────────────────────────────

  let customAgents: any = null;
  let assistantPath: string | undefined;
  let defaultAgent: string | undefined;
  let teamMembers: IAgentTeamMemberDefinition[] | undefined;

  if (presetAssistantId) {
    try {
      // Reduced timeout (1 second) - this is non-critical, we can fallback
      const customAgentsPromise = ConfigStorage.get('acp.customAgents');
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('ConfigStorage.get timeout')), 1000));
      customAgents = await Promise.race([customAgentsPromise, timeoutPromise]).catch((error): null => {
        console.warn(`[AionUi] ConfigStorage.get failed or timed out (non-critical):`, error);
        return null;
      });
    } catch (error) {
      console.warn(`[AionUi] Failed to load custom agents:`, error);
    }

    assistantPath = path.join(getAssistantsDir(), presetAssistantId);
  }

  // Resolve workspace path from assistant config
  if (presetAssistantId && !workspace && customAgents && Array.isArray(customAgents)) {
    const assistant = customAgents.find((a: any) => a.id === presetAssistantId);
    if (assistant?.workspacePath) {
      console.log(`[AionUi] Using workspace from assistant ${presetAssistantId}: ${assistant.workspacePath}`);
      workspace = assistant.workspacePath;
    }
  }

  if (!workspace) {
    const tempPath = getSystemDir().workDir;
    workspace = path.join(tempPath, defaultWorkspaceName);
    await fs.mkdir(workspace, { recursive: true });
  } else {
    workspace = path.resolve(workspace);
  }

  // Read assistant.json for defaultAgent and teamMembers
  if (assistantPath) {
    const configPath = path.join(assistantPath, 'assistant.json');
    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      defaultAgent = config.defaultAgent;
      if (Array.isArray(config.teamMembers)) {
        teamMembers = config.teamMembers;
      }
    } catch (error) {
      console.warn(`[AionUi] Failed to read assistant.json:`, error);
    }
  }

  // Fallback: read teamMembers from customAgents ConfigStorage if not in assistant.json
  if (!teamMembers && presetAssistantId && customAgents && Array.isArray(customAgents)) {
    const assistant = customAgents.find((a: any) => a.id === presetAssistantId);
    if (Array.isArray(assistant?.teamMembers)) {
      teamMembers = assistant.teamMembers;
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Phase 2: onSetup hooks — team detection, env setup (BEFORE file ops)
  //   1. Assistant hooks (per-assistant customization)
  //   2. Agent hooks (agent-type logic, e.g. acp-agents.js team detection)
  // ──────────────────────────────────────────────────────────────

  let isTeam = false;
  let customEnv = options?.customEnv;

  const setupCtx = {
    workspace,
    backend: options?.backend,
    assistantPath,
    isTeam,
    customEnv,
    teamMembers,
  };

  // Run assistant-level onSetup hooks
  if (assistantPath) {
    try {
      const result = await runHooks('onSetup', setupCtx);
      if (result.isTeam !== undefined) isTeam = result.isTeam;
      if (result.customEnv) customEnv = { ...customEnv, ...result.customEnv };
      if (result.teamMembers) teamMembers = result.teamMembers;
    } catch (error) {
      console.warn('[AionUi] Assistant onSetup hook failed (non-critical):', error);
    }
  }

  // Run agent-type onSetup hooks (e.g. src/agent/acp/hooks/acp-agents.js)
  if (options?.agentType) {
    try {
      const result = await runAgentHooks('onSetup', {
        agentType: options.agentType,
        ...setupCtx,
        isTeam,
        customEnv,
        teamMembers,
      });
      if (result.isTeam !== undefined) isTeam = result.isTeam;
      if (result.customEnv) customEnv = { ...customEnv, ...result.customEnv };
      if (result.teamMembers) teamMembers = result.teamMembers;
    } catch (error) {
      console.warn('[AionUi] Agent onSetup hook failed (non-critical):', error);
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Phase 3: onWorkspaceInit — workspace file init (template, files)
  // ──────────────────────────────────────────────────────────────

  if (presetAssistantId && assistantPath) {
    try {
      const assistant = Array.isArray(customAgents) ? customAgents.find((a: any) => a.id === presetAssistantId) : null;
      const hasExistingWorkspace = assistant?.workspacePath;

      if (!hasExistingWorkspace) {
        console.log(`[AionUi] Initializing workspace for assistant: ${presetAssistantId}`);

        const workspaceTemplatePath = path.join(assistantPath, 'workspace');
        const hooksPath = path.join(assistantPath, 'hooks');
        const agentsPath = path.join(assistantPath, 'agents');

        const hasWorkspaceTemplate = await fs
          .access(workspaceTemplatePath)
          .then(() => true)
          .catch(() => false);
        const hasHooks = await fs
          .access(hooksPath)
          .then(() => true)
          .catch(() => false);
        const hasAgents = await fs
          .access(agentsPath)
          .then(() => true)
          .catch(() => false);

        if (hasWorkspaceTemplate || hasHooks || hasAgents || isTeam) {
          console.log(`[AionUi] Detected workspace features for ${presetAssistantId}: workspace=${hasWorkspaceTemplate}, hooks=${hasHooks}`);

          // Copy workspace template
          if (hasWorkspaceTemplate) {
            try {
              await copyDirectoryRecursively(workspaceTemplatePath, workspace, { overwrite: false });
              console.log(`[AionUi] Copied workspace template from ${workspaceTemplatePath} to ${workspace}`);
            } catch (error) {
              console.error(`[AionUi] Failed to copy workspace template:`, error);
            }
          }

          const initCtx = {
            workspace,
            backend: options?.backend,
            assistantPath,
            isTeam,
            customEnv,
            teamMembers,
          };

          // Run assistant-level onWorkspaceInit hooks
          await runHooks('onWorkspaceInit', initCtx);

          // Run agent-type onWorkspaceInit hooks (e.g. acp-agents.js: copy agents, generate subagent files)
          if (options?.agentType) {
            await runAgentHooks('onWorkspaceInit', { agentType: options.agentType, ...initCtx });
          }

          console.log(`[AionUi] Workspace initialized via hook: ${workspace}`);
        }
      } else {
        console.log(`[AionUi] Using existing workspace, skipping initialization`);
      }
    } catch (error) {
      console.warn(`[AionUi] Error initializing workspace:`, error);
    }
  }

  // Copy default files to workspace
  if (defaultFiles) {
    for (const file of defaultFiles) {
      const absoluteFilePath = path.isAbsolute(file) ? file : path.resolve(file);

      try {
        await fs.access(absoluteFilePath);
      } catch (error) {
        console.warn(`[AionUi] Source file does not exist, skipping: ${absoluteFilePath}`);
        console.warn(`[AionUi] Original path: ${file}`);
        continue;
      }

      let fileName = path.basename(absoluteFilePath);

      const { cacheDir } = getSystemDir();
      const tempDir = path.join(cacheDir, 'temp');
      if (absoluteFilePath.startsWith(tempDir)) {
        fileName = fileName.replace(AIONUI_TIMESTAMP_REGEX, '$1');
      }

      const destPath = path.join(workspace, fileName);

      try {
        await fs.copyFile(absoluteFilePath, destPath);
      } catch (error) {
        console.error(`[AionUi] Failed to copy file from ${absoluteFilePath} to ${destPath}:`, error);
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Phase 4: onConversationInit — legacy backward compat
  // ──────────────────────────────────────────────────────────────

  await runHooks('onConversationInit', { workspace });

  return { workspace, customWorkspace, defaultAgent, isTeam, customEnv };
};

export const createGeminiAgent = async (model: TProviderWithModel, workspace?: string, defaultFiles?: string[], webSearchEngine?: 'google' | 'default', customWorkspace?: boolean, contextFileName?: string, presetRules?: string, enabledSkills?: string[], presetAssistantId?: string): Promise<TChatConversation> => {
  // Use presetAssistantId as workspace template source (resolves automatically)
  const { workspace: newWorkspace, customWorkspace: finalCustomWorkspace } = await buildWorkspaceWidthFiles(`gemini-temp-${Date.now()}`, workspace, defaultFiles, customWorkspace, presetAssistantId);

  return {
    type: 'gemini',
    model,
    extra: {
      workspace: newWorkspace,
      customWorkspace: finalCustomWorkspace,
      webSearchEngine,
      contextFileName,
      // 系统规则 / System rules
      presetRules,
      // 向后兼容：contextContent 保存 rules / Backward compatible: contextContent stores rules
      contextContent: presetRules,
      // 启用的 skills 列表（通过 SkillManager 加载）/ Enabled skills list (loaded via SkillManager)
      enabledSkills,
      // 预设助手 ID，用于在会话面板显示助手名称和头像，同时用于复制工作空间模板
      // Preset assistant ID for displaying name and avatar in conversation panel, also used for workspace template
      presetAssistantId,
    },
    desc: finalCustomWorkspace ? newWorkspace : '',
    createTime: Date.now(),
    modifyTime: Date.now(),
    name: newWorkspace,
    id: uuid(),
  };
};

export const createAcpAgent = async (options: ICreateConversationParams): Promise<TChatConversation> => {
  const { extra } = options;
  // Hook-driven workspace init: onSetup (team detect) → onWorkspaceInit (files) → onConversationInit (legacy)
  const { workspace, customWorkspace, defaultAgent, isTeam, customEnv } = await buildWorkspaceWidthFiles(`${extra.backend}-temp-${Date.now()}`, extra.workspace, extra.defaultFiles, extra.customWorkspace, extra.presetAssistantId, { backend: extra.backend, customEnv: extra.customEnv, agentType: 'acp' });

  // Build extra object, only including defined fields to prevent undefined values from being JSON.stringify'd
  const conversationExtra: any = {
    workspace: workspace,
    customWorkspace,
    backend: extra.backend,
    cliPath: extra.cliPath,
    agentName: extra.agentName,
  };

  // Only add optional fields if they have values (undefined values get stripped during JSON serialization)
  if (extra.customAgentId !== undefined) conversationExtra.customAgentId = extra.customAgentId;
  if (extra.presetContext !== undefined) conversationExtra.presetContext = extra.presetContext;
  if (extra.enabledSkills !== undefined) conversationExtra.enabledSkills = extra.enabledSkills;
  if (extra.presetAssistantId !== undefined) conversationExtra.presetAssistantId = extra.presetAssistantId;
  if (extra.botId !== undefined) conversationExtra.botId = extra.botId;
  if (extra.externalChannelId !== undefined) conversationExtra.externalChannelId = extra.externalChannelId;
  if (defaultAgent !== undefined) conversationExtra.defaultAgent = defaultAgent;
  if (customEnv !== undefined) conversationExtra.customEnv = customEnv;
  if (isTeam) conversationExtra.isTeam = true;

  return {
    type: 'acp' as const,
    extra: conversationExtra,
    createTime: Date.now(),
    modifyTime: Date.now(),
    name: workspace,
    id: uuid(),
  };
};

export const createCodexAgent = async (options: ICreateConversationParams): Promise<TChatConversation> => {
  const { extra } = options;
  // Use presetAssistantId as workspace template source (resolves automatically)
  const { workspace, customWorkspace } = await buildWorkspaceWidthFiles(`codex-temp-${Date.now()}`, extra.workspace, extra.defaultFiles, extra.customWorkspace, extra.presetAssistantId);
  return {
    type: 'codex',
    extra: {
      workspace: workspace,
      customWorkspace,
      cliPath: extra.cliPath,
      sandboxMode: 'workspace-write', // 默认为读写权限 / Default to read-write permission
      presetContext: extra.presetContext, // 智能助手的预设规则/提示词
      // 启用的 skills 列表（通过 SkillManager 加载）/ Enabled skills list (loaded via SkillManager)
      enabledSkills: extra.enabledSkills,
      // 预设助手 ID，用于在会话面板显示助手名称和头像
      // Preset assistant ID for displaying name and avatar in conversation panel
      presetAssistantId: extra.presetAssistantId,
    },
    createTime: Date.now(),
    modifyTime: Date.now(),
    name: workspace,
    id: uuid(),
  };
};

export const createNanobotAgent = async (options: ICreateConversationParams): Promise<TChatConversation> => {
  const { extra } = options;
  const { workspace, customWorkspace } = await buildWorkspaceWidthFiles(`nanobot-temp-${Date.now()}`, extra.workspace, extra.defaultFiles, extra.customWorkspace);
  return {
    type: 'nanobot',
    extra: {
      workspace: workspace,
      customWorkspace,
      enabledSkills: extra.enabledSkills,
      presetAssistantId: extra.presetAssistantId,
    },
    createTime: Date.now(),
    modifyTime: Date.now(),
    name: workspace,
    id: uuid(),
  };
};

export const createOpenClawAgent = async (options: ICreateConversationParams): Promise<TChatConversation> => {
  const { extra } = options;
  const { workspace, customWorkspace } = await buildWorkspaceWidthFiles(`openclaw-temp-${Date.now()}`, extra.workspace, extra.defaultFiles, extra.customWorkspace);
  return {
    type: 'openclaw-gateway',
    extra: {
      workspace: workspace,
      customWorkspace,
      gateway: {
        cliPath: extra.cliPath,
      },
      // Enabled skills list (loaded via SkillManager)
      enabledSkills: extra.enabledSkills,
      // Preset assistant ID for displaying name and avatar in conversation panel
      presetAssistantId: extra.presetAssistantId,
    },
    createTime: Date.now(),
    modifyTime: Date.now(),
    name: workspace,
    id: uuid(),
  };
};
