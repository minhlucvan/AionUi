/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { ASSISTANT_PRESETS } from '@/common/presets/assistantPresets';
import type { IProvider, TProviderWithModel } from '@/common/storage';
import { ConfigStorage } from '@/common/storage';
import { resolveLocaleKey, uuid } from '@/common/utils';
import coworkSvg from '@/renderer/assets/cowork.svg';
import FilePreview from '@/renderer/components/FilePreview';
import SkillsWidget from '@/renderer/components/SkillsWidget';
import { useBotContext } from '@/renderer/context/BotContext';
import { useLayoutContext } from '@/renderer/context/LayoutContext';
import { useCompositionInput } from '@/renderer/hooks/useCompositionInput';
import { useDragUpload } from '@/renderer/hooks/useDragUpload';
import { useGeminiGoogleAuthModels } from '@/renderer/hooks/useGeminiGoogleAuthModels';
import { useInputFocusRing } from '@/renderer/hooks/useInputFocusRing';
import { usePasteService } from '@/renderer/hooks/usePasteService';
import { useConversationTabs } from '@/renderer/pages/conversation/context/ConversationTabsContext';
import { allSupportedExts, type FileMetadata, getCleanFileNames } from '@/renderer/services/FileService';
import { iconColors } from '@/renderer/theme/colors';
import { emitter } from '@/renderer/utils/emitter';
import { buildDisplayMessage } from '@/renderer/utils/messageFiles';
import { hasSpecificModelCapability } from '@/renderer/utils/modelCapabilities';
import { updateWorkspaceTime } from '@/renderer/utils/workspaceHistory';
import { isAcpRoutedPresetType, type AcpBackend, type AcpBackendConfig, type PresetAgentType } from '@/types/acpTypes';
import { Button, ConfigProvider, Dropdown, Input, Menu, Tooltip } from '@arco-design/web-react';
import { IconClose } from '@arco-design/web-react/icon';
import { ArrowUp, FolderOpen, Plus, UploadOne } from '@icon-park/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import useSWR, { mutate } from 'swr';
import styles from '../guid/index.module.css';

/**
 * 缓存Provider的可用模型列表，避免重复计算
 */
const availableModelsCache = new Map<string, string[]>();

/**
 * 获取提供商下所有可用的主力模型（带缓存）
 * @param provider - 提供商配置
 * @returns 可用的主力模型名称数组
 */
const getAvailableModels = (provider: IProvider): string[] => {
  // 生成缓存键，包含模型列表以检测变化
  const cacheKey = `${provider.id}-${(provider.model || []).join(',')}`;

  // 检查缓存
  if (availableModelsCache.has(cacheKey)) {
    return availableModelsCache.get(cacheKey)!;
  }

  // 计算可用模型
  const result: string[] = [];
  for (const modelName of provider.model || []) {
    const functionCalling = hasSpecificModelCapability(provider, modelName, 'function_calling');
    const excluded = hasSpecificModelCapability(provider, modelName, 'excludeFromPrimary');

    if ((functionCalling === true || functionCalling === undefined) && excluded !== true) {
      result.push(modelName);
    }
  }

  // 缓存结果
  availableModelsCache.set(cacheKey, result);
  return result;
};

/**
 * 检查提供商是否有可用的主力对话模型（高效版本）
 * @param provider - 提供商配置
 * @returns true 表示提供商有可用模型，false 表示无可用模型
 */
const hasAvailableModels = (provider: IProvider): boolean => {
  // 直接使用缓存的结果，避免重复计算
  const availableModels = getAvailableModels(provider);
  return availableModels.length > 0;
};

/**
 * 测量 textarea 中指定位置的垂直坐标
 * @param textarea - 目标 textarea 元素
 * @param position - 文本位置
 * @returns 该位置的垂直像素坐标
 */
const measureCaretTop = (textarea: HTMLTextAreaElement, position: number): number => {
  const textBefore = textarea.value.slice(0, position);
  const measure = document.createElement('div');
  const style = getComputedStyle(textarea);
  measure.style.cssText = `
    position: absolute;
    visibility: hidden;
    white-space: pre-wrap;
    word-wrap: break-word;
    width: ${textarea.clientWidth}px;
    font: ${style.font};
    line-height: ${style.lineHeight};
    padding: ${style.padding};
    border: ${style.border};
    box-sizing: ${style.boxSizing};
  `;
  measure.textContent = textBefore;
  document.body.appendChild(measure);
  const caretTop = measure.scrollHeight;
  document.body.removeChild(measure);
  return caretTop;
};

/**
 * 滚动 textarea 使光标位于视口最后一行
 * @param textarea - 目标 textarea 元素
 * @param caretTop - 光标的垂直坐标
 */
const scrollCaretToLastLine = (textarea: HTMLTextAreaElement, caretTop: number): void => {
  const style = getComputedStyle(textarea);
  const lineHeight = parseInt(style.lineHeight, 10) || 20;
  // 滚动使光标位于视口最后一行
  textarea.scrollTop = Math.max(0, caretTop - textarea.clientHeight + lineHeight);
};

