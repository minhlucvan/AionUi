/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ChannelMessage, ChannelMessageContent } from 'mezon-sdk';
import type { IUnifiedIncomingMessage, IUnifiedMessageContent, IUnifiedOutgoingMessage, IUnifiedUser } from '../../types';

/**
 * MezonAdapter - Converts between Mezon and Unified message formats
 *
 * Handles:
 * - Mezon ChannelMessage → UnifiedIncomingMessage
 * - UnifiedOutgoingMessage → Mezon message parameters
 * - User info extraction
 */

// ==================== Incoming Message Conversion ====================

/**
 * Convert a Mezon ChannelMessage to unified incoming message
 */
export function toUnifiedIncomingMessage(msg: ChannelMessage, botUserId: string, pluginId?: string): IUnifiedIncomingMessage | null {
  // Ignore messages from the bot itself
  if (msg.sender_id === botUserId) {
    return null;
  }

  const user = toUnifiedUser(msg);
  if (!user) return null;

  const content = extractMessageContent(msg);

  return {
    id: msg.message_id || msg.id,
    platform: 'mezon',
    pluginId,
    chatId: msg.channel_id,
    user,
    content,
    timestamp: msg.create_time_seconds ? msg.create_time_seconds * 1000 : Date.now(),
    raw: msg,
  };
}

/**
 * Convert Mezon message sender info to unified user format
 */
export function toUnifiedUser(msg: ChannelMessage): IUnifiedUser | null {
  if (!msg.sender_id) return null;

  const displayName = msg.display_name || msg.clan_nick || msg.username || `User ${msg.sender_id.slice(-6)}`;

  return {
    id: msg.sender_id,
    username: msg.username,
    displayName,
    avatarUrl: msg.avatar || msg.clan_avatar || undefined,
  };
}

/**
 * Extract message content from Mezon ChannelMessage
 */
function extractMessageContent(msg: ChannelMessage): IUnifiedMessageContent {
  const text = msg.content?.t || '';

  // Check for attachments
  if (msg.attachments && msg.attachments.length > 0) {
    const att = msg.attachments[0];
    const fileType = att.filetype || '';

    if (fileType.startsWith('image/')) {
      return {
        type: 'photo',
        text: text || '',
        attachments: msg.attachments.map((a) => ({
          type: 'photo' as const,
          fileId: a.url || '',
          fileName: a.filename,
          mimeType: a.filetype,
          size: a.size,
        })),
      };
    }

    if (fileType.startsWith('audio/')) {
      return {
        type: 'audio',
        text: text || '',
        attachments: msg.attachments.map((a) => ({
          type: 'audio' as const,
          fileId: a.url || '',
          fileName: a.filename,
          mimeType: a.filetype,
          size: a.size,
        })),
      };
    }

    if (fileType.startsWith('video/')) {
      return {
        type: 'video',
        text: text || '',
        attachments: msg.attachments.map((a) => ({
          type: 'video' as const,
          fileId: a.url || '',
          fileName: a.filename,
          mimeType: a.filetype,
          size: a.size,
        })),
      };
    }

    // Default to document for other file types
    return {
      type: 'document',
      text: text || '',
      attachments: msg.attachments.map((a) => ({
        type: 'document' as const,
        fileId: a.url || '',
        fileName: a.filename,
        mimeType: a.filetype,
        size: a.size,
      })),
    };
  }

  return {
    type: 'text',
    text,
  };
}

// ==================== Outgoing Message Conversion ====================

/**
 * Mezon message content limit (characters)
 */
export const MEZON_MESSAGE_LIMIT = 4000;

/**
 * Convert unified outgoing message to Mezon ChannelMessageContent
 */
export function toMezonSendParams(message: IUnifiedOutgoingMessage): ChannelMessageContent {
  return {
    t: message.text || '',
  };
}

/**
 * Split long text into chunks that fit Mezon's message limit
 */
export function splitMessage(text: string, maxLength: number = MEZON_MESSAGE_LIMIT): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Find a good split point (prefer newline, then space)
    let splitIndex = maxLength;

    // Look for newline within the last 20% of the chunk
    const newlineSearchStart = Math.floor(maxLength * 0.8);
    const lastNewline = remaining.lastIndexOf('\n', maxLength);
    if (lastNewline > newlineSearchStart) {
      splitIndex = lastNewline + 1;
    } else {
      // Look for space
      const lastSpace = remaining.lastIndexOf(' ', maxLength);
      if (lastSpace > newlineSearchStart) {
        splitIndex = lastSpace + 1;
      }
    }

    chunks.push(remaining.slice(0, splitIndex).trim());
    remaining = remaining.slice(splitIndex).trim();
  }

  return chunks;
}
