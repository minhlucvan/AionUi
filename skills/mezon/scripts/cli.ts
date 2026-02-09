#!/usr/bin/env node
/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Mezon CLI - Run Mezon tools as standalone commands or as an MCP server
 *
 * Modes:
 *   1. CLI mode  - One-shot commands: `mezon-cli read-messages --channel-id xxx`
 *   2. MCP mode  - Long-running stdio server: `mezon-cli serve`
 *
 * Environment variables:
 *   MEZON_BOT_TOKEN  - Bot authentication token (required)
 *   MEZON_BOT_ID     - Bot identifier (required)
 *
 * Usage:
 *   npx ts-node skills/mezon/scripts/cli.ts <command> [options]
 *
 * Commands:
 *   serve               Start as MCP stdio server (long-running)
 *   status              Show bot connection status and cache stats
 *   list-channels       List channels with message activity
 *   read-messages       Read messages from a channel/thread
 *   send-message        Send a message to a channel/thread
 *   search              Search messages by text
 *   summary             Get channel conversation summary
 *   listen              Connect and print messages in real-time
 *   help                Show this help text
 */

import { MezonToolProvider } from '../provider';

// ==================== Argument Parsing ====================

type ParsedArgs = {
  command: string;
  flags: Record<string, string>;
};

function parseArgs(argv: string[]): ParsedArgs {
  // Skip node and script path
  const args = argv.slice(2);
  const command = args[0] || 'help';
  const flags: Record<string, string> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const eqIndex = key.indexOf('=');
      if (eqIndex !== -1) {
        flags[key.slice(0, eqIndex)] = key.slice(eqIndex + 1);
      } else if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        flags[key] = args[++i];
      } else {
        flags[key] = 'true';
      }
    }
  }

  return { command, flags };
}

// ==================== Output Helpers ====================

function output(data: unknown): void {
  const json = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  process.stdout.write(json + '\n');
}

function errorExit(message: string, code = 1): never {
  process.stderr.write(`Error: ${message}\n`);
  process.exit(code);
}

// ==================== Provider Factory ====================

function getCredentials(): { token: string; botId: string } {
  const token = process.env.MEZON_BOT_TOKEN;
  const botId = process.env.MEZON_BOT_ID;

  if (!token) {
    errorExit('MEZON_BOT_TOKEN environment variable is required');
  }
  if (!botId) {
    errorExit('MEZON_BOT_ID environment variable is required');
  }

  return { token, botId };
}

async function createProvider(): Promise<MezonToolProvider> {
  const { token, botId } = getCredentials();
  const provider = new MezonToolProvider({ token, botId });
  await provider.connect();
  return provider;
}

// ==================== Commands ====================

async function cmdStatus(): Promise<void> {
  const provider = await createProvider();
  const stats = provider.getStats();
  output({
    ok: true,
    connected: stats.connected,
    botId: stats.botId,
    cachedChannels: stats.channelCount,
    cachedMessages: stats.totalMessages,
  });
  provider.disconnect();
}

async function cmdListChannels(): Promise<void> {
  const provider = await createProvider();

  // Give a moment to receive any pending messages
  const wait = 2000;
  process.stderr.write(`Listening for ${wait}ms to collect channel data...\n`);
  await new Promise((r) => setTimeout(r, wait));

  const channels = provider.listChannels();
  output({
    ok: true,
    channels,
  });
  provider.disconnect();
}

async function cmdReadMessages(flags: Record<string, string>): Promise<void> {
  const channelId = flags['channel-id'];
  if (!channelId) {
    errorExit('--channel-id is required');
  }

  const provider = await createProvider();

  // Wait to collect messages
  const wait = parseInt(flags['wait'] || '3000', 10);
  process.stderr.write(`Listening for ${wait}ms to collect messages...\n`);
  await new Promise((r) => setTimeout(r, wait));

  const messages = provider.readMessages({
    channelId,
    threadId: flags['thread-id'],
    limit: flags['limit'] ? parseInt(flags['limit'], 10) : 50,
    beforeTimestamp: flags['before'] ? parseInt(flags['before'], 10) : undefined,
    afterTimestamp: flags['after'] ? parseInt(flags['after'], 10) : undefined,
  });

  output({
    ok: true,
    channelId,
    threadId: flags['thread-id'] || null,
    count: messages.length,
    messages,
  });
  provider.disconnect();
}