const useModelList = () => {
  const { geminiModeOptions, isGoogleAuth } = useGeminiGoogleAuthModels();
  const { data: modelConfig } = useSWR('model.config.welcome', () => {
    return ipcBridge.mode.getModelConfig.invoke().then((data) => {
      return (data || []).filter((platform) => !!platform.model.length);
    });
  });

  const geminiModelValues = useMemo(() => geminiModeOptions.map((option) => option.value), [geminiModeOptions]);

  const modelList = useMemo(() => {
    let allProviders: IProvider[] = [];

    if (isGoogleAuth) {
      const geminiProvider: IProvider = {
        id: uuid(),
        name: 'Gemini Google Auth',
        platform: 'gemini-with-google-auth',
        baseUrl: '',
        apiKey: '',
        model: geminiModelValues,
        capabilities: [{ type: 'text' }, { type: 'vision' }, { type: 'function_calling' }],
      };
      allProviders = [geminiProvider, ...(modelConfig || [])];
    } else {
      allProviders = modelConfig || [];
    }

    // 过滤出有可用主力模型的提供商
    return allProviders.filter(hasAvailableModels);
  }, [geminiModelValues, isGoogleAuth, modelConfig]);

  return { modelList, isGoogleAuth, geminiModeOptions };
};

const CUSTOM_AVATAR_IMAGE_MAP: Record<string, string> = {
  'cowork.svg': coworkSvg,
  '🛠️': coworkSvg,
};

const BotGuidPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const guidContainerRef = useRef<HTMLDivElement>(null);
  const { closeAllTabs, openTab } = useConversationTabs();
  const { activeBorderColor, inactiveBorderColor, activeShadow } = useInputFocusRing();
  const localeKey = resolveLocaleKey(i18n.language);
  const botContext = useBotContext();

  const location = useLocation();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [dir, setDir] = useState<string>('');
  const [currentModel, _setCurrentModel] = useState<TProviderWithModel>();
  const [isInputFocused, setIsInputFocused] = useState(false);
  const isInputActive = isInputFocused;

  // 从 location.state 中读取 workspace（从 tabs 的添加按钮传递）
  useEffect(() => {
    const state = location.state as { workspace?: string } | null;
    if (state?.workspace) {
      setDir(state.workspace);
    }
  }, [location.state]);
  const { modelList, isGoogleAuth, geminiModeOptions } = useModelList();
  const geminiModeLookup = useMemo(() => {
    const lookup = new Map<string, (typeof geminiModeOptions)[number]>();
    geminiModeOptions.forEach((option) => lookup.set(option.value, option));
    return lookup;
  }, [geminiModeOptions]);
  const formatGeminiModelLabel = useCallback(
    (provider: { platform?: string } | undefined, modelName?: string) => {
      if (!modelName) return '';
      const isGoogleProvider = provider?.platform?.toLowerCase().includes('gemini-with-google-auth');
      if (isGoogleProvider) {
        return geminiModeLookup.get(modelName)?.label || modelName;
      }
      return modelName;
    },
    [geminiModeLookup]
  );
  // 记录当前选中的 provider+model，方便列表刷新时判断是否仍可用
  const selectedModelKeyRef = useRef<string | null>(null);
  // 对于自定义代理，使用 "custom:uuid" 格式来区分多个自定义代理
  // For custom agents, we store "custom:uuid" format to distinguish between multiple custom agents
  const [selectedAgentKey, _setSelectedAgentKey] = useState<string>('gemini');

  const [availableAgents, setAvailableAgents] = useState<
    Array<{
      backend: AcpBackend;
      name: string;
      cliPath?: string;
      customAgentId?: string;
      isPreset?: boolean;
      context?: string;
      avatar?: string;
      presetAgentType?: PresetAgentType;
    }>
  >();
  const [customAgents, setCustomAgents] = useState<AcpBackendConfig[]>([]);

  /**
   * 通过选择键查找代理
   * 支持 "custom:uuid" 格式和普通 backend 类型
   * Helper to find agent by key
   * Supports both "custom:uuid" format and plain backend type
   */
  const findAgentByKey = (key: string) => {
    if (key.startsWith('custom:')) {
      const customAgentId = key.slice(7);
      // First check availableAgents
      const foundInAvailable = availableAgents?.find((a) => a.backend === 'custom' && a.customAgentId === customAgentId);
      if (foundInAvailable) return foundInAvailable;

      // Then check customAgents for presets
      const assistant = customAgents.find((a) => a.id === customAgentId);
      if (assistant) {
        return {
          backend: 'custom' as AcpBackend,
          name: assistant.name,
          customAgentId: assistant.id,
          isPreset: true,
          context: '', // Context loaded via other means
          avatar: assistant.avatar,
        };
      }
    }
    return availableAgents?.find((a) => a.backend === key);
  };

  // 获取选中的后端类型（向后兼容）/ Get the selected backend type (for backward compatibility)
  const selectedAgent = selectedAgentKey.startsWith('custom:') ? 'custom' : (selectedAgentKey as AcpBackend);
  const selectedAgentInfo = useMemo(() => findAgentByKey(selectedAgentKey), [selectedAgentKey, availableAgents, customAgents]);
  const isPresetAgent = Boolean(selectedAgentInfo?.isPreset);
  const [isPlusDropdownOpen, setIsPlusDropdownOpen] = useState(false);
  const [userSelectedSkills, setUserSelectedSkills] = useState<string[]>([]);
  const [typewriterPlaceholder, setTypewriterPlaceholder] = useState('');
  const [_isTyping, setIsTyping] = useState(true);

  /**
   * 生成唯一模型 key（providerId:model）
   * Build a unique key for provider/model pair
   */
  const buildModelKey = (providerId?: string, modelName?: string) => {
    if (!providerId || !modelName) return null;
    return `${providerId}:${modelName}`;
  };

  /**
   * 检查当前 key 是否仍存在于新模型列表中
   * Check if selected model key still exists in the new provider list
   */
  const isModelKeyAvailable = (key: string | null, providers?: IProvider[]) => {
    if (!key || !providers || providers.length === 0) return false;
    return providers.some((provider) => {
      if (!provider.id || !provider.model?.length) return false;
      return provider.model.some((modelName) => buildModelKey(provider.id, modelName) === key);
    });
  };

  const setCurrentModel = async (modelInfo: TProviderWithModel) => {
    // 记录最新的选中 key，避免列表刷新后被错误重置
    selectedModelKeyRef.current = buildModelKey(modelInfo.id, modelInfo.useModel);
    await ConfigStorage.set('gemini.defaultModel', { id: modelInfo.id, useModel: modelInfo.useModel }).catch((error) => {
      console.error('Failed to save default model:', error);
    });
    _setCurrentModel(modelInfo);
  };
  const navigate = useNavigate();
  const _layout = useLayoutContext();

  // 处理粘贴的文件（替换模式，避免累积旧文件路径）
  // Handle pasted files (replace mode to avoid accumulating old file paths)
  const handleFilesPasted = useCallback((pastedFiles: FileMetadata[]) => {
    const filePaths = pastedFiles.map((file) => file.path);
    // 粘贴操作替换现有文件，而不是追加
    // Paste operation replaces existing files instead of appending
    setFiles(filePaths);
    setDir('');
  }, []);

  // 处理通过对话框上传的文件（追加模式）
  // Handle files uploaded via dialog (append mode)
  const handleFilesUploaded = useCallback((uploadedPaths: string[]) => {
    setFiles((prevFiles) => [...prevFiles, ...uploadedPaths]);
  }, []);

  const handleRemoveFile = useCallback((targetPath: string) => {
    // 删除初始化面板中的已选文件 / Remove files already selected on the welcome screen
    setFiles((prevFiles) => prevFiles.filter((file) => file !== targetPath));
  }, []);

  // 使用拖拽 hook（拖拽视为粘贴操作，替换现有文件）
  // Use drag upload hook (drag is treated like paste, replaces existing files)
  const { isFileDragging, dragHandlers } = useDragUpload({
    supportedExts: allSupportedExts,
    onFilesAdded: handleFilesPasted,
  });

  // 使用共享的PasteService集成（粘贴操作替换现有文件）
  // Use shared PasteService integration (paste replaces existing files)
  const { onPaste, onFocus } = usePasteService({
    supportedExts: allSupportedExts,
    onFilesAdded: handleFilesPasted,
    onTextPaste: (text: string) => {
      // 按光标位置插入文本，保持现有内容
      const textarea = document.activeElement as HTMLTextAreaElement | null;
      if (textarea && textarea.tagName === 'TEXTAREA') {
        const start = textarea.selectionStart ?? textarea.value.length;
        const end = textarea.selectionEnd ?? start;
        const currentValue = textarea.value;
        const newValue = currentValue.slice(0, start) + text + currentValue.slice(end);
        setInput(newValue);

        setTimeout(() => {
          const newPos = start + text.length;
          textarea.setSelectionRange(newPos, newPos);
          const caretTop = measureCaretTop(textarea, newPos);
          scrollCaretToLastLine(textarea, caretTop);
        }, 0);
      } else {
        setInput((prev) => prev + text);
      }
    },
  });
  const handleTextareaFocus = useCallback(() => {
    onFocus();
    setIsInputFocused(true);
  }, [onFocus]);
  const handleTextareaBlur = useCallback(() => {
    setIsInputFocused(false);
  }, []);

  const customAgentAvatarMap = useMemo(() => {
    return new Map(customAgents.map((agent) => [agent.id, agent.avatar]));
  }, [customAgents]);

  // 获取可用的 ACP agents - 基于全局标记位
  const { data: availableAgentsData } = useSWR('acp.agents.available', async () => {
    const result = await ipcBridge.acpConversation.getAvailableAgents.invoke();
    if (result.success) {
      // 过滤掉检测到的gemini命令，只保留内置Gemini
      return result.data.filter((agent) => !(agent.backend === 'gemini' && agent.cliPath));
    }
    return [];
  });

  // 更新本地状态
  useEffect(() => {
    if (availableAgentsData) {
      setAvailableAgents(availableAgentsData);
    }
  }, [availableAgentsData]);

  // When in bot mode, auto-select the bot's assistant
  useEffect(() => {
    if (!botContext?.assistantId) return;
    _setSelectedAgentKey(`custom:${botContext.assistantId}`);
  }, [botContext?.assistantId]);

  useEffect(() => {
    let isActive = true;
    ConfigStorage.get('acp.customAgents')
      .then((agents) => {
        if (!isActive) return;
        setCustomAgents(agents || []);
      })
      .catch((error) => {
        console.error('Failed to load custom agents:', error);
      });
    return () => {
      isActive = false;
    };
  }, [availableAgentsData]);

  const { compositionHandlers, isComposing } = useCompositionInput();

  /**
   * 解析预设助手的 rules 和 skills
   * Resolve preset assistant rules and skills
   *
   * - rules: 系统规则，在会话初始化时注入到 userMemory
   * - skills: 技能定义，在首次请求时注入到消息前缀
   */
  const resolvePresetRulesAndSkills = useCallback(
    async (agentInfo: { backend: AcpBackend; customAgentId?: string; context?: string } | undefined): Promise<{ rules?: string; skills?: string }> => {
      if (!agentInfo) return {};
      if (agentInfo.backend !== 'custom') {
        return { rules: agentInfo.context };
      }

      const customAgentId = agentInfo.customAgentId;
      if (!customAgentId) return { rules: agentInfo.context };

      let rules = '';
      let skills = '';

      // 1. 加载 rules / Load rules
      try {
        rules = await ipcBridge.fs.readAssistantRule.invoke({
          assistantId: customAgentId,
          locale: localeKey,
        });
      } catch (error) {
        console.warn(`Failed to load rules for ${customAgentId}:`, error);
      }

      // 2. 加载 skills / Load skills
      try {
        skills = await ipcBridge.fs.readAssistantSkill.invoke({
          assistantId: customAgentId,
          locale: localeKey,
        });
      } catch (error) {
        // skills 可能不存在，这是正常的 / skills may not exist, this is normal
      }

      // 3. Fallback: 如果是内置助手且文件为空，从内置资源加载
      // Fallback: If builtin assistant and files are empty, load from builtin resources
      if (customAgentId.startsWith('builtin-')) {
        const presetId = customAgentId.replace('builtin-', '');
        const preset = ASSISTANT_PRESETS.find((p) => p.id === presetId);
        if (preset) {
          // Fallback for rules
          if (!rules && preset.ruleFiles) {
            try {
              const ruleFile = preset.ruleFiles[localeKey] || preset.ruleFiles['en-US'];
              if (ruleFile) {
                rules = await ipcBridge.fs.readBuiltinRule.invoke({ fileName: ruleFile });
              }
            } catch (e) {
              console.warn(`Failed to load builtin rules for ${customAgentId}:`, e);
            }
          }
          // Fallback for skills
          if (!skills && preset.skillFiles) {
            try {
              const skillFile = preset.skillFiles[localeKey] || preset.skillFiles['en-US'];
              if (skillFile) {
                skills = await ipcBridge.fs.readBuiltinSkill.invoke({ fileName: skillFile });
              }
            } catch (e) {
              // skills fallback failure is ok
            }
          }
        }
      }

      return { rules: rules || agentInfo.context, skills };
    },
    [localeKey]
  );

  const resolvePresetAgentType = useCallback(
    (agentInfo: { backend: AcpBackend; customAgentId?: string } | undefined) => {
      if (!agentInfo) return 'gemini';
      if (agentInfo.backend !== 'custom') return 'gemini';
      const customAgent = customAgents.find((agent) => agent.id === agentInfo.customAgentId);
      return customAgent?.presetAgentType || 'gemini';
    },
    [customAgents]
  );

  // 解析助手启用的 skills 列表 / Resolve enabled skills for the assistant
  const resolveEnabledSkills = useCallback(
    (agentInfo: { backend: AcpBackend; customAgentId?: string } | undefined): string[] | undefined => {
      if (!agentInfo) return undefined;
      if (agentInfo.backend !== 'custom') return undefined;
      const customAgent = customAgents.find((agent) => agent.id === agentInfo.customAgentId);
      return customAgent?.enabledSkills;
    },
    [customAgents]
  );

  // Compute preset default skills from selected assistant
  const presetDefaultSkills = useMemo(() => {
    return resolveEnabledSkills(selectedAgentInfo) || [];
  }, [selectedAgentInfo, resolveEnabledSkills]);

  // Compute combined enabled skills (preset defaults + user selections)
  const combinedEnabledSkills = useMemo(() => {
    return [...new Set([...presetDefaultSkills, ...userSelectedSkills])];
  }, [presetDefaultSkills, userSelectedSkills]);

  // Reset user selected skills when agent changes
  useEffect(() => {
    setUserSelectedSkills([]);
  }, [selectedAgentKey]);

  const refreshCustomAgents = useCallback(async () => {
    try {
      await ipcBridge.acpConversation.refreshCustomAgents.invoke();
      await mutate('acp.agents.available');
    } catch (error) {
      console.error('Failed to refresh custom agents:', error);
    }
  }, []);

  useEffect(() => {
    void refreshCustomAgents();
  }, [refreshCustomAgents]);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
  }, []);

  const handleSend = async () => {
    // 用户明确选择的目录 -> customWorkspace = true, 使用用户选择的目录
    // 未选择时 -> customWorkspace = false, 传空让后端创建临时目录 (gemini-temp-xxx)
    const isCustomWorkspace = !!dir;
    const finalWorkspace = dir || ''; // 不指定时传空，让后端创建临时目录

    const agentInfo = selectedAgentInfo;
    const isPreset = isPresetAgent;
    const presetAgentType = resolvePresetAgentType(agentInfo);

    // 加载 rules（skills 已迁移到 SkillManager）/ Load rules (skills migrated to SkillManager)
    const { rules: presetRules } = await resolvePresetRulesAndSkills(agentInfo);
    // 使用组合的 skills 列表（预设 + 用户选择）/ Use combined skills (preset + user selections)
    const skillsToUse = combinedEnabledSkills.length > 0 ? combinedEnabledSkills : undefined;

    // 默认情况使用 Gemini，或 Preset 配置为 Gemini
    if (!selectedAgent || selectedAgent === 'gemini' || (isPreset && presetAgentType === 'gemini')) {
      if (!currentModel) return;
      try {
        const presetAssistantIdToPass = isPreset ? agentInfo?.customAgentId : undefined;

        const conversation = await ipcBridge.conversation.create.invoke({
          type: 'gemini',
          name: input,
          model: currentModel,
          extra: {
            defaultFiles: files,
            workspace: finalWorkspace,
            customWorkspace: isCustomWorkspace,
            webSearchEngine: isGoogleAuth ? 'google' : 'default',
            // 传递 rules（skills 通过 SkillManager 加载）
            // Pass rules (skills loaded via SkillManager)
            presetRules: isPreset ? presetRules : undefined,
            // 启用的 skills 列表（预设 + 用户选择）/ Enabled skills list (preset + user selections)
            enabledSkills: skillsToUse,
            // 预设助手 ID，用于在会话面板显示助手名称和头像
            // Preset assistant ID for displaying name and avatar in conversation panel
            presetAssistantId: presetAssistantIdToPass,
            // Bot ID for filtering conversations by bot
            botId: botContext?.botId,
          },
        });

        if (!conversation || !conversation.id) {
          throw new Error('Failed to create conversation - conversation object is null or missing id');
        }

        // 更新 workspace 时间戳，确保分组会话能正确排序（仅自定义工作空间）
        if (isCustomWorkspace) {
          closeAllTabs();
          updateWorkspaceTime(finalWorkspace);
          // 将新会话添加到 tabs
          openTab(conversation);
        }

        // 立即触发刷新，让左侧栏开始加载新会话（在导航前）
        emitter.emit('chat.history.refresh');

        // Store initial message to sessionStorage for GeminiSendBox to send after navigation
        // This enables instant page transition without waiting for API response
        const workspacePath = conversation.extra?.workspace || '';
        const displayMessage = buildDisplayMessage(input, files, workspacePath);
        const initialMessage = {
          input: displayMessage,
          files: files.length > 0 ? files : undefined,
        };
        sessionStorage.setItem(`gemini_initial_message_${conversation.id}`, JSON.stringify(initialMessage));

        // Navigate immediately for instant page transition
        // Navigate to bot conversation page to stay in bot context
        void navigate(`/bots/${botContext?.botId}/conversation/${conversation.id}`);
      } catch (error: unknown) {
        console.error('Failed to create or send Gemini message:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        alert(`Failed to create Gemini conversation: ${errorMessage}`);
        throw error; // Re-throw to prevent input clearing
      }
      return;
    } else if (selectedAgent === 'codex' || (isPreset && presetAgentType === 'codex')) {
      // Codex conversation type (including preset with codex agent type)
      const codexAgentInfo = agentInfo || findAgentByKey(selectedAgentKey);

      // 创建 Codex 会话并保存初始消息，由对话页负责发送
      try {
        const conversation = await ipcBridge.conversation.create.invoke({
          type: 'codex',
          name: input,
          model: currentModel!, // not used by codex, but required by type
          extra: {
            defaultFiles: files,
            workspace: finalWorkspace,
            customWorkspace: isCustomWorkspace,
            // Pass preset context (rules only)
            presetContext: isPreset ? presetRules : undefined,
            // 启用的 skills 列表（预设 + 用户选择）/ Enabled skills list (preset + user selections)
            enabledSkills: skillsToUse,
            // 预设助手 ID，用于在会话面板显示助手名称和头像
            // Preset assistant ID for displaying name and avatar in conversation panel
            presetAssistantId: isPreset ? codexAgentInfo?.customAgentId : undefined,
            // Bot ID for filtering conversations by bot
            botId: botContext?.botId,
          },
        });

        if (!conversation || !conversation.id) {
          alert('Failed to create Codex conversation. Please ensure the Codex CLI is installed and accessible in PATH.');
          return;
        }

        // 更新 workspace 时间戳，确保分组会话能正确排序（仅自定义工作空间）
        if (isCustomWorkspace) {
          closeAllTabs();
          updateWorkspaceTime(finalWorkspace);
          // 将新会话添加到 tabs
          openTab(conversation);
        }

        // 立即触发刷新，让左侧栏开始加载新会话（在导航前）
        emitter.emit('chat.history.refresh');

        // 交给对话页发送，避免事件丢失
        const initialMessage = {
          input,
          files: files.length > 0 ? files : undefined,
        };
        sessionStorage.setItem(`codex_initial_message_${conversation.id}`, JSON.stringify(initialMessage));

        // Navigate to bot conversation page to stay in bot context
        await navigate(`/bots/${botContext?.botId}/conversation/${conversation.id}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        alert(`Failed to create Codex conversation: ${errorMessage}`);
        throw error;
      }
      return;
    } else {
      // ACP conversation type (including preset with claude agent type)
      const acpAgentInfo = agentInfo || findAgentByKey(selectedAgentKey);

      // For preset with ACP-routed agent type (claude/opencode), use corresponding backend
      const acpBackend = isPreset && isAcpRoutedPresetType(presetAgentType) ? presetAgentType : selectedAgent;

      if (!acpAgentInfo && !isPreset) {
        alert(`${selectedAgent} CLI not found or not configured. Please ensure it's installed and accessible.`);
        return;
      }

      try {
        const conversation = await ipcBridge.conversation.create.invoke({
          type: 'acp',
          name: input,
          model: currentModel!, // ACP needs a model too
          extra: {
            defaultFiles: files,
            workspace: finalWorkspace,
            customWorkspace: isCustomWorkspace,
            backend: acpBackend,
            cliPath: acpAgentInfo?.cliPath,
            agentName: acpAgentInfo?.name, // 存储自定义代理的配置名称 / Store configured name for custom agents
            customAgentId: acpAgentInfo?.customAgentId, // 自定义代理的 UUID / UUID for custom agents
            // Pass preset context (rules only)
            presetContext: isPreset ? presetRules : undefined,
            // 启用的 skills 列表（预设 + 用户选择）/ Enabled skills list (preset + user selections)
            enabledSkills: skillsToUse,
            // 预设助手 ID，用于在会话面板显示助手名称和头像
            // Preset assistant ID for displaying name and avatar in conversation panel
            presetAssistantId: isPreset ? acpAgentInfo?.customAgentId : undefined,
            // Bot ID for filtering conversations by bot
            botId: botContext?.botId,
          },
        });

        if (!conversation || !conversation.id) {
          alert('Failed to create ACP conversation. Please check your ACP configuration and ensure the CLI is installed.');
          return;
        }

        // 更新 workspace 时间戳，确保分组会话能正确排序（仅自定义工作空间）
        if (isCustomWorkspace) {
          closeAllTabs();
          updateWorkspaceTime(finalWorkspace);
          // 将新会话添加到 tabs
          openTab(conversation);
        }

        // 立即触发刷新，让左侧栏开始加载新会话（在导航前）
        emitter.emit('chat.history.refresh');

        // For ACP, we need to wait for the connection to be ready before sending the message
        // Store the initial message and let the conversation page handle it when ready
        const initialMessage = {
          input,
          files: files.length > 0 ? files : undefined,
        };

        // Store initial message in sessionStorage to be picked up by the conversation page
        sessionStorage.setItem(`acp_initial_message_${conversation.id}`, JSON.stringify(initialMessage));

        // Navigate to bot conversation page to stay in bot context
        await navigate(`/bots/${botContext?.botId}/conversation/${conversation.id}`);
      } catch (error: unknown) {
        console.error('Failed to create ACP conversation:', error);

        // Check if it's an authentication error
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('[ACP-AUTH-')) {
          console.error(t('acp.auth.console_error'), errorMessage);
          const confirmed = window.confirm(t('acp.auth.failed_confirm', { backend: selectedAgent, error: errorMessage }));
          if (confirmed) {
            void navigate('/settings/model');
          }
        } else {
          alert(`Failed to create ${selectedAgent} ACP conversation. Please check your ACP configuration and ensure the CLI is installed.`);
        }
        throw error; // Re-throw to prevent input clearing
      }
    }
  };
  const sendMessageHandler = () => {
    setLoading(true);
    handleSend()
      .then(() => {
        // Clear all input states on successful send
        setInput('');
        setFiles([]);
        setDir('');
      })
      .catch((error) => {
        console.error('Failed to send message:', error);
        // Keep the input content when there's an error
      })
      .finally(() => {
        setLoading(false);
      });
  };
  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (isComposing.current) return;
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        if (!input.trim()) return;
        sendMessageHandler();
      }
    },
    [sendMessageHandler, input, isComposing]
  );
  const setDefaultModel = async () => {
    if (!modelList || modelList.length === 0) {
      return;
    }
    const currentKey = selectedModelKeyRef.current || buildModelKey(currentModel?.id, currentModel?.useModel);
    // 当前选择仍然可用则不重置 / Keep current selection when still available
    if (isModelKeyAvailable(currentKey, modelList)) {
      if (!selectedModelKeyRef.current && currentKey) {
        selectedModelKeyRef.current = currentKey;
      }
      return;
    }
    // 读取默认配置，或回落到新的第一个模型
    // Read default config, or fallback to first model
    const savedModel = await ConfigStorage.get('gemini.defaultModel');

    // Handle backward compatibility: old format is string, new format is { id, useModel }
    const isNewFormat = savedModel && typeof savedModel === 'object' && 'id' in savedModel;

    let defaultModel: IProvider | undefined;
    let resolvedUseModel: string;

    if (isNewFormat) {
      // New format: find by provider ID first, then verify model exists
      const { id, useModel } = savedModel;
      const exactMatch = modelList.find((m) => m.id === id);
      if (exactMatch && exactMatch.model.includes(useModel)) {
        defaultModel = exactMatch;
        resolvedUseModel = useModel;
      } else {
        // Provider deleted or model removed, fallback
        defaultModel = modelList[0];
        resolvedUseModel = defaultModel?.model[0] ?? '';
      }
    } else if (typeof savedModel === 'string') {
      // Old format: fallback to model name matching (backward compatibility)
      defaultModel = modelList.find((m) => m.model.includes(savedModel)) || modelList[0];
      resolvedUseModel = defaultModel?.model.includes(savedModel) ? savedModel : (defaultModel?.model[0] ?? '');
    } else {
      // No saved model, use first one
      defaultModel = modelList[0];
      resolvedUseModel = defaultModel?.model[0] ?? '';
    }

    if (!defaultModel || !resolvedUseModel) return;

    await setCurrentModel({
      ...defaultModel,
      useModel: resolvedUseModel,
    });
  };
  useEffect(() => {
    setDefaultModel().catch((error) => {
      console.error('Failed to set default model:', error);
    });
  }, [modelList]);

  // 打字机效果 / Typewriter effect
  useEffect(() => {
    const fullText = t('conversation.welcome.placeholder');
    let currentIndex = 0;
    const typingSpeed = 80; // 每个字符的打字速度（毫秒）/ Typing speed per character (ms)
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const typeNextChar = () => {
      if (currentIndex <= fullText.length) {
        // 在打字过程中添加光标 / Add cursor during typing
        setTypewriterPlaceholder(fullText.slice(0, currentIndex) + (currentIndex < fullText.length ? '|' : ''));
        currentIndex++;
      }
    };

    // 初始延迟，让用户看到页面加载完成 / Initial delay to let user see page loaded
    const initialDelay = setTimeout(() => {
      intervalId = setInterval(() => {
        typeNextChar();
        if (currentIndex > fullText.length) {
          if (intervalId) clearInterval(intervalId);
          setIsTyping(false); // 打字完成 / Typing complete
          setTypewriterPlaceholder(fullText); // 移除光标 / Remove cursor
        }
      }, typingSpeed);
    }, 300);

    // 清理函数：同时清理 timeout 和 interval / Cleanup: clear both timeout and interval
    return () => {
      clearTimeout(initialDelay);
      if (intervalId) clearInterval(intervalId);
    };
  }, [t]);
  return (
    <ConfigProvider getPopupContainer={() => guidContainerRef.current || document.body}>
      <div ref={guidContainerRef} className={styles.guidContainer}>
        <div className={styles.guidLayout}>
          {/* Bot name as title */}
          <p className={`text-2xl font-semibold mb-8 text-0 text-center`}>{t('bots.chatWith', { botName: botContext?.botName || 'Bot' })}</p>

          <div
            className={`${styles.guidInputCard} relative p-16px border-3 b bg-dialog-fill-0 b-solid rd-20px flex flex-col overflow-hidden transition-all duration-200 ${isFileDragging ? 'border-dashed' : ''}`}
            style={{
              zIndex: 1,
              transition: 'box-shadow 0.25s ease, border-color 0.25s ease, border-width 0.25s ease',
              ...(isFileDragging
                ? {
                    backgroundColor: 'var(--color-primary-light-1)',
                    borderColor: 'rgb(var(--primary-3))',
                    borderWidth: '1px',
                  }
                : {
                    borderWidth: '1px',
                    borderColor: isInputActive ? activeBorderColor : inactiveBorderColor,
                    boxShadow: isInputActive ? activeShadow : 'none',
                  }),
            }}
            {...dragHandlers}
          >
            <Input.TextArea autoSize={{ minRows: 3, maxRows: 20 }} placeholder={typewriterPlaceholder || t('conversation.welcome.placeholder')} className={`text-16px focus:b-none rounded-xl !bg-transparent !b-none !resize-none !p-0 ${styles.lightPlaceholder}`} value={input} onChange={handleInputChange} onPaste={onPaste} onFocus={handleTextareaFocus} onBlur={handleTextareaBlur} {...compositionHandlers} onKeyDown={handleInputKeyDown}></Input.TextArea>
            {files.length > 0 && (
              // 展示待发送的文件并允许取消 / Show pending files and allow cancellation
              <div className='flex flex-wrap items-center gap-8px mt-12px mb-12px'>
                {files.map((path) => (
                  <FilePreview key={path} path={path} onRemove={() => handleRemoveFile(path)} />
                ))}
              </div>
            )}
            <div className={styles.actionRow}>
              <div className={styles.actionTools}>
                <Dropdown
                  trigger='hover'
                  onVisibleChange={setIsPlusDropdownOpen}
                  droplist={
                    <Menu
                      className='min-w-200px'
                      onClickMenuItem={(key) => {
                        if (key === 'file') {
                          ipcBridge.dialog.showOpen
                            .invoke({ properties: ['openFile', 'multiSelections'] })
                            .then((uploadedFiles) => {
                              if (uploadedFiles && uploadedFiles.length > 0) {
                                // 通过对话框上传的文件使用追加模式
                                // Files uploaded via dialog use append mode
                                handleFilesUploaded(uploadedFiles);
                              }
                            })
                            .catch((error) => {
                              console.error('Failed to open file dialog:', error);
                            });
                        } else if (key === 'workspace') {
                          ipcBridge.dialog.showOpen
                            .invoke({ properties: ['openDirectory'] })
                            .then((files) => {
                              if (files && files[0]) {
                                setDir(files[0]);
                              }
                            })
                            .catch((error) => {
                              console.error('Failed to open directory dialog:', error);
                            });
                        }
                      }}
                    >
                      <Menu.Item key='file'>
                        <div className='flex items-center gap-8px'>
                          <UploadOne theme='outline' size='16' fill={iconColors.secondary} style={{ lineHeight: 0 }} />
                          <span>{t('conversation.welcome.uploadFile')}</span>
                        </div>
                      </Menu.Item>
                      <Menu.Item key='workspace'>
                        <div className='flex items-center gap-8px'>
                          <FolderOpen theme='outline' size='16' fill={iconColors.secondary} style={{ lineHeight: 0 }} />
                          <span>{t('conversation.welcome.specifyWorkspace')}</span>
                        </div>
                      </Menu.Item>
                    </Menu>
                  }
                >
                  <span className='flex items-center gap-4px cursor-pointer lh-[1]'>
                    <Button type='text' shape='circle' className={isPlusDropdownOpen ? styles.plusButtonRotate : ''} icon={<Plus theme='outline' size='14' strokeWidth={2} fill={iconColors.primary} />}></Button>
                    {files.length > 0 && (
                      <Tooltip className={'!max-w-max'} content={<span className='whitespace-break-spaces'>{getCleanFileNames(files).join('\n')}</span>}>
                        <span className='text-t-primary'>File({files.length})</span>
                      </Tooltip>
                    )}
                  </span>
                </Dropdown>

                <SkillsWidget
                  defaultSkills={presetDefaultSkills}
                  enabledSkills={combinedEnabledSkills}
                  onEnabledSkillsChange={(skills) => {
                    // Filter out preset defaults to get only user additions
                    const userSkills = skills.filter((s) => !presetDefaultSkills.includes(s));
                    setUserSelectedSkills(userSkills);
                  }}
                />

                {(selectedAgent === 'gemini' || (isPresetAgent && resolvePresetAgentType(selectedAgentInfo) === 'gemini')) && (
                  <Dropdown
                    trigger='hover'
                    droplist={
                      <Menu selectedKeys={currentModel ? [currentModel.id + currentModel.useModel] : []}>
                        {!modelList || modelList.length === 0
                          ? [
                              /* 暂无可用模型提示 */
                              <Menu.Item key='no-models' className='px-12px py-12px text-t-secondary text-14px text-center flex justify-center items-center' disabled>
                                {t('settings.noAvailableModels')}
                              </Menu.Item>,
                              /* Add Model 选项 */
                              <Menu.Item key='add-model' className='text-12px text-t-secondary' onClick={() => navigate('/settings/model')}>
                                <Plus theme='outline' size='12' />
                                {t('settings.addModel')}
                              </Menu.Item>,
                            ]
                          : [
                              ...(modelList || []).map((provider) => {
                                const availableModels = getAvailableModels(provider);
                                // 只渲染有可用模型的 provider
                                if (availableModels.length === 0) return null;
                                return (
                                  <Menu.ItemGroup title={provider.name} key={provider.id}>
                                    {availableModels.map((modelName) => {
                                      const isGoogleProvider = provider.platform?.toLowerCase().includes('gemini-with-google-auth');
                                      const option = isGoogleProvider ? geminiModeLookup.get(modelName) : undefined;

                                      // Manual 模式：显示带子菜单的选项
                                      // Manual mode: show submenu with specific models
                                      if (option?.subModels && option.subModels.length > 0) {
                                        return (
                                          <Menu.SubMenu
                                            key={provider.id + modelName}
                                            title={
                                              <div className='flex items-center justify-between gap-12px w-full'>
                                                <span>{option.label}</span>
                                              </div>
                                            }
                                          >
                                            {option.subModels.map((subModel) => (
                                              <Menu.Item
                                                key={provider.id + subModel.value}
                                                className={currentModel?.id + currentModel?.useModel === provider.id + subModel.value ? '!bg-2' : ''}
                                                onClick={() => {
                                                  setCurrentModel({ ...provider, useModel: subModel.value }).catch((error) => {
                                                    console.error('Failed to set current model:', error);
                                                  });
                                                }}
                                              >
                                                {subModel.label}
                                              </Menu.Item>
                                            ))}
                                          </Menu.SubMenu>
                                        );
                                      }

                                      // 普通模式：显示单个选项
                                      // Normal mode: show single item
                                      return (
                                        <Menu.Item
                                          key={provider.id + modelName}
                                          className={currentModel?.id + currentModel?.useModel === provider.id + modelName ? '!bg-2' : ''}
                                          onClick={() => {
                                            setCurrentModel({ ...provider, useModel: modelName }).catch((error) => {
                                              console.error('Failed to set current model:', error);
                                            });
                                          }}
                                        >
                                          {(() => {
                                            if (!option) {
                                              return modelName;
                                            }
                                            return (
                                              <Tooltip
                                                position='right'
                                                trigger='hover'
                                                content={
                                                  <div className='max-w-240px space-y-6px'>
                                                    <div className='text-12px text-t-secondary leading-5'>{option.description}</div>
                                                    {option.modelHint && <div className='text-11px text-t-tertiary'>{option.modelHint}</div>}
                                                  </div>
                                                }
                                              >
                                                <div className='flex items-center justify-between gap-12px w-full'>
                                                  <span>{option.label}</span>
                                                </div>
                                              </Tooltip>
                                            );
                                          })()}
                                        </Menu.Item>
                                      );
                                    })}
                                  </Menu.ItemGroup>
                                );
                              }),
                              /* Add Model 选项 */
                              <Menu.Item key='add-model' className='text-12px text-t-secondary' onClick={() => navigate('/settings/model')}>
                                <Plus theme='outline' size='12' />
                                {t('settings.addModel')}
                              </Menu.Item>,
                            ]}
                      </Menu>
                    }
                  >
                    <Button className={'sendbox-model-btn'} shape='round'>
                      {currentModel ? formatGeminiModelLabel(currentModel, currentModel.useModel) : t('conversation.welcome.selectModel')}
                    </Button>
                  </Dropdown>
                )}
              </div>
              <div className={styles.actionSubmit}>
                <Button
                  shape='circle'
                  type='primary'
                  loading={loading}
                  disabled={!input.trim() || ((!selectedAgent || selectedAgent === 'gemini' || (isPresetAgent && resolvePresetAgentType(selectedAgentInfo) === 'gemini')) && !currentModel)}
                  icon={<ArrowUp theme='outline' size='14' fill='white' strokeWidth={2} />}
                  onClick={() => {
                    handleSend().catch((error) => {
                      console.error('Failed to send message:', error);
                    });
                  }}
                />
              </div>
            </div>
            {dir && (
              <div className='flex items-center justify-between gap-6px h-28px mt-12px px-12px text-13px text-t-secondary ' style={{ borderTop: '1px solid var(--border-base)' }}>
                <div className='flex items-center'>
                  <FolderOpen className='m-r-8px flex-shrink-0' theme='outline' size='16' fill={iconColors.secondary} style={{ lineHeight: 0 }} />
                  <Tooltip content={dir} position='top'>
                    <span className='truncate'>
                      {t('conversation.welcome.currentWorkspace')}: {dir}
                    </span>
                  </Tooltip>
                </div>
                <Tooltip content={t('conversation.welcome.clearWorkspace')} position='top'>
                  <IconClose className='hover:text-[rgb(var(--danger-6))] hover:bg-3 transition-colors' strokeWidth={3} style={{ fontSize: 16 }} onClick={() => setDir('')} />
                </Tooltip>
              </div>
            )}
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default BotGuidPage;
