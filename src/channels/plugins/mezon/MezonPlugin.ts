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

  // Track chat sessions by unique sessionId (includes timestamp)
  private chatSessions: Map<
    string,
    {
      sessionId: string;
      baseKey: string; // For finding existing sessions by channel/thread/dm
      threadId?: string;
      channelId: string;
      clanId: string;
      userId: string;
      userName: string;
      messageCount: number;
      createdAt: number;
      lastActivity: number;
    }
  > = new Map();

  // Session timeout configuration (30 minutes of inactivity)
  private readonly SESSION_TIMEOUT_MS: number = 30 * 60 * 1000;

  // Track processed message IDs to prevent duplicates
  private processedMessages: Set<string> = new Set();
  private readonly MESSAGE_CACHE_SIZE = 100; // Keep last 100 message IDs

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
      await this.client.login();
      // Use botId from config as botUserId (login() returns session object, not user_id)
      this.botUserId = this.botId;
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
    this.processedMessages.clear(); // Clear message cache
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
   * Check if bot is mentioned in the message
   */
  private isBotMentioned(msg: ChannelMessage): boolean {
    // Check mentions array
    if (msg.mentions && Array.isArray(msg.mentions)) {
      const hasMention = msg.mentions.some((mention: any) => mention.user_id === this.botUserId || mention.user_id === this.botId);
      if (hasMention) return true;
    }

    // Fallback: check if message content includes @botname or bot ID
    const text = msg.content?.t || '';
    return text.includes(`@${this.botUserId}`) || text.includes(`@${this.botId}`);
  }

  /**
   * Clean up inactive sessions to prevent memory bloat
   * Removes sessions older than SESSION_TIMEOUT_MS
   */
  private cleanupInactiveSessions(): void {
    const now = Date.now();
    let removedCount = 0;

    // Convert to array for iteration compatibility
    const entries = Array.from(this.chatSessions.entries());
    for (const [sessionId, session] of entries) {
      if (now - session.lastActivity > this.SESSION_TIMEOUT_MS) {
        this.chatSessions.delete(sessionId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`[MezonPlugin] 🧹 Cleaned up ${removedCount} inactive sessions (active: ${this.chatSessions.size})`);
    }
  }

  /**
   * Check if user has an active conversation session
   * If yes, they can continue the conversation without mentioning the bot
   */
  private hasActiveSession(threadId: string | undefined, channelId: string, userId: string): boolean {
    const baseKey = threadId && threadId !== '0' ? threadId : channelId || `dm_${userId}`;

    // Find session by baseKey
    for (const session of this.chatSessions.values()) {
      if (session.baseKey === baseKey) {
        const now = Date.now();
        const inactive = now - session.lastActivity > this.SESSION_TIMEOUT_MS;

        if (!inactive) {
          console.log(`[MezonPlugin] ✓ Active session found: ${session.sessionId.slice(0, 20)}... (last activity: ${Math.floor((now - session.lastActivity) / 1000)}s ago)`);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get or create a chat session for tracking context
   *
   * Each new chat creates a unique conversation (like web portal).
   * Session key includes timestamp to ensure separate conversations per chat.
   */
  private getChatSession(
    threadId: string | undefined,
    channelId: string,
    clanId: string,
    userId: string,
    userName: string
  ): {
    sessionId: string;
    baseKey: string;
    threadId?: string;
    channelId: string;
    clanId: string;
    userId: string;
    userName: string;
    messageCount: number;
    createdAt: number;
    lastActivity: number;
  } {
    // Base key: threadId if exists, otherwise channelId, otherwise DM with userId
    const baseKey = threadId && threadId !== '0' ? threadId : channelId || `dm_${userId}`;

    // Look for existing active session for this channel/thread by baseKey
    let existingSession: any = null;
    for (const session of this.chatSessions.values()) {
      if (session.baseKey === baseKey) {
        existingSession = session;
        break;
      }
    }

    // If session exists and is still active (within timeout), reuse it
    if (existingSession) {
      const now = Date.now();
      const inactive = now - existingSession.lastActivity > this.SESSION_TIMEOUT_MS;

      if (!inactive) {
        // Session is still active, reuse it
        existingSession.lastActivity = now;
        console.log(`[MezonPlugin] Reusing active session: ${existingSession.sessionId.slice(0, 12)}... (${userName})`);
        return existingSession;
      } else {
        // Session expired, remove it and create new one below
        console.log(`[MezonPlugin] Session expired: ${existingSession.sessionId.slice(0, 12)}...`);
        this.chatSessions.delete(existingSession.sessionId);
      }
    }

    // Create NEW session with unique ID (includes timestamp)
    // This ensures each chat creates a separate conversation in the database
    const uniqueSessionId = `${baseKey}_${Date.now()}`;
    const session = {
      sessionId: uniqueSessionId,
      baseKey,
      threadId: threadId && threadId !== '0' ? threadId : undefined,
      channelId,
      clanId,
      userId,
      userName,
      messageCount: 0,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };
    // Store with sessionId as key (not baseKey!)
    this.chatSessions.set(uniqueSessionId, session);
    console.log(`[MezonPlugin] New chat session: ${uniqueSessionId.slice(0, 20)}... (${userName})`);

    return session;
  }

  /**
   * Send a message to a channel, thread, or DM
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

    // Look up session context to determine how to send
    const session = this.chatSessions.get(chatId);

    // Debug logging for session lookup
    console.log(`[MezonPlugin] sendMessage: chatId=${chatId}, session found=${!!session}`);
    if (!session) {
      console.warn(`[MezonPlugin] No session found for chatId=${chatId}, available sessions:`, Array.from(this.chatSessions.keys()));
    }

    // Validate required parameters before sending
    if (!session?.clanId || !session?.channelId) {
      throw new Error(`Missing required message parameters: clan_id=${session?.clanId}, channel_id=${session?.channelId}`);
    }

    // Periodically cleanup inactive sessions (every 50 messages)
    if (this.chatSessions.size > 0 && this.chatSessions.size % 50 === 0) {
      this.cleanupInactiveSessions();
    }

    for (let i = 0; i < chunks.length; i++) {
      try {
        const chunkContent: ChannelMessageContent = { t: chunks[i] };
        const socketMgr = (this.client as any).socketManager;

        // Determine message parameters based on session context
        const messageParams: any = {
          clan_id: session.clanId,
          channel_id: session.channelId,
          mode: 2, // mode: 2 for channels/threads, 1 for DMs
          is_public: !session.threadId, // Public for channels, private for threads
          content: chunkContent,
        };

        // Add topic_id for thread messages
        if (session.threadId) {
          messageParams.topic_id = session.threadId;
        }

        console.log(`[MezonPlugin] Sending message chunk ${i + 1}/${chunks.length} with params:`, {
          clan_id: messageParams.clan_id,
          channel_id: messageParams.channel_id,
          mode: messageParams.mode,
          is_public: messageParams.is_public,
          topic_id: messageParams.topic_id,
        });

        const result = await socketMgr.writeChatMessage(messageParams);
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

    // Look up session context
    const session = this.chatSessions.get(chatId);

    if (!session) {
      console.warn(`[MezonPlugin] editMessage: No session found for chatId=${chatId}`);
      throw new Error(`No session found for chatId=${chatId}`);
    }

    try {
      const socketMgr = (this.client as any).socketManager;

      const updateParams: any = {
        clan_id: session.clanId,
        channel_id: session.channelId,
        mode: 2,
        is_public: !session.threadId,
        message_id: messageId,
        content: { t: truncatedText },
      };

      // Add topic_id for thread messages
      if (session.threadId) {
        updateParams.topic_id = session.threadId;
      }

      await socketMgr.updateChatMessage(updateParams);
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

      // Deduplicate messages by ID
      const messageId = msg.id;
      if (!messageId) {
        console.warn('[MezonPlugin] Message without ID, skipping deduplication');
      } else if (this.processedMessages.has(messageId)) {
        console.log(`[MezonPlugin] Duplicate message detected: ${messageId}, skipping`);
        return;
      } else {
        // Add to processed set
        this.processedMessages.add(messageId);

        // Limit cache size to prevent memory bloat
        if (this.processedMessages.size > this.MESSAGE_CACHE_SIZE) {
          // Remove oldest entries (convert to array, remove first element, recreate set)
          const entries = Array.from(this.processedMessages);
          this.processedMessages = new Set(entries.slice(-this.MESSAGE_CACHE_SIZE));
        }
      }

      // Track user
      this.activeUsers.add(userId);

      // Extract session context from message
      const threadId = msg.topic_id;
      const channelId = msg.channel_id;
      const clanId = msg.clan_id;
      const userName = msg.username || 'User';

      // Check if bot is mentioned or user has active session
      const mentioned = this.isBotMentioned(msg);
      const hasSession = this.hasActiveSession(threadId, channelId, userId);

      // Only respond when mentioned OR when user has an active session
      if (!mentioned && !hasSession) {
        console.log('[MezonPlugin] Bot not mentioned and no active session, ignoring');
        return;
      }

      if (hasSession && !mentioned) {
        console.log('[MezonPlugin] 💬 Continuing active conversation');
      }

      // Get or create session for this conversation context
      const session = this.getChatSession(threadId, channelId, clanId, userId, userName);
      session.messageCount++;

      // Convert to unified message and forward to handler
      const text = msg.content?.t || '';
      const currentPluginId = this.config?.id;
      const unifiedMessage = toUnifiedIncomingMessage(msg, this.botUserId, currentPluginId);
      if (unifiedMessage && this.messageHandler) {
        // Use session ID as chatId so replies go to the same context
        unifiedMessage.chatId = session.sessionId;

        console.log(`[MezonPlugin] Forwarding message to handler (session: ${session.sessionId.slice(0, 12)}..., ${mentioned ? 'mentioned' : 'active session'})`);
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

      // Add timeout to prevent hanging forever (10 seconds)
      const timeoutPromise = new Promise<never>((_resolve, reject) => {
        setTimeout(() => reject(new Error('Connection timeout (10s)')), 10000);
      });

      const userId = await Promise.race([client.login(), timeoutPromise]);

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
