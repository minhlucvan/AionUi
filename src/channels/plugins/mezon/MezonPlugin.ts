/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { MezonClient } from 'mezon-sdk';

import type { ChannelMessage, ChannelMessageContent } from 'mezon-sdk';
import type { BotInfo, IChannelPluginConfig, IUnifiedOutgoingMessage, PluginType } from '../../types';
import { BasePlugin } from '../BasePlugin';
import { MEZON_MESSAGE_LIMIT, splitMessage, toMezonSendParams, toUnifiedIncomingMessage } from './MezonAdapter';

/**
 * MezonPlugin - Mezon Bot integration for Personal Assistant
 *
 * Uses mezon-sdk for Mezon Bot API
 * Connects via WebSocket for real-time message handling
 */
export class MezonPlugin extends BasePlugin {
  readonly type: PluginType = 'mezon';

  private client: MezonClient | null = null;
  private botUserId: string = '';
  private botId: string = '';
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 10;
  private readonly baseReconnectDelay: number = 1000;
  private isConnected: boolean = false;

  // Track active users for status reporting
  private activeUsers: Set<string> = new Set();

  /**
   * Initialize the Mezon bot instance
   */
  protected async onInitialize(config: IChannelPluginConfig): Promise<void> {
    const token = config.credentials?.token;
    const botId = config.credentials?.botId;

    console.log(`[MezonPlugin] onInitialize called, hasToken=${!!token}, hasBotId=${!!botId}, pluginId=${config.id}`);

    if (!token) {
      throw new Error('Mezon bot token is required');
    }

    if (!botId) {
      throw new Error('Mezon bot ID is required');
    }

    this.botId = botId;

    // Create MezonClient instance
    this.client = new MezonClient({
      token,
      botId,
    });

    console.log(`[MezonPlugin] MezonClient instance created`);

    // Setup message handlers
    this.setupHandlers();
    console.log(`[MezonPlugin] Handlers setup complete`);

    console.log(`[MezonPlugin] Initialized plugin ${config.id}`);
  }

