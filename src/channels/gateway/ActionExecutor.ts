/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TMessage } from '@/common/chatLib';
import type { TProviderWithModel } from '@/common/storage';
import { getDatabase } from '@/process/database';
import { ProcessConfig, getSystemDir } from '@/process/initStorage';
import { ConversationService } from '@/process/services/conversationService';
import { buildChatErrorResponse, chatActions } from '../actions/ChatActions';
import { handlePairingShow, platformActions } from '../actions/PlatformActions';
import { getTelegramDefaultModel, systemActions } from '../actions/SystemActions';
import type { IActionContext, IRegisteredAction } from '../actions/types';
import { getChannelMessageService } from '../agent/ChannelMessageService';
import type { SessionManager } from '../core/SessionManager';
import type { PairingService } from '../pairing/PairingService';
import type { PluginMessageHandler } from '../plugins/BasePlugin';
import { createMainMenuCard, createErrorRecoveryCard, createResponseActionsCard, createToolConfirmationCard } from '../plugins/lark/LarkCards';
import { convertHtmlToLarkMarkdown } from '../plugins/lark/LarkAdapter';
import { createMainMenuKeyboard, createResponseActionsKeyboard, createToolConfirmationKeyboard } from '../plugins/telegram/TelegramKeyboards';
import { escapeHtml } from '../plugins/telegram/TelegramAdapter';
import type { IUnifiedIncomingMessage, IUnifiedOutgoingMessage, PluginType } from '../types';
import type { PluginManager } from './PluginManager';

// ==================== Platform-specific Helpers ====================

/**
 * Get main menu reply markup based on platform
 */
function getMainMenuMarkup(platform: PluginType) {
  if (platform === 'lark') {
    return createMainMenuCard();
  }
  return createMainMenuKeyboard();
}

/**
 * Get response actions markup based on platform
 */
function getResponseActionsMarkup(platform: PluginType, text?: string) {
  if (platform === 'lark') {
    return createResponseActionsCard(text || '');
  }
  return createResponseActionsKeyboard();
}

/**
 * Detect conversation type from model's platform
 * @param model - The model configuration
 * @returns Conversation type ('gemini', 'acp', 'codex', etc.)
 */
function detectConversationType(model: TProviderWithModel): 'gemini' | 'acp' | 'codex' {
  const platform = model.platform?.toLowerCase() || '';

  // Anthropic/Claude models use 'acp' type (Anthropic CLI Platform)
  if (platform.includes('anthropic') || platform.includes('claude')) {
    return 'acp';
  }

  // OpenAI Codex models use 'codex' type
  if (platform.includes('codex') || platform.includes('openai')) {
    return 'codex';
  }

  // Default to 'gemini' for Google/Gemini models and fallback
  return 'gemini';
}

/**
 * Get tool confirmation markup based on platform
 */
function getToolConfirmationMarkup(platform: PluginType, callId: string, options: Array<{ label: string; value: string }>, title?: string, description?: string) {
  if (platform === 'lark') {
    return createToolConfirmationCard(callId, title || 'Confirmation', description || 'Please confirm', options);
  }
  return createToolConfirmationKeyboard(callId, options);
}

/**
 * Get error recovery markup based on platform
 */
function getErrorRecoveryMarkup(platform: PluginType, errorMessage?: string) {
  if (platform === 'lark') {
    return createErrorRecoveryCard(errorMessage);
  }
  return createMainMenuKeyboard(); // Telegram uses main menu for recovery
}

/**
 * Escape/format text for platform
 */
function formatTextForPlatform(text: string, platform: PluginType): string {
  if (platform === 'lark') {
    return convertHtmlToLarkMarkdown(text);
  }
  return escapeHtml(text);
}

/**
 * 获取确认选项
 * Get confirmation options based on type
 */
