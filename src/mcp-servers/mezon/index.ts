/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Mezon MCP Server - Module exports
 *
 * Two ways to run:
 *   1. CLI mode:  npx ts-node src/mcp-servers/mezon/cli.ts <command> [options]
 *   2. MCP mode:  npx ts-node src/mcp-servers/mezon/cli.ts serve
 *
 * See cli.ts for full usage details.
 */

export { MezonToolProvider } from './provider';
export { MezonMessageCache } from './cache';
export type {
  CachedMessage,
  CachedAttachment,
  CachedMention,
  TrackedChannel,
  MezonMcpConfig,
  SendMessageParams,
  SendMessageResult,
  ReadMessagesParams,
  SearchMessagesParams,
  ChannelSummary,
} from './types';
