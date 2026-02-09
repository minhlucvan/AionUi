/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Mezon MCP Server - Exposes Mezon operations as MCP tools
 *
 * This MCP server connects to Mezon via the mezon-sdk and provides tools
 * for reading, writing, and searching messages in Mezon channels and threads.
 *
 * Environment variables:
 *   MEZON_BOT_TOKEN - Bot authentication token
 *   MEZON_BOT_ID    - Bot identifier
 *
 * Usage (stdio transport):
 *   MEZON_BOT_TOKEN=xxx MEZON_BOT_ID=yyy npx ts-node src/mcp-servers/mezon/index.ts
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { MezonToolProvider } from './provider';

// ==================== Server Setup ====================

const server = new McpServer({
  name: 'mezon',
  version: '1.0.0',
});

let provider: MezonToolProvider | null = null;

async function getProvider(): Promise<MezonToolProvider> {
  if (provider && provider.isConnected()) {
    return provider;
  }

  const token = process.env.MEZON_BOT_TOKEN;
  const botId = process.env.MEZON_BOT_ID;

  if (!token || !botId) {
    throw new Error(
      'Missing required environment variables: MEZON_BOT_TOKEN and MEZON_BOT_ID must be set'
    );
  }

  provider = new MezonToolProvider({ token, botId });
  await provider.connect();
  return provider;
}

// ==================== Tool Definitions ====================

/**
 * mezon_read_messages - Read recent messages from a Mezon channel or thread
 */
server.tool(
  'mezon_read_messages',
  'Read recent messages from a Mezon channel or thread. Returns cached messages that have been received since the bot connected. Use this to review conversation history, understand context, or summarize discussions.',
  {
    channel_id: z.string().describe('The Mezon channel ID to read messages from'),
    thread_id: z.string().optional().describe('Optional thread/topic ID to read from a specific thread'),
    limit: z.number().optional().default(50).describe('Maximum number of messages to return (default: 50)'),
    before_timestamp: z
      .number()
      .optional()
      .describe('Only return messages before this Unix timestamp (ms)'),
    after_timestamp: z
      .number()
      .optional()
      .describe('Only return messages after this Unix timestamp (ms)'),
  },
  async ({ channel_id, thread_id, limit, before_timestamp, after_timestamp }) => {
    const p = await getProvider();
    const messages = p.readMessages({
      channelId: channel_id,
      threadId: thread_id,
      limit,
      beforeTimestamp: before_timestamp,
      afterTimestamp: after_timestamp,
    });

    if (messages.length === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `No messages found in channel ${channel_id}${thread_id ? ` thread ${thread_id}` : ''}. The bot may not have received messages in this channel yet, or no messages match the filters.`,
          },
        ],
      };
    }

    const formatted = messages.map((m) => {
      const time = new Date(m.timestamp).toISOString();
      const attachInfo =
        m.attachments && m.attachments.length > 0
          ? ` [${m.attachments.length} attachment(s)]`
          : '';
      return `[${time}] ${m.senderName}: ${m.text}${attachInfo}`;
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Found ${messages.length} message(s) in channel ${channel_id}${thread_id ? ` thread ${thread_id}` : ''}:\n\n${formatted.join('\n')}`,
        },
      ],
    };
  }
);

/**
 * mezon_send_message - Send a message to a Mezon channel or thread
 */
server.tool(
  'mezon_send_message',
  'Send a text message to a Mezon channel or thread. Can also reply to a specific message. Use this to post summaries, respond to discussions, or share information.',
  {
    channel_id: z.string().describe('The Mezon channel ID to send the message to'),
    clan_id: z.string().describe('The Mezon clan/organization ID'),
    text: z.string().describe('The message text to send (max 4000 characters)'),
    thread_id: z
      .string()
      .optional()
      .describe('Optional thread/topic ID to send to a specific thread'),
    reply_to_message_id: z
      .string()
      .optional()
      .describe('Optional message ID to reply to (creates a threaded reply)'),
  },
  async ({ channel_id, clan_id, text, thread_id, reply_to_message_id }) => {
    const p = await getProvider();
    const result = await p.sendMessage({
      channelId: channel_id,
      clanId: clan_id,
      text,
      threadId: thread_id,
      replyToMessageId: reply_to_message_id,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Message sent successfully. Message ID: ${result.messageId}, Channel: ${result.channelId}${result.threadId ? `, Thread: ${result.threadId}` : ''}`,
        },
      ],
    };
  }
);

/**
 * mezon_search_messages - Search messages by text content
 */