function getConfirmationOptions(type: string): Array<{ label: string; value: string }> {
  switch (type) {
    case 'edit':
      return [
        { label: '✅ Allow Once', value: 'proceed_once' },
        { label: '✅ Always Allow', value: 'proceed_always' },
        { label: '❌ Cancel', value: 'cancel' },
      ];
    case 'exec':
      return [
        { label: '✅ Allow Execution', value: 'proceed_once' },
        { label: '✅ Always Allow', value: 'proceed_always' },
        { label: '❌ Cancel', value: 'cancel' },
      ];
    case 'mcp':
      return [
        { label: '✅ Allow Once', value: 'proceed_once' },
        { label: '✅ Always Allow Tool', value: 'proceed_always_tool' },
        { label: '✅ Always Allow Server', value: 'proceed_always_server' },
        { label: '❌ Cancel', value: 'cancel' },
      ];
    default:
      return [
        { label: '✅ Confirm', value: 'proceed_once' },
        { label: '❌ Cancel', value: 'cancel' },
      ];
  }
}

/**
 * 获取确认提示文本
 * Get confirmation prompt text
 * 注意：所有用户输入的内容都需要转义 HTML 特殊字符
 * Note: All user input content needs HTML special characters escaped
 */
function getConfirmationPrompt(details: { type: string; title?: string; [key: string]: any }): string {
  if (!details) return 'Please confirm the operation';

  switch (details.type) {
    case 'edit':
      return `📝 <b>Edit File Confirmation</b>\nFile: <code>${escapeHtml(details.fileName || 'Unknown file')}</code>\n\nAllow editing this file?`;
    case 'exec':
      return `⚡ <b>Execute Command Confirmation</b>\nCommand: <code>${escapeHtml(details.command || 'Unknown command')}</code>\n\nAllow executing this command?`;
    case 'mcp':
      return `🔧 <b>MCP Tool Confirmation</b>\nTool: <code>${escapeHtml(details.toolDisplayName || details.toolName || 'Unknown tool')}</code>\nServer: <code>${escapeHtml(details.serverName || 'Unknown server')}</code>\n\nAllow calling this tool?`;
    case 'info':
      return `ℹ️ <b>Information Confirmation</b>\n${escapeHtml(details.prompt || '')}\n\nContinue?`;
    default:
      return 'Please confirm the operation';
  }
}

/**
 * 将 TMessage 转换为 IUnifiedOutgoingMessage
 * Convert TMessage to IUnifiedOutgoingMessage for platform
 */
function convertTMessageToOutgoing(message: TMessage, platform: PluginType, isComplete = false): IUnifiedOutgoingMessage {
  switch (message.type) {
    case 'text': {
      // 根据平台格式化文本
      // Format text based on platform
      const text = formatTextForPlatform(message.content.content || '', platform) || '...';
      return {
        type: 'text',
        text,
        parseMode: 'HTML',
        replyMarkup: isComplete ? getResponseActionsMarkup(platform, text) : undefined,
      };
    }

    case 'tips': {
      const icon = message.content.type === 'error' ? '❌' : message.content.type === 'success' ? '✅' : '⚠️';
      const content = formatTextForPlatform(message.content.content || '', platform);
      return {
        type: 'text',
        text: `${icon} ${content}`,
        parseMode: 'HTML',
      };
    }

    case 'tool_group': {
      // 显示工具调用状态
      // Show tool call status
      const toolLines = message.content.map((tool) => {
        const statusIcon = tool.status === 'Success' ? '✅' : tool.status === 'Error' ? '❌' : tool.status === 'Executing' ? '⏳' : tool.status === 'Confirming' ? '❓' : '📋';
        const desc = formatTextForPlatform(tool.description || tool.name || '', platform);
        return `${statusIcon} ${desc}`;
      });

      // 检查是否有需要确认的工具
      // Check if there are tools that need confirmation
      const confirmingTool = message.content.find((tool) => tool.status === 'Confirming' && tool.confirmationDetails);
      if (confirmingTool && confirmingTool.confirmationDetails) {
        // 根据确认类型生成选项
        // Generate options based on confirmation type
        const options = getConfirmationOptions(confirmingTool.confirmationDetails.type);
        const confirmText = toolLines.join('\n') + '\n\n' + getConfirmationPrompt(confirmingTool.confirmationDetails);

        return {
          type: 'text',
          text: confirmText,
          parseMode: 'HTML',
          replyMarkup: getToolConfirmationMarkup(platform, confirmingTool.callId, options, 'Tool Confirmation', confirmText),
        };
      }

      return {
        type: 'text',
        text: toolLines.join('\n') || '🔧 Executing tools...',
        parseMode: 'HTML',
      };
    }

    case 'tool_call': {
      const statusIcon = message.content.status === 'success' ? '✅' : message.content.status === 'error' ? '❌' : '⏳';
      const name = formatTextForPlatform(message.content.name || '', platform);
      return {
        type: 'text',
        text: `${statusIcon} ${name}`,
        parseMode: 'HTML',
      };
    }

    default:
      // 其他类型暂不支持，显示通用消息
      // Other types not supported yet, show generic message
      return {
        type: 'text',
        text: '⏳ Processing...',
        parseMode: 'HTML',
      };
  }
}

