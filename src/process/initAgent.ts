/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ICreateConversationParams } from '@/common/ipcBridge';
import type { TChatConversation, TProviderWithModel } from '@/common/storage';
import { uuid } from '@/common/utils';
import fs from 'fs/promises';
import path from 'path';
import { getSystemDir } from './initStorage';
import { copyWorkspaceTemplate } from '@/assistant/WorkspaceTemplateCopy';
import { runHooks } from '@/assistant/hooks';
import { ConfigStorage } from '@/common/storage';

// Regex to match AionUI timestamp suffix pattern
const AIONUI_TIMESTAMP_REGEX = /^(.+?)_aionui_\d+(\.[^.]+)$/;

/**
 * 创建工作空间目录（不复制文件）
 * Create workspace directory (without copying files)
 *
 * 注意：文件复制统一由 sendMessage 时的 copyFilesToDirectory 处理
 * 避免文件被复制两次（一次在创建会话时，一次在发送消息时）
 * Note: File copying is handled by copyFilesToDirectory in sendMessage
 * This avoids files being copied twice
 */
const buildWorkspaceWidthFiles = async (defaultWorkspaceName: string, workspace?: string, defaultFiles?: string[], providedCustomWorkspace?: boolean, presetAssistantId?: string) => {
  // 使用前端提供的customWorkspace标志，如果没有则根据workspace参数判断
  const customWorkspace = providedCustomWorkspace !== undefined ? providedCustomWorkspace : !!workspace;

  // If presetAssistantId is provided, check if it has a workspacePath
  if (presetAssistantId && !workspace) {
    try {
      // Add timeout to prevent hanging (5 seconds)
      const customAgentsPromise = ConfigStorage.get('acp.customAgents');
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('ConfigStorage.get timeout')), 5000));
      const customAgents = await Promise.race([customAgentsPromise, timeoutPromise]).catch((error) => {
        console.warn(`[AionUi] ConfigStorage.get failed or timed out:`, error);
        return null;
      });

      if (customAgents && Array.isArray(customAgents)) {
        const assistant = customAgents.find((a) => a.id === presetAssistantId);
        if (assistant?.workspacePath) {
          console.log(`[AionUi] Using workspace from assistant ${presetAssistantId}: ${assistant.workspacePath}`);
          workspace = assistant.workspacePath;
        }
      }
    } catch (error) {
      console.warn(`[AionUi] Failed to load workspace path for assistant ${presetAssistantId}:`, error);
    }
  }

  if (!workspace) {
    const tempPath = getSystemDir().workDir;
    workspace = path.join(tempPath, defaultWorkspaceName);
    await fs.mkdir(workspace, { recursive: true });
  } else {
    // 规范化路径：去除末尾斜杠，解析为绝对路径
    workspace = path.resolve(workspace);
  }

  // Copy workspace template if presetAssistantId is provided (auto-resolve from assistant config)
  // Skip copying if workspace was loaded from assistant (already has the template)
  let defaultAgent: string | undefined;
  if (presetAssistantId) {
    try {
      // Add timeout to prevent hanging (5 seconds)
      const customAgentsPromise = ConfigStorage.get('acp.customAgents');
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('ConfigStorage.get timeout')), 5000));
      const customAgents = await Promise.race([customAgentsPromise, timeoutPromise]).catch((error) => {
        console.warn(`[AionUi] ConfigStorage.get failed or timed out:`, error);
        return null;
      });

      const assistant = customAgents?.find((a: any) => a.id === presetAssistantId);
      const hasExistingWorkspace = assistant?.workspacePath;

      if (!hasExistingWorkspace) {
        console.log(`[AionUi] Copying workspace template from assistant: ${presetAssistantId}`);
        // Add timeout for copyWorkspaceTemplate (10 seconds)
        const copyPromise = copyWorkspaceTemplate(presetAssistantId, workspace);
        const copyTimeoutPromise = new Promise<{ success: false }>((resolve) => setTimeout(() => resolve({ success: false }), 10000));
        const copyResult = await Promise.race([copyPromise, copyTimeoutPromise]);
        if (!copyResult.success) {
          console.warn(`[AionUi] Failed to copy workspace template for assistant: ${presetAssistantId}`);
        } else {
          console.log(`[AionUi] Successfully copied workspace template to: ${workspace}`);
          defaultAgent = copyResult.defaultAgent;
        }
      } else {
        console.log(`[AionUi] Using existing workspace, skipping template copy`);
      }
    } catch (error) {
      console.warn(`[AionUi] Error checking workspace template:`, error);
    }
  }

  if (defaultFiles) {
    for (const file of defaultFiles) {
      // 确保文件路径是绝对路径
      const absoluteFilePath = path.isAbsolute(file) ? file : path.resolve(file);

      // 检查源文件是否存在
      try {
        await fs.access(absoluteFilePath);
      } catch (error) {
        console.warn(`[AionUi] Source file does not exist, skipping: ${absoluteFilePath}`);
        console.warn(`[AionUi] Original path: ${file}`);
        // 跳过不存在的文件，而不是抛出错误
        continue;
      }

      let fileName = path.basename(absoluteFilePath);

      // 如果是临时文件，去掉 AionUI 时间戳后缀
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
        // 继续处理其他文件，而不是完全失败
      }
    }
  }

  // Run on-conversation-init hooks from workspace .aionui/hooks/ folder
  await runHooks('on-conversation-init', '', workspace);

  return { workspace, customWorkspace, defaultAgent };
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
  // Use presetAssistantId as workspace template source (resolves automatically)
  const { workspace, customWorkspace, defaultAgent } = await buildWorkspaceWidthFiles(`${extra.backend}-temp-${Date.now()}`, extra.workspace, extra.defaultFiles, extra.customWorkspace, extra.presetAssistantId);

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