server.tool(
  'mezon_search_messages',
  'Search cached messages by text content across all channels or within a specific channel. Use this to find specific discussions, topics, or mentions.',
  {
    query: z.string().describe('Search query text (case-insensitive substring match)'),
    channel_id: z
      .string()
      .optional()
      .describe('Optional channel ID to limit search to a specific channel'),
    limit: z.number().optional().default(20).describe('Maximum number of results (default: 20)'),
  },
  async ({ query, channel_id, limit }) => {
    const p = await getProvider();
    const results = p.searchMessages({
      query,
      channelId: channel_id,
      limit,
    });

    if (results.length === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `No messages found matching "${query}"${channel_id ? ` in channel ${channel_id}` : ''}.`,
          },
        ],
      };
    }

    const formatted = results.map((m) => {
      const time = new Date(m.timestamp).toISOString();
      return `[${time}] [channel:${m.channelId}${m.threadId ? ` thread:${m.threadId}` : ''}] ${m.senderName}: ${m.text}`;
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Found ${results.length} message(s) matching "${query}":\n\n${formatted.join('\n')}`,
        },
      ],
    };
  }
);

/**
 * mezon_channel_summary - Get a summary of channel activity
 */
server.tool(
  'mezon_channel_summary',
  'Get a summary of a channel or thread conversation including participant list, message count, time range, and all cached messages. Use this to quickly understand what has been discussed.',
  {
    channel_id: z.string().describe('The Mezon channel ID to summarize'),
    thread_id: z
      .string()
      .optional()
      .describe('Optional thread/topic ID to summarize a specific thread'),
  },
  async ({ channel_id, thread_id }) => {
    const p = await getProvider();
    const summary = p.getChannelSummary(channel_id, thread_id);

    if (!summary) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `No data available for channel ${channel_id}${thread_id ? ` thread ${thread_id}` : ''}. The bot may not have received messages in this channel yet.`,
          },
        ],
      };
    }

    const fromTime = new Date(summary.timeRange.from).toISOString();
    const toTime = new Date(summary.timeRange.to).toISOString();

    const messageTexts = summary.messages.map((m) => {
      const time = new Date(m.timestamp).toISOString();
      return `[${time}] ${m.senderName}: ${m.text}`;
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: [
            `Channel Summary for ${channel_id}${thread_id ? ` (thread: ${thread_id})` : ''}`,
            ``,
            `Messages: ${summary.messageCount}`,
            `Participants: ${summary.participants.join(', ')}`,
            `Time Range: ${fromTime} to ${toTime}`,
            ``,
            `--- Messages ---`,
            ...messageTexts,
          ].join('\n'),
        },
      ],
    };
  }
);

/**
 * mezon_list_channels - List all channels with cached activity
 */
server.tool(
  'mezon_list_channels',
  'List all Mezon channels that have had message activity since the bot connected. Shows channel IDs, clan IDs, last message timestamps, and message counts.',
  {},
  async () => {
    const p = await getProvider();
    const channels = p.listChannels();

    if (channels.length === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'No channels with activity found. The bot may not have received any messages yet.',
          },
        ],
      };
    }

    const formatted = channels.map((ch) => {
      const lastMsg = ch.lastMessageAt ? new Date(ch.lastMessageAt).toISOString() : 'unknown';
      return `- Channel: ${ch.id} | Clan: ${ch.clanId} | Messages: ${ch.messageCount} | Last: ${lastMsg}`;
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Active channels (${channels.length}):\n\n${formatted.join('\n')}`,
        },
      ],
    };
  }
);

/**
 * mezon_status - Get the connection status and cache statistics
 */
server.tool(
  'mezon_status',
  'Get the current Mezon bot connection status and message cache statistics. Use this to verify the bot is connected and see how much data is available.',
  {},
  async () => {
    const p = await getProvider();
    const stats = p.getStats();

    return {
      content: [
        {
          type: 'text' as const,
          text: [
            `Mezon Bot Status`,
            ``,
            `Connected: ${stats.connected}`,
            `Bot ID: ${stats.botId}`,
            `Cached Channels: ${stats.channelCount}`,
            `Cached Messages: ${stats.totalMessages}`,
          ].join('\n'),
        },
      ],
    };
  }
);

// ==================== Start Server ====================

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MezonMcpServer] Server started on stdio transport');

  // Attempt to connect to Mezon eagerly if credentials are available
  if (process.env.MEZON_BOT_TOKEN && process.env.MEZON_BOT_ID) {
    try {
      await getProvider();
      console.error('[MezonMcpServer] Connected to Mezon successfully');
    } catch (err) {
      console.error('[MezonMcpServer] Failed to connect to Mezon on startup:', err);
      // Server still starts - tools will attempt to connect on first use
    }
  }
}

main().catch((err) => {
  console.error('[MezonMcpServer] Fatal error:', err);
  process.exit(1);
});