/**
 * ActionExecutor - Routes and executes actions from incoming messages
 *
 * Responsibilities:
 * - Route actions to appropriate handlers (platform/system/chat)
 * - Handle AI chat processing through Gemini
 * - Manage streaming responses
 * - Execute action handlers with proper context
 */
export class ActionExecutor {
  private pluginManager: PluginManager;
  private sessionManager: SessionManager;
  private pairingService: PairingService;

  // Action registry
  private actionRegistry: Map<string, IRegisteredAction> = new Map();

  constructor(pluginManager: PluginManager, sessionManager: SessionManager, pairingService: PairingService) {
    this.pluginManager = pluginManager;
    this.sessionManager = sessionManager;
    this.pairingService = pairingService;

    // Register all actions
    this.registerActions();
  }

  /**
   * Get the message handler for plugins
   */
  getMessageHandler(): PluginMessageHandler {
    return this.handleIncomingMessage.bind(this);
  }

  /**
   * Handle incoming message from plugin
   */
  private async handleIncomingMessage(message: IUnifiedIncomingMessage): Promise<void> {
    const { platform, chatId, user, content, action } = message;

    console.log(`[ActionExecutor] Processing message from ${platform}:${user.id}`, JSON.stringify(message));

    // Get plugin for sending responses
    const plugin = this.getPluginForMessage(message);
    if (!plugin) {
      console.error(`[ActionExecutor] No plugin found for platform: ${platform}`);
      return;
    }

    // Build action context
    const context: IActionContext = {
      platform,
      pluginId: message.pluginId || `${platform}_default`,
      userId: user.id,
      chatId,
      displayName: user.displayName,
      originalMessage: message,
      originalMessageId: message.id,
      sendMessage: async (msg) => plugin.sendMessage(chatId, msg),
      editMessage: async (msgId, msg) => plugin.editMessage(chatId, msgId, msg),
    };

    try {
      // Check if user is authorized
      // Mezon bots don't use pairing - skip authorization check
      const requiresPairing = platform !== 'mezon';

      const isAuthorized = requiresPairing ? this.pairingService.isUserAuthorized(user.id, platform) : true;
      console.log(`[ActionExecutor] Platform: ${platform}, requires pairing: ${requiresPairing}, user ${user.id} authorized: ${isAuthorized}`);

      // Handle /start command - show pairing only for platforms that require it
      if (requiresPairing && content.type === 'command' && content.text === '/start') {
        const result = await handlePairingShow(context);
        if (result.message) {
          await context.sendMessage(result.message);
        }
        return;
      }

      // If not authorized and platform requires pairing, show pairing flow
      if (requiresPairing && !isAuthorized) {
        const result = await handlePairingShow(context);
        if (result.message) {
          await context.sendMessage(result.message);
        }
        return;
      }

      // User is authorized - look up the assistant user
      const db = getDatabase();
      const userResult = db.getChannelUserByPlatform(user.id, platform);
      let channelUser = userResult.data;

      // For Mezon (no pairing), create user on-the-fly if not exists
      if (!channelUser && platform === 'mezon') {
        console.log(`[ActionExecutor] Creating on-the-fly channel user for Mezon user: ${user.id}`);
        const createResult = db.createChannelUser({
          id: `mezon_${user.id}_${Date.now()}`,
          platformUserId: user.id,
          platformType: platform as any,
          displayName: user.displayName || 'Mezon User',
          authorizedAt: Date.now(),
        });

        if (createResult.success && createResult.data) {
          channelUser = createResult.data;
          console.log(`[ActionExecutor] ✓ Created Mezon channel user: ${channelUser.id}`);
        } else {
          console.error(`[ActionExecutor] Failed to create Mezon channel user:`, createResult.error);
          await context.sendMessage({
            type: 'text',
            text: '❌ Failed to create user profile. Please try again.',
            parseMode: 'HTML',
          });
          return;
        }
      }

      if (!channelUser) {
        console.error(`[ActionExecutor] Authorized user not found in database: ${user.id}`);
        await context.sendMessage({
          type: 'text',
          text: '❌ User data error. Please re-pair your account.',
          parseMode: 'HTML',
        });
        return;
      }

      // Set the assistant user in context
      context.channelUser = channelUser;

      // Get or create session
      // 获取或创建会话，优先复用该平台来源的会话
      let session = this.sessionManager.getSession(channelUser.id);
      if (!session || !session.conversationId) {
        // 获取用户选择的模型 / Get user selected model (supports multi-bot)
        const model = await this.getModelForPlugin(message.pluginId);

        // 使用 ConversationService 获取或创建会话（根据平台）
        // Use ConversationService to get or create conversation (based on platform)
        const conversationName = await this.getConversationNameForPlugin(platform, message.pluginId);

        // Bot routing: If message has chatId (externalChannelId), use bot-specific routing
        // Otherwise fall back to legacy Telegram routing
        let result;
        if (message.chatId) {
          // Extract botId from pluginId (format: "mezon_{botId}" or "telegram_{botId}")
          const botId = message.pluginId.includes('_') ? message.pluginId.split('_')[1] : message.pluginId;

          // IMPORTANT: Extract stable channel ID for conversation lookup
          // MezonPlugin sessionId format: "{channelId}_timestamp" or "{threadId}_timestamp"
          // We need the base channel/thread ID without timestamp for conversation persistence
          const stableChannelId = message.chatId.includes('_') ? message.chatId.substring(0, message.chatId.lastIndexOf('_')) : message.chatId;

          console.log(`[ActionExecutor] Using bot conversation routing (channel: ${stableChannelId.slice(0, 12)}..., bot: ${botId})`);

          // For Mezon bots, default to ACP (Claude) if no model configured
          const conversationType = model.platform ? detectConversationType(model) : 'acp';

          // ConversationService will automatically inject assistantId from bot config
          result = await ConversationService.getOrCreateBotConversation(stableChannelId, botId, {
            type: conversationType,
            model,
            name: conversationName,
            extra: {
              workspace: '', // Empty string to create unique temp workspace (claude-temp-timestamp)
              defaultFiles: [],
              backend: conversationType === 'acp' ? 'claude' : undefined,
              cliPath: conversationType === 'acp' ? 'claude' : undefined,
              agentName: conversationType === 'acp' ? 'Claude Code' : undefined,
              customWorkspace: false,
            },
          });
        } else {
          // Legacy routing for Telegram (backward compatibility)
          result = await ConversationService.getOrCreateTelegramConversation({
            model,
            name: conversationName,
          });
        }

        if (result.success && result.conversation) {
          session = this.sessionManager.createSessionWithConversation(channelUser, result.conversation.id);
          console.log(`[ActionExecutor] Using conversation via ConversationService: ${result.conversation.id}`);
        } else {
          console.error(`[ActionExecutor] Failed to create conversation: ${result.error}`);
          await context.sendMessage({
            type: 'text',
            text: `❌ Failed to create session: ${result.error || 'Unknown error'}`,
            parseMode: 'HTML',
          });
          return;
        }
      }
      context.sessionId = session.id;
      context.conversationId = session.conversationId;

      // Route based on action or content
      console.log(`[ActionExecutor] Routing - action:`, action, `content.type:`, content.type);
      if (action) {
        // Explicit action from button press
        console.log(`[ActionExecutor] Executing action: ${action.name} with params:`, action.params);
        await this.executeAction(context, action.name, action.params);
      } else if (content.type === 'action') {
        // Action encoded in content
        await this.executeAction(context, content.text, {});
      } else if (content.type === 'text' && content.text) {
        // Regular text message - send to AI
        await this.handleChatMessage(context, content.text);
      } else {
        // Unsupported content type
        await context.sendMessage({
          type: 'text',
          text: 'This message type is not supported. Please send a text message.',
          parseMode: 'HTML',
          replyMarkup: getMainMenuMarkup(platform as PluginType),
        });
      }
    } catch (error: any) {
      console.error(`[ActionExecutor] Error handling message:`, error);
      await context.sendMessage({
        type: 'text',
        text: `❌ Error processing message: ${error.message}`,
        parseMode: 'HTML',
        replyMarkup: getErrorRecoveryMarkup(platform as PluginType, error.message),
      });
    }
  }