async function cmdSendMessage(flags: Record<string, string>): Promise<void> {
  const channelId = flags['channel-id'];
  const clanId = flags['clan-id'];
  const text = flags['text'];

  if (!channelId) errorExit('--channel-id is required');
  if (!clanId) errorExit('--clan-id is required');
  if (!text) errorExit('--text is required');

  const provider = await createProvider();

  const result = await provider.sendMessage({
    channelId,
    clanId,
    text,
    threadId: flags['thread-id'],
    replyToMessageId: flags['reply-to'],
  });

  output({
    ok: true,
    ...result,
  });
  provider.disconnect();
}

async function cmdSearch(flags: Record<string, string>): Promise<void> {
  const query = flags['query'] || flags['q'];
  if (!query) {
    errorExit('--query (or --q) is required');
  }

  const provider = await createProvider();

  // Wait to collect messages
  const wait = parseInt(flags['wait'] || '3000', 10);
  process.stderr.write(`Listening for ${wait}ms to collect messages...\n`);
  await new Promise((r) => setTimeout(r, wait));

  const results = provider.searchMessages({
    query,
    channelId: flags['channel-id'],
    limit: flags['limit'] ? parseInt(flags['limit'], 10) : 20,
  });

  output({
    ok: true,
    query,
    count: results.length,
    messages: results,
  });
  provider.disconnect();
}

async function cmdSummary(flags: Record<string, string>): Promise<void> {
  const channelId = flags['channel-id'];
  if (!channelId) {
    errorExit('--channel-id is required');
  }

  const provider = await createProvider();

  // Wait to collect messages
  const wait = parseInt(flags['wait'] || '3000', 10);
  process.stderr.write(`Listening for ${wait}ms to collect messages...\n`);
  await new Promise((r) => setTimeout(r, wait));

  const summary = provider.getChannelSummary(channelId, flags['thread-id']);

  if (!summary) {
    output({
      ok: true,
      channelId,
      summary: null,
      message: 'No messages found for this channel',
    });
  } else {
    output({
      ok: true,
      channelId,
      threadId: flags['thread-id'] || null,
      messageCount: summary.messageCount,
      participants: summary.participants,
      timeRange: summary.timeRange,
      messages: summary.messages,
    });
  }
  provider.disconnect();
}

async function cmdListen(flags: Record<string, string>): Promise<void> {
  const provider = await createProvider();

  const channelFilter = flags['channel-id'];
  process.stderr.write(
    `Listening for messages${channelFilter ? ` in channel ${channelFilter}` : ''}... (Ctrl+C to stop)\n`
  );

  // Poll the cache for new messages
  let lastCount = 0;
  const interval = setInterval(() => {
    const stats = provider.getStats();
    if (stats.totalMessages > lastCount) {
      // Read latest messages
      const channels = provider.listChannels();
      for (const ch of channels) {
        if (channelFilter && ch.id !== channelFilter) continue;
        const messages = provider.readMessages({
          channelId: ch.id,
          limit: stats.totalMessages - lastCount,
        });
        for (const msg of messages) {
          if (msg.timestamp > Date.now() - 2000) {
            // Recent messages only
            const time = new Date(msg.timestamp).toISOString();
            process.stdout.write(
              JSON.stringify({
                time,
                channel: msg.channelId,
                thread: msg.threadId || null,
                sender: msg.senderName,
                text: msg.text,
              }) + '\n'
            );
          }
        }
      }
      lastCount = stats.totalMessages;
    }
  }, 500);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    clearInterval(interval);
    provider.disconnect();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    clearInterval(interval);
    provider.disconnect();
    process.exit(0);
  });
}

