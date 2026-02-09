/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * MezonMessageCache - In-memory cache for Mezon messages and channel info
 *
 * Since the Mezon SDK primarily provides real-time WebSocket events,
 * this cache captures and stores messages as they flow through,
 * enabling tools to query recent conversation history.
 */

import type { CachedMessage, TrackedChannel, ChannelSummary } from './types';

const DEFAULT_MAX_MESSAGES_PER_CHANNEL = 500;
const DEFAULT_MAX_CHANNELS = 100;

export class MezonMessageCache {
  /** channelId -> messages (sorted by timestamp ascending) */
  private messages = new Map<string, CachedMessage[]>();

  /** channelId -> channel info */
  private channels = new Map<string, TrackedChannel>();

  private maxMessagesPerChannel: number;
  private maxChannels: number;

  constructor(
    maxMessagesPerChannel = DEFAULT_MAX_MESSAGES_PER_CHANNEL,
    maxChannels = DEFAULT_MAX_CHANNELS
  ) {
    this.maxMessagesPerChannel = maxMessagesPerChannel;
    this.maxChannels = maxChannels;
  }

  /**
   * Add a message to the cache
   */
  addMessage(msg: CachedMessage): void {
    const key = msg.threadId || msg.channelId;

    // Initialize channel messages if needed
    if (!this.messages.has(key)) {
      // Evict oldest channel if at capacity
      if (this.messages.size >= this.maxChannels) {
        this.evictOldestChannel();
      }
      this.messages.set(key, []);
    }

    const channelMessages = this.messages.get(key)!;

    // Deduplicate by message ID
    if (channelMessages.some((m) => m.id === msg.id)) {
      return;
    }

    channelMessages.push(msg);

    // Sort by timestamp
    channelMessages.sort((a, b) => a.timestamp - b.timestamp);

    // Trim to max size
    if (channelMessages.length > this.maxMessagesPerChannel) {
      channelMessages.splice(0, channelMessages.length - this.maxMessagesPerChannel);
    }

    // Update channel tracking
    this.trackChannel(msg.channelId, msg.clanId, msg.timestamp);
  }

  /**
   * Get recent messages from a channel or thread
   */
  getMessages(
    channelId: string,
    options?: {
      threadId?: string;
      limit?: number;
      beforeTimestamp?: number;
      afterTimestamp?: number;
    }
  ): CachedMessage[] {
    const key = options?.threadId || channelId;
    const messages = this.messages.get(key) || [];

    let filtered = messages;

    if (options?.beforeTimestamp) {
      filtered = filtered.filter((m) => m.timestamp < options.beforeTimestamp!);
    }

    if (options?.afterTimestamp) {
      filtered = filtered.filter((m) => m.timestamp > options.afterTimestamp!);
    }

    const limit = options?.limit || 50;
    // Return latest messages (from the end)
    return filtered.slice(-limit);
  }

  /**
   * Search messages by text query across all or specific channels
   */
  searchMessages(query: string, channelId?: string, limit = 20): CachedMessage[] {
    const lowerQuery = query.toLowerCase();
    const results: CachedMessage[] = [];

    const channelsToSearch = channelId ? [channelId] : Array.from(this.messages.keys());

    for (const key of channelsToSearch) {
      const messages = this.messages.get(key) || [];
      for (const msg of messages) {
        if (msg.text.toLowerCase().includes(lowerQuery)) {
          results.push(msg);
        }
        if (results.length >= limit) break;
      }
      if (results.length >= limit) break;
    }

    // Sort by timestamp descending (most recent first)
    results.sort((a, b) => b.timestamp - a.timestamp);
    return results.slice(0, limit);
  }

  /**
   * Get a summary of a channel's recent activity
   */
  getChannelSummary(channelId: string, threadId?: string): ChannelSummary | null {
    const key = threadId || channelId;
    const messages = this.messages.get(key);

    if (!messages || messages.length === 0) {
      return null;
    }

    const participants = [...new Set(messages.map((m) => m.senderName))];
    const timestamps = messages.map((m) => m.timestamp);

    return {
      channelId,
      threadId,
      messageCount: messages.length,
      participants,
      timeRange: {
        from: Math.min(...timestamps),
        to: Math.max(...timestamps),
      },
      messages,
    };
  }

  /**
   * Get all tracked channels
   */
  getTrackedChannels(): TrackedChannel[] {
    return Array.from(this.channels.values());
  }

  /**
   * Get channel info
   */
  getChannel(channelId: string): TrackedChannel | undefined {
    return this.channels.get(channelId);
  }

  /**
   * Get cache stats
   */
  getStats(): { channelCount: number; totalMessages: number } {
    let totalMessages = 0;
    for (const messages of this.messages.values()) {
      totalMessages += messages.length;
    }
    return {
      channelCount: this.messages.size,
      totalMessages,
    };
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.messages.clear();
    this.channels.clear();
  }

  private trackChannel(channelId: string, clanId: string, timestamp: number): void {
    const existing = this.channels.get(channelId);
    if (existing) {
      existing.lastMessageAt = Math.max(existing.lastMessageAt || 0, timestamp);
      existing.messageCount++;
    } else {
      this.channels.set(channelId, {
        id: channelId,
        clanId,
        lastMessageAt: timestamp,
        messageCount: 1,
      });
    }
  }

  private evictOldestChannel(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, messages] of this.messages.entries()) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.timestamp < oldestTime) {
        oldestTime = lastMsg.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.messages.delete(oldestKey);
    }
  }
}