  /**
   * Execute a registered action
   */
  private async executeAction(context: IActionContext, actionName: string, params?: Record<string, string>): Promise<void> {
    const action = this.actionRegistry.get(actionName);

    if (!action) {
      console.warn(`[ActionExecutor] Unknown action: ${actionName}`);
      await context.sendMessage({
        type: 'text',
        text: `Unknown action: ${actionName}`,
        parseMode: 'HTML',
      });
      return;
    }

    console.log(`[ActionExecutor] Executing action: ${actionName}`);

    try {
      const result = await action.handler(context, params);

      if (result.message) {
        await context.sendMessage(result.message);
      }
    } catch (error: any) {
      console.error(`[ActionExecutor] Action ${actionName} failed:`, error);
      await context.sendMessage({
        type: 'text',
        text: `❌ Action failed: ${error.message}`,
        parseMode: 'HTML',
      });
    }
  }

  /**
   * Handle chat message - send to AI and stream response
   */
  private async handleChatMessage(context: IActionContext, text: string): Promise<void> {
    // Update session activity
    if (context.channelUser) {
      this.sessionManager.updateSessionActivity(context.channelUser.id);
    }

    // Send "thinking" indicator
    const thinkingMsgId = await context.sendMessage({
      type: 'text',
      text: '⏳ Thinking...',
      parseMode: 'HTML',
    });

    try {
      const sessionId = context.sessionId;
      const conversationId = context.conversationId;

      if (!sessionId || !conversationId) {
        throw new Error('Session not initialized');
      }

      const messageService = getChannelMessageService();

      // 节流控制：使用定时器机制确保最后一条消息能被发送
      // Throttle control: use timer mechanism to ensure last message is sent
      let lastUpdateTime = 0;
      const UPDATE_THROTTLE_MS = 500; // Update at most every 500ms
      let pendingUpdateTimer: ReturnType<typeof setTimeout> | null = null;
      let pendingMessage: IUnifiedOutgoingMessage | null = null;

      // 跟踪已发送的消息 ID，用于新插入消息的管理
      // Track sent message IDs for new inserted messages
      const sentMessageIds: string[] = [thinkingMsgId];

      // 跟踪最后一条消息内容，用于流结束后添加操作按钮
      // Track last message content for adding action buttons after stream ends
      let lastMessageContent: IUnifiedOutgoingMessage | null = null;

      // 执行消息编辑的函数
      // Function to perform message edit
      const doEditMessage = async (msg: IUnifiedOutgoingMessage) => {
        lastUpdateTime = Date.now();
        const targetMsgId = sentMessageIds[sentMessageIds.length - 1] || thinkingMsgId;
        try {
          await context.editMessage(targetMsgId, msg);
        } catch (editError) {
          // 忽略编辑错误（消息未修改等）
          // Ignore edit errors (message not modified, etc.)
          console.debug('[ActionExecutor] Edit error (ignored):', editError);
        }
      };

      // 发送消息
      // Send message
      await messageService.sendMessage(sessionId, conversationId, text, async (message: TMessage, isInsert: boolean) => {
        const now = Date.now();

        // 转换消息格式（根据平台）
        // Convert message format (based on platform)
        const outgoingMessage = convertTMessageToOutgoing(message, context.platform as PluginType, false);

        // 保存最后一条消息内容
        // Save last message content
        lastMessageContent = outgoingMessage;

        console.log(`[ActionExecutor] Stream callback - isInsert: ${isInsert}, msg_id: ${message.msg_id}, type: ${message.type}, sentMessageIds count: ${sentMessageIds.length}`);

        // IMPORTANT: Always treat first streaming message as update to thinking message
        // This prevents async race condition where first insert's sendMessage takes time
        // while subsequent messages arrive and get processed as updates
        // 重要：始终将第一个流式消息视为更新thinking消息
        // 这可以防止异步竞态条件：第一个insert的sendMessage耗时时，后续消息已到达并被当作update处理
        if (isInsert && sentMessageIds.length === 1) {
          // First streaming message: update thinking message instead of inserting
          // 第一个流式消息：更新thinking消息而不是插入新消息
          console.log(`[ActionExecutor] First streaming message, updating thinking message instead of inserting`);
          const targetMsgId = sentMessageIds[0] || thinkingMsgId;
          console.log(`[ActionExecutor] Updating message, targetMsgId: ${targetMsgId}, content preview: ${outgoingMessage.text?.slice(0, 50)}`);
          pendingMessage = outgoingMessage;

          if (now - lastUpdateTime >= UPDATE_THROTTLE_MS) {
            if (pendingUpdateTimer) {
              clearTimeout(pendingUpdateTimer);
              pendingUpdateTimer = null;
            }
            await doEditMessage(outgoingMessage);
          } else {
            if (pendingUpdateTimer) {
              clearTimeout(pendingUpdateTimer);
            }
            const delay = UPDATE_THROTTLE_MS - (now - lastUpdateTime);
            pendingUpdateTimer = setTimeout(() => {
              if (pendingMessage) {
                void doEditMessage(pendingMessage);
                pendingMessage = null;
              }
              pendingUpdateTimer = null;
            }, delay);
          }
        } else if (isInsert) {
          // 新消息：发送新消息
          // New message: send new message
          try {
            const newMsgId = await context.sendMessage(outgoingMessage);
            sentMessageIds.push(newMsgId);
            console.log(`[ActionExecutor] Inserted new message, newMsgId: ${newMsgId}, total messages: ${sentMessageIds.length}`);
          } catch (sendError) {
            console.debug('[ActionExecutor] Send error (ignored):', sendError);
          }
        } else {
          // 更新消息：使用定时器节流，确保最后一条消息能被发送
          // Update message: throttle with timer to ensure last message is sent
          const targetMsgId = sentMessageIds[sentMessageIds.length - 1] || thinkingMsgId;
          console.log(`[ActionExecutor] Updating message, targetMsgId: ${targetMsgId}, content preview: ${outgoingMessage.text?.slice(0, 50)}`);
          pendingMessage = outgoingMessage;

          if (now - lastUpdateTime >= UPDATE_THROTTLE_MS) {
            // 距离上次发送超过节流时间，立即发送
            // Enough time has passed since last send, send immediately
            if (pendingUpdateTimer) {
              clearTimeout(pendingUpdateTimer);
              pendingUpdateTimer = null;
            }
            await doEditMessage(outgoingMessage);
          } else {
            // 在节流时间内，设置定时器延迟发送
            // Within throttle window, set timer to send later
            if (pendingUpdateTimer) {
              clearTimeout(pendingUpdateTimer);
            }
            const delay = UPDATE_THROTTLE_MS - (now - lastUpdateTime);
            pendingUpdateTimer = setTimeout(() => {
              if (pendingMessage) {
                void doEditMessage(pendingMessage);
                pendingMessage = null;
              }
              pendingUpdateTimer = null;
            }, delay);
          }
        }
      });

      // 清除待处理的定时器，确保最后一条消息被处理
      // Clear pending timer and ensure last message is processed
      if (pendingUpdateTimer) {
        clearTimeout(pendingUpdateTimer);
        pendingUpdateTimer = null;
      }
      // 如果有待发送的消息，立即发送
      // If there's a pending message, send it immediately
      if (pendingMessage) {
        try {
          await doEditMessage(pendingMessage);
        } catch (error) {
          console.debug('[ActionExecutor] Final pending message edit error (ignored):', error);
        }
        pendingMessage = null;
      }

      // 流结束后，更新最后一条消息添加操作按钮（保留原内容）
      // After stream ends, update last message with action buttons (keep original content)
      const lastMsgId = sentMessageIds[sentMessageIds.length - 1] || thinkingMsgId;
      try {
        // 使用最后一条消息的实际内容，添加操作按钮（根据平台）
        // Use actual content of last message, add action buttons (based on platform)
        const responseMarkup = getResponseActionsMarkup(context.platform as PluginType, lastMessageContent?.text);
        const finalMessage: IUnifiedOutgoingMessage = lastMessageContent ? { ...lastMessageContent, replyMarkup: responseMarkup } : { type: 'text', text: '✅ Done', parseMode: 'HTML', replyMarkup: responseMarkup };
        await context.editMessage(lastMsgId, finalMessage);
      } catch {
        // 忽略最终编辑错误
        // Ignore final edit error
      }
    } catch (error: any) {
      console.error(`[ActionExecutor] Chat processing failed:`, error);

      // Update message with error
      const errorResponse = buildChatErrorResponse(error.message);
      await context.editMessage(thinkingMsgId, {
        type: 'text',
        text: errorResponse.text,
        parseMode: errorResponse.parseMode,
        replyMarkup: errorResponse.replyMarkup,
      });
    }
  }

