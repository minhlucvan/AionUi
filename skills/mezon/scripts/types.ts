/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Types for the Mezon MCP Tool Server
 */

/**
 * Cached message from Mezon channel
 */
export type CachedMessage = {
  id: string;
  channelId: string;
  clanId: string;
  threadId?: string;
  senderId: string;
  senderName: string;
  senderUsername?: string;
  text: string;
  timestamp: number;
  attachments?: CachedAttachment[];
  mentions?: CachedMention[];
};

export type CachedAttachment = {
  url: string;
  filename?: string;
  filetype: string;
  size?: number;
};

export type CachedMention = {
  userId: string;
  start: number;
  end: number;
};

/**
 * Tracked channel info
 */
export type TrackedChannel = {
  id: string;
  clanId: string;
  lastMessageAt?: number;
  messageCount: number;
};

/**
 * Configuration for the Mezon MCP server
 */
export type MezonMcpConfig = {
  token: string;
  botId: string;
};

/**
 * Result of sending a message
 */
export type SendMessageResult = {
  messageId: string;
  channelId: string;
  threadId?: string;
};

/**
 * Parameters for reading messages
 */
export type ReadMessagesParams = {
  channelId: string;
  threadId?: string;
  limit?: number;
  beforeTimestamp?: number;
  afterTimestamp?: number;
};

/**
 * Parameters for sending a message
 */
export type SendMessageParams = {
  channelId: string;
  clanId: string;
  threadId?: string;
  text: string;
  replyToMessageId?: string;
};

/**
 * Parameters for searching messages
 */
export type SearchMessagesParams = {
  query: string;
  channelId?: string;
  limit?: number;
};

/**
 * Summary result for conversation
 */
export type ChannelSummary = {
  channelId: string;
  threadId?: string;
  messageCount: number;
  participants: string[];
  timeRange: {
    from: number;
    to: number;
  };
  messages: CachedMessage[];
};
