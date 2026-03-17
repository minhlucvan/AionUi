/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * MezonToolProvider - Wraps Mezon SDK operations for MCP tool exposure
 *
 * Manages the Mezon client lifecycle, caches messages received via WebSocket,
 * and provides methods that MCP tool handlers invoke.
 */

import { MezonClient } from 'mezon-sdk';
import type { ChannelMessage } from 'mezon-sdk';
import { MezonMessageCache } from './cache';
import type {
  CachedMessage,
  MezonMcpConfig,
  SendMessageParams,
  ReadMessagesParams,
  SearchMessagesParams,
  SendMessageResult,
  ChannelSummary,
  TrackedChannel,
} from './types';

const MEZON_MESSAGE_LIMIT = 4000;

export class MezonToolProvider {
  private client: MezonClient | null = null;
  private cache: MezonMessageCache;
  private config: MezonMcpConfig;
  private botUserId = '';
  private connected = false;

  constructor(config: MezonMcpConfig) {
    this.config = config;
    this.cache = new MezonMessageCache();
  }

  /**
   * Connect to Mezon and start listening for messages
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    this.client = new MezonClient({
      token: this.config.token,
      botId: this.config.botId,
    });

    this.botUserId = await this.client.login();
    if (!this.botUserId) {
      this.botUserId = this.config.botId;
    }

    // Listen for all channel messages and cache them
    this.client.onChannelMessage((msg: ChannelMessage) => {
      this.onMessage(msg);
    });

    this.connected = true;
    console.log(`[MezonToolProvider] Connected as bot ${this.botUserId}`);
  }

  /**
   * Disconnect from Mezon
   */
  disconnect(): void {
    if (this.client) {
      try {
        this.client.closeSocket();
      } catch (_e) {
        // ignore cleanup errors
      }
      this.client = null;
    }
    this.connected = false;
    this.cache.clear();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  // ==================== Tool Methods ====================

  /**
   * Read recent messages from a channel or thread
   */
  readMessages(params: ReadMessagesParams): CachedMessage[] {
    return this.cache.getMessages(params.channelId, {
      threadId: params.threadId,
      limit: params.limit || 50,
      beforeTimestamp: params.beforeTimestamp,
      afterTimestamp: params.afterTimestamp,
    });
  }

  /**
   * Send a message to a Mezon channel or thread
   */
  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    if (!this.client) {
      throw new Error('Not connected to Mezon. Call connect() first.');
    }

    const text = params.text;
    if (!text || text.trim().length === 0) {
      throw new Error('Message text cannot be empty');
    }

    // Truncate if too long
    const truncatedText =
      text.length > MEZON_MESSAGE_LIMIT ? text.slice(0, MEZON_MESSAGE_LIMIT - 3) + '...' : text;

    const socketMgr = (this.client as any).socketManager;

    const messageParams: any = {
      clan_id: params.clanId,
      channel_id: params.channelId,
      mode: 2,
      is_public: !params.threadId,
      content: { t: truncatedText },
    };

    if (params.threadId) {
      messageParams.topic_id = params.threadId;
    }

    if (params.replyToMessageId) {
      messageParams.references = [
        {
          message_id: params.replyToMessageId,
          message_ref_id: params.replyToMessageId,
        },
      ];
    }

    const result = await socketMgr.writeChatMessage(messageParams);

    return {
      messageId: result?.message_id || '',
      channelId: params.channelId,
      threadId: params.threadId,
    };
  }

  /**
   * Search messages by text query
   */
  searchMessages(params: SearchMessagesParams): CachedMessage[] {
    return this.cache.searchMessages(params.query, params.channelId, params.limit || 20);
  }

  /**
   * Get channel conversation summary
   */
  getChannelSummary(channelId: string, threadId?: string): ChannelSummary | null {
    return this.cache.getChannelSummary(channelId, threadId);
  }

  /**
   * List all tracked channels with activity
   */
  listChannels(): TrackedChannel[] {
    return this.cache.getTrackedChannels();
  }

  /**
   * Get cache statistics
   */
  getStats(): { channelCount: number; totalMessages: number; connected: boolean; botId: string } {
    const stats = this.cache.getStats();
    return {
      ...stats,
      connected: this.connected,
      botId: this.botUserId,
    };
  }

  // ==================== Internal ====================

  private onMessage(msg: ChannelMessage): void {
    // Cache all messages (including bot's own for completeness)
    const cached: CachedMessage = {
      id: msg.message_id || msg.id,
      channelId: msg.channel_id,
      clanId: msg.clan_id,
      threadId: msg.topic_id || undefined,
      senderId: msg.sender_id,
      senderName: msg.display_name || msg.clan_nick || msg.username || `User ${msg.sender_id?.slice(-6)}`,
      senderUsername: msg.username,
      text: msg.content?.t || '',
      timestamp: msg.create_time_seconds ? msg.create_time_seconds * 1000 : Date.now(),
      attachments: msg.attachments?.map((a: any) => ({
        url: a.url,
        filename: a.filename,
        filetype: a.filetype,
        size: a.size,
      })),
      mentions: msg.mentions?.map((m: any) => ({
        userId: m.user_id,
        start: m.s,
        end: m.e,
      })),
    };

    this.cache.addMessage(cached);
  }
}