async function cmdServe(): Promise<void> {
  // Dynamically import to avoid loading MCP SDK for CLI commands
  const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  const { z } = await import('zod');

  const server = new McpServer({ name: 'mezon', version: '1.0.0' });

  let provider: MezonToolProvider | null = null;

  async function getProvider(): Promise<MezonToolProvider> {
    if (provider && provider.isConnected()) return provider;
    const { token, botId } = getCredentials();
    provider = new MezonToolProvider({ token, botId });
    await provider.connect();
    return provider;
  }

  // Register all tools (same as index.ts but using dynamic imports)
  server.tool(
    'mezon_read_messages',
    'Read recent messages from a Mezon channel or thread.',
    {
      channel_id: z.string().describe('The Mezon channel ID'),
      thread_id: z.string().optional().describe('Optional thread/topic ID'),
      limit: z.number().optional().default(50).describe('Max messages (default: 50)'),
      before_timestamp: z.number().optional().describe('Before this Unix timestamp (ms)'),
      after_timestamp: z.number().optional().describe('After this Unix timestamp (ms)'),
    },
    async ({ channel_id, thread_id, limit, before_timestamp, after_timestamp }: any) => {
      const p = await getProvider();
      const messages = p.readMessages({
        channelId: channel_id,
        threadId: thread_id,
        limit,
        beforeTimestamp: before_timestamp,
        afterTimestamp: after_timestamp,
      });
      if (messages.length === 0) {
        return { content: [{ type: 'text' as const, text: `No messages found in channel ${channel_id}${thread_id ? ` thread ${thread_id}` : ''}.` }] };
      }
      const formatted = messages.map((m) => {
        const time = new Date(m.timestamp).toISOString();
        const att = m.attachments?.length ? ` [${m.attachments.length} attachment(s)]` : '';
        return `[${time}] ${m.senderName}: ${m.text}${att}`;
      });
      return { content: [{ type: 'text' as const, text: `Found ${messages.length} message(s):\n\n${formatted.join('\n')}` }] };
    }
  );

  server.tool(
    'mezon_send_message',
    'Send a text message to a Mezon channel or thread.',
    {
      channel_id: z.string().describe('Target channel ID'),
      clan_id: z.string().describe('Clan/organization ID'),
      text: z.string().describe('Message text (max 4000 chars)'),
      thread_id: z.string().optional().describe('Optional thread ID'),
      reply_to_message_id: z.string().optional().describe('Optional message ID to reply to'),
    },
    async ({ channel_id, clan_id, text, thread_id, reply_to_message_id }: any) => {
      const p = await getProvider();
      const result = await p.sendMessage({ channelId: channel_id, clanId: clan_id, text, threadId: thread_id, replyToMessageId: reply_to_message_id });
      return { content: [{ type: 'text' as const, text: `Message sent. ID: ${result.messageId}, Channel: ${result.channelId}${result.threadId ? `, Thread: ${result.threadId}` : ''}` }] };
    }
  );

  server.tool(
    'mezon_search_messages',
    'Search cached messages by text content.',
    {
      query: z.string().describe('Search text (case-insensitive)'),
      channel_id: z.string().optional().describe('Limit to specific channel'),
      limit: z.number().optional().default(20).describe('Max results (default: 20)'),
    },
    async ({ query, channel_id, limit }: any) => {
      const p = await getProvider();
      const results = p.searchMessages({ query, channelId: channel_id, limit });
      if (results.length === 0) {
        return { content: [{ type: 'text' as const, text: `No messages matching "${query}".` }] };
      }
      const formatted = results.map((m) => {
        const time = new Date(m.timestamp).toISOString();
        return `[${time}] [ch:${m.channelId}${m.threadId ? ` t:${m.threadId}` : ''}] ${m.senderName}: ${m.text}`;
      });
      return { content: [{ type: 'text' as const, text: `Found ${results.length} result(s):\n\n${formatted.join('\n')}` }] };
    }
  );

  server.tool(
    'mezon_channel_summary',
    'Get channel/thread conversation summary.',
    {
      channel_id: z.string().describe('Channel ID to summarize'),
      thread_id: z.string().optional().describe('Optional thread ID'),
    },
    async ({ channel_id, thread_id }: any) => {
      const p = await getProvider();
      const summary = p.getChannelSummary(channel_id, thread_id);
      if (!summary) {
        return { content: [{ type: 'text' as const, text: `No data for channel ${channel_id}.` }] };
      }
      const msgs = summary.messages.map((m) => `[${new Date(m.timestamp).toISOString()}] ${m.senderName}: ${m.text}`);
      return {
        content: [{
          type: 'text' as const,
          text: `Channel: ${channel_id}${thread_id ? ` (thread: ${thread_id})` : ''}\nMessages: ${summary.messageCount}\nParticipants: ${summary.participants.join(', ')}\nRange: ${new Date(summary.timeRange.from).toISOString()} to ${new Date(summary.timeRange.to).toISOString()}\n\n${msgs.join('\n')}`,
        }],
      };
    }
  );

  server.tool('mezon_list_channels', 'List channels with message activity.', {}, async () => {
    const p = await getProvider();
    const channels = p.listChannels();
    if (channels.length === 0) {
      return { content: [{ type: 'text' as const, text: 'No active channels.' }] };
    }
    const lines = channels.map((ch) => `- ${ch.id} | Clan: ${ch.clanId} | Msgs: ${ch.messageCount} | Last: ${ch.lastMessageAt ? new Date(ch.lastMessageAt).toISOString() : 'n/a'}`);
    return { content: [{ type: 'text' as const, text: `Channels (${channels.length}):\n${lines.join('\n')}` }] };
  });

  server.tool('mezon_status', 'Get connection status and cache stats.', {}, async () => {
    const p = await getProvider();
    const s = p.getStats();
    return { content: [{ type: 'text' as const, text: `Connected: ${s.connected}\nBot: ${s.botId}\nChannels: ${s.channelCount}\nMessages: ${s.totalMessages}` }] };
  });

  // Start MCP server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('[mezon-cli] MCP server started on stdio\n');

  if (process.env.MEZON_BOT_TOKEN && process.env.MEZON_BOT_ID) {
    try {
      await getProvider();
      process.stderr.write('[mezon-cli] Connected to Mezon\n');
    } catch (err) {
      process.stderr.write(`[mezon-cli] Mezon connection deferred: ${err}\n`);
    }
  }
}