  /**
   * Start the WebSocket connection
   */
  protected async onStart(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      // Login to authenticate and connect
      const userId = await this.client.login();
      this.botUserId = userId || this.botId;
      console.log(`[MezonPlugin] Logged in, botUserId=${this.botUserId}`);

      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log(`[MezonPlugin] Connected successfully`);
    } catch (error) {
      console.error('[MezonPlugin] Failed to start:', error);
      throw error;
    }
  }

  /**
   * Stop and cleanup
   */
  protected async onStop(): Promise<void> {
    if (this.client) {
      try {
        this.client.closeSocket();
      } catch (error) {
        console.warn('[MezonPlugin] Error closing socket:', error);
      }
    }

    this.client = null;
    this.botUserId = '';
    this.activeUsers.clear();
    this.reconnectAttempts = 0;
    this.isConnected = false;

    console.log('[MezonPlugin] Stopped and cleaned up');
  }

  /**
   * Get active user count
   */
  getActiveUserCount(): number {
    return this.activeUsers.size;
  }

  /**
   * Get bot information
   */
  getBotInfo(): BotInfo | null {
    if (!this.botUserId) return null;
    return {
      id: this.botUserId,
      displayName: 'Mezon Bot',
    };
  }

  /**
   * Send a message to a channel
   */
  async sendMessage(chatId: string, message: IUnifiedOutgoingMessage): Promise<string> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const content = toMezonSendParams(message);
    const text = content.t || '';

    // Handle long messages by splitting
    const chunks = splitMessage(text, MEZON_MESSAGE_LIMIT);
    let lastMessageId = '';

    for (let i = 0; i < chunks.length; i++) {
      try {
        const chunkContent: ChannelMessageContent = { t: chunks[i] };
        // Access socketManager to write chat messages
        // socketManager is protected on MezonClient so we need a cast
        const socketMgr = (this.client as any).socketManager;
        const result = await socketMgr.writeChatMessage({
          clan_id: '',
          channel_id: chatId,
          mode: 1, // DM mode
          is_public: false,
          content: chunkContent,
        });
        lastMessageId = result?.message_id || '';
      } catch (error) {
        console.error(`[MezonPlugin] Failed to send message chunk ${i + 1}/${chunks.length}:`, error);
        throw error;
      }
    }

    return lastMessageId;
  }

  /**
   * Edit an existing message
   */
  async editMessage(chatId: string, messageId: string, message: IUnifiedOutgoingMessage): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const content = toMezonSendParams(message);
    const text = content.t || '';

    // Truncate if too long (can't split when editing)
    const truncatedText = text.length > MEZON_MESSAGE_LIMIT ? text.slice(0, MEZON_MESSAGE_LIMIT - 3) + '...' : text;

    try {
      // Access socketManager to update chat messages
      const socketMgr = (this.client as any).socketManager;
      await socketMgr.updateChatMessage({
        clan_id: '',
        channel_id: chatId,
        mode: 1,
        is_public: false,
        message_id: messageId,
        content: { t: truncatedText },
      });
    } catch (error: any) {
      // Ignore "not modified" errors
      if (error?.message?.includes('not modified')) {
        return;
      }
      console.error('[MezonPlugin] Failed to edit message:', error);
      throw error;
    }
  }

  /**
   * Setup message and event handlers
   */
  private setupHandlers(): void {
    if (!this.client) return;

    console.log(`[MezonPlugin] Setting up handlers on client instance...`);

    // Handle incoming channel messages
    this.client.onChannelMessage((msg: ChannelMessage) => {
      console.log(`[MezonPlugin] *** Channel message received *** senderId=${msg.sender_id}, channelId=${msg.channel_id}`);
      void this.handleIncomingMessage(msg);
    });

    console.log(`[MezonPlugin] Event handlers registered`);
  }

  /**
   * Handle incoming messages
   */
  private async handleIncomingMessage(msg: ChannelMessage): Promise<void> {
    try {
      const userId = msg.sender_id;
      if (!userId) return;

      // Ignore messages from the bot itself
      if (userId === this.botUserId) return;

      // Track user
      this.activeUsers.add(userId);

      // Check for /start command
      const text = msg.content?.t || '';
      const currentPluginId = this.config?.id;
      if (text === '/start') {
        const unifiedMessage = toUnifiedIncomingMessage(msg, this.botUserId, currentPluginId);
        if (unifiedMessage && this.messageHandler) {
          unifiedMessage.content.type = 'command';
          unifiedMessage.content.text = '/start';
          void this.messageHandler(unifiedMessage)
            .then(() => console.log(`[MezonPlugin] Start command handled successfully`))
            .catch((error) => console.error(`[MezonPlugin] Error handling start command:`, error));
        }
        return;
      }

      // Convert to unified message and forward to handler
      const unifiedMessage = toUnifiedIncomingMessage(msg, this.botUserId, currentPluginId);
      if (unifiedMessage && this.messageHandler) {
        console.log(`[MezonPlugin] Forwarding message to handler (non-blocking)`);
        // Don't await - process in background to avoid blocking
        void this.messageHandler(unifiedMessage)
          .then(() => {
            console.log(`[MezonPlugin] Message handler completed successfully for: ${text?.slice(0, 20)}...`);
          })
          .catch((error) => {
            console.error(`[MezonPlugin] Message handler failed for: ${text?.slice(0, 20)}...`, error);
          });
      } else {
        console.warn(`[MezonPlugin] Cannot forward message: unifiedMessage=${!!unifiedMessage}, messageHandler=${!!this.messageHandler}`);
      }
    } catch (error) {
      console.error(`[MezonPlugin] Error handling incoming message:`, error);
    }
  }

  /**
   * Test connection with a token and botId
   * Used by Settings UI to validate credentials before saving
   */
  static async testConnection(token: string, botId?: string): Promise<{ success: boolean; botInfo?: BotInfo; error?: string }> {
    if (!botId) {
      return { success: false, error: 'Bot ID is required' };
    }

    try {
      const client = new MezonClient({
        token,
        botId,
      });

      const userId = await client.login();

      // Clean up
      try {
        client.closeSocket();
      } catch (_e) {
        // ignore cleanup errors
      }

      return {
        success: true,
        botInfo: {
          id: userId || botId,
          displayName: 'Mezon Bot',
        },
      };
    } catch (error: any) {
      let errorMessage = 'Connection failed';

      if (error?.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