  /**
   * Get plugin instance for a message
   */
  private getPluginForMessage(message: IUnifiedIncomingMessage) {
    // If pluginId is provided, look up by ID first (multi-bot support)
    if (message.pluginId) {
      const plugin = this.pluginManager.getPlugin(message.pluginId);
      if (plugin) return plugin;
    }
    // Fallback: get the first plugin of the matching type
    const plugins = this.pluginManager.getAllPlugins();
    return plugins.find((p) => p.type === message.platform);
  }

  /**
   * Get model for a specific plugin (multi-bot support)
   * Looks up bot config from ProcessConfig to find the assigned model
   */
  private async getModelForPlugin(pluginId?: string): Promise<TProviderWithModel> {
    if (pluginId) {
      try {
        const bots = await ProcessConfig.get('mezon.bots');
        console.log('[ActionExecutor] mezon.bots config:', JSON.stringify(bots, null, 2));
        if (bots && Array.isArray(bots)) {
          // Extract bot UUID from plugin ID (format: mezon_<uuid>)
          const botUuid = pluginId.replace(/^mezon_/, '');
          const botConfig = bots.find((b) => b.id === botUuid);
          console.log('[ActionExecutor] Found bot config:', JSON.stringify(botConfig, null, 2));
          if (botConfig?.defaultModel?.id && botConfig.defaultModel.useModel) {
            const providers = await ProcessConfig.get('model.config');
            if (providers && Array.isArray(providers)) {
              const provider = providers.find((p) => p.id === botConfig.defaultModel!.id);
              if (provider && provider.model?.includes(botConfig.defaultModel.useModel)) {
                return { ...provider, useModel: botConfig.defaultModel.useModel } as TProviderWithModel;
              }
            }
          }
        }
      } catch (error) {
        console.warn('[ActionExecutor] Failed to get bot-specific model:', error);
      }
    }
    // Fallback to default model
    // For Mezon bots without configured model, return a minimal Claude ACP model config
    if (pluginId?.startsWith('mezon_')) {
      return {
        id: 'acp_default',
        platform: 'anthropic',
        name: 'Claude (ACP)',
        baseUrl: '',
        apiKey: '',
        model: [],
        useModel: 'claude-sonnet-4.5',
      } as TProviderWithModel;
    }
    return getTelegramDefaultModel();
  }

  /**
   * Get conversation name for a plugin (multi-bot support)
   */
  private async getConversationNameForPlugin(platform: string, pluginId?: string): Promise<string> {
    if (platform === 'mezon' && pluginId) {
      try {
        const bots = await ProcessConfig.get('mezon.bots');
        if (bots && Array.isArray(bots)) {
          const botUuid = pluginId.replace(/^mezon_/, '');
          const botConfig = bots.find((b) => b.id === botUuid);
          if (botConfig?.name) {
            return `Mezon: ${botConfig.name}`;
          }
        }
      } catch {
        // ignore
      }
    }
    if (platform === 'lark') return 'Lark Assistant';
    if (platform === 'mezon') return 'Mezon Assistant';
    return 'Telegram Assistant';
  }

  /**
   * Register all actions
   */
  private registerActions(): void {
    // Register system actions
    for (const action of systemActions) {
      this.actionRegistry.set(action.name, action);
    }

    // Register chat actions
    for (const action of chatActions) {
      this.actionRegistry.set(action.name, action);
    }

    // Register platform actions
    for (const action of platformActions) {
      this.actionRegistry.set(action.name, action);
    }

    console.log(`[ActionExecutor] Registered ${this.actionRegistry.size} actions`);
  }
}
