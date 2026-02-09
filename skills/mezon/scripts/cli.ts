#!/usr/bin/env node
/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Mezon CLI - Run Mezon tools as standalone commands
 *
 * Environment variables:
 *   MEZON_BOT_TOKEN  - Bot authentication token (required)
 *   MEZON_BOT_ID     - Bot identifier (required)
 *
 * Usage:
 *   npx ts-node skills/mezon/scripts/cli.ts <command> [options]
 *
 * Commands:
 *   status              Show bot connection status and cache stats
 *   list-channels       List channels with message activity
 *   read-messages       Read messages from a channel/thread
 *   send-message        Send a message to a channel/thread
 *   search              Search messages by text
 *   summary             Get channel conversation summary
 *   help                Show this help text
 */

import { MezonToolProvider } from './provider';

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

function showHelp(): void {
  const help = `
mezon-cli - Mezon tools for AI agents

USAGE:
  npx ts-node skills/mezon/scripts/cli.ts <command> [options]

ENVIRONMENT:
  MEZON_BOT_TOKEN    Bot authentication token (required)
  MEZON_BOT_ID       Bot identifier (required)

COMMANDS:
  status             Show bot connection status
  list-channels      List channels with activity
  read-messages      Read messages from a channel
  send-message       Send a message to a channel
  search             Search messages by text
  summary            Get channel conversation summary
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

OUTPUT:
  All commands output JSON to stdout.
  Status/progress messages go to stderr.
  Agent can parse stdout with JSON.parse().
`;
  process.stdout.write(help.trim() + '\n');
}

// ==================== Main ====================

async function main(): Promise<void> {
  const { command, flags } = parseArgs(process.argv);

  switch (command) {
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