function showHelp(): void {
  const help = `
mezon-cli - Mezon tools for AI agents

USAGE:
  npx ts-node skills/mezon/scripts/cli.ts <command> [options]

ENVIRONMENT:
  MEZON_BOT_TOKEN    Bot authentication token (required)
  MEZON_BOT_ID       Bot identifier (required)

COMMANDS:
  serve              Start as MCP stdio server (for MCP-compatible agents)
  status             Show bot connection status
  list-channels      List channels with activity
  read-messages      Read messages from a channel
  send-message       Send a message to a channel
  search             Search messages by text
  summary            Get channel conversation summary
  listen             Stream messages in real-time (long-running)
  help               Show this help

OPTIONS (read-messages):
  --channel-id ID    Channel ID (required)
  --thread-id ID     Thread/topic ID (optional)
  --limit N          Max messages, default 50
  --before TS        Before Unix timestamp (ms)
  --after TS         After Unix timestamp (ms)
  --wait MS          Listen duration in ms, default 3000

OPTIONS (send-message):
  --channel-id ID    Target channel ID (required)
  --clan-id ID       Clan/organization ID (required)
  --text "msg"       Message text (required)
  --thread-id ID     Thread ID (optional)
  --reply-to ID      Reply to message ID (optional)

OPTIONS (search):
  --query "text"     Search query (required)
  --channel-id ID    Limit to channel (optional)
  --limit N          Max results, default 20
  --wait MS          Listen duration in ms, default 3000

OPTIONS (summary):
  --channel-id ID    Channel ID (required)
  --thread-id ID     Thread ID (optional)
  --wait MS          Listen duration in ms, default 3000

OPTIONS (listen):
  --channel-id ID    Filter to specific channel (optional)

EXAMPLES:
  # Check bot status
  mezon-cli status

  # Read last 20 messages from a channel
  mezon-cli read-messages --channel-id abc123 --limit 20

  # Send a message
  mezon-cli send-message --channel-id abc123 --clan-id clan456 --text "Hello!"

  # Reply to a specific message
  mezon-cli send-message --channel-id abc123 --clan-id clan456 \\
    --text "Great point!" --reply-to msg789

  # Search for keyword
  mezon-cli search --query "deployment" --limit 10

  # Get channel summary
  mezon-cli summary --channel-id abc123

  # Stream messages in real-time
  mezon-cli listen

  # Start as MCP server
  mezon-cli serve

OUTPUT:
  All commands (except serve/listen) output JSON to stdout.
  Status/progress messages go to stderr.
  Agent can parse stdout with JSON.parse().
`;
  process.stdout.write(help.trim() + '\n');
}

// ==================== Main ====================

async function main(): Promise<void> {
  const { command, flags } = parseArgs(process.argv);

  switch (command) {
    case 'serve':
    case 'mcp':
      await cmdServe();
      break;
    case 'status':
      await cmdStatus();
      break;
    case 'list-channels':
    case 'channels':
      await cmdListChannels();
      break;
    case 'read-messages':
    case 'read':
      await cmdReadMessages(flags);
      break;
    case 'send-message':
    case 'send':
      await cmdSendMessage(flags);
      break;
    case 'search':
      await cmdSearch(flags);
      break;
    case 'summary':
      await cmdSummary(flags);
      break;
    case 'listen':
    case 'watch':
      await cmdListen(flags);
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      process.stderr.write(`Unknown command: ${command}\n\n`);
      showHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err?.message || err}\n`);
  process.exit(1);
});
