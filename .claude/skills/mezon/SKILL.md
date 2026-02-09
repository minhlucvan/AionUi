---
name: mezon
description: |
  Mezon platform integration for reading and writing channel data.
  Use when: (1) Agent needs to read/summarize Mezon conversations, (2) Agent needs to send messages or reply to Mezon channels/threads, (3) Agent needs to search Mezon message history, (4) Agent needs to interact with Mezon as a productivity tool.
---

# Mezon Skill

Enables AI agents to interact with the Mezon platform as a power tool - reading conversations, summarizing discussions, sending messages, and replying to channels/threads.

## Overview

The Mezon MCP server (`src/mcp-servers/mezon/`) exposes Mezon operations as MCP tools that any AI agent can use. It connects to Mezon via `mezon-sdk`, caches messages in real-time via WebSocket, and provides tools for agents to query and interact with the data.

## Architecture

```
Agent (Claude, Gemini, Codex, etc.)
  ↓ MCP Protocol (stdio)
Mezon MCP Server
  ↓ WebSocket + SDK
Mezon Platform (channels, threads, DMs)
```

### Components

| Component | File | Purpose |
|-----------|------|---------|
| MCP Server | `src/mcp-servers/mezon/index.ts` | Entry point, tool definitions |
| Provider | `src/mcp-servers/mezon/provider.ts` | SDK wrapper, tool method implementations |
| Cache | `src/mcp-servers/mezon/cache.ts` | In-memory message/channel cache |
| Types | `src/mcp-servers/mezon/types.ts` | TypeScript type definitions |

## Available MCP Tools

### `mezon_read_messages`
Read recent messages from a channel or thread.

**Parameters:**
- `channel_id` (string, required) - Channel ID
- `thread_id` (string, optional) - Thread/topic ID
- `limit` (number, optional, default: 50) - Max messages
- `before_timestamp` (number, optional) - Filter before timestamp (ms)
- `after_timestamp` (number, optional) - Filter after timestamp (ms)

### `mezon_send_message`
Send a message to a channel or thread. Supports replies.

**Parameters:**
- `channel_id` (string, required) - Target channel ID
- `clan_id` (string, required) - Clan/organization ID
- `text` (string, required) - Message text (max 4000 chars)
- `thread_id` (string, optional) - Target thread ID
- `reply_to_message_id` (string, optional) - Message ID to reply to

### `mezon_search_messages`
Search cached messages by text content.

**Parameters:**
- `query` (string, required) - Search text (case-insensitive)
- `channel_id` (string, optional) - Limit to specific channel
- `limit` (number, optional, default: 20) - Max results

### `mezon_channel_summary`
Get a full summary of channel/thread activity.

**Parameters:**
- `channel_id` (string, required) - Channel ID
- `thread_id` (string, optional) - Thread ID

### `mezon_list_channels`
List all channels with message activity. No parameters.

### `mezon_status`
Get bot connection status and cache stats. No parameters.

## Setup

### 1. Register as MCP Server

Add the Mezon MCP server to your agent's MCP configuration:

**For Claude:**
```bash
claude mcp add mezon -- npx ts-node src/mcp-servers/mezon/index.ts
```

**Environment variables required:**
- `MEZON_BOT_TOKEN` - Bot authentication token
- `MEZON_BOT_ID` - Bot identifier

**MCP Server JSON config:**
```json
{
  "name": "mezon",
  "transport": {
    "type": "stdio",
    "command": "npx",
    "args": ["ts-node", "src/mcp-servers/mezon/index.ts"],
    "env": {
      "MEZON_BOT_TOKEN": "<your-bot-token>",
      "MEZON_BOT_ID": "<your-bot-id>"
    }
  }
}
```

### 2. Verify Connection

After registering, use `mezon_status` to verify the bot is connected.

## Usage Patterns

### Summarize a Channel Discussion
```
1. mezon_list_channels → find the target channel ID
2. mezon_channel_summary(channel_id) → get all messages and participants
3. Agent processes the messages and generates a summary
```

### Reply to a Discussion
```
1. mezon_read_messages(channel_id) → read recent context
2. Agent formulates a response
3. mezon_send_message(channel_id, clan_id, text) → post the response
```

### Search and Respond
```
1. mezon_search_messages(query) → find relevant messages
2. Agent analyzes search results
3. mezon_send_message(..., reply_to_message_id) → reply to specific message
```

### Monitor Multiple Channels
```
1. mezon_list_channels → see all active channels
2. For each channel: mezon_channel_summary → review activity
3. Agent prioritizes and responds as needed
```

## Limitations

- **Cache-based history**: Messages are cached from when the bot connects. Historical messages from before connection are not available.
- **Text-only sending**: Currently supports sending text messages only (no file uploads).
- **4000 char limit**: Mezon messages are limited to 4000 characters. Longer texts are truncated.
- **No channel management**: Cannot create/delete channels or threads (SDK limitation).
- **WebSocket-dependent**: Requires active WebSocket connection for message caching.

## Development

### Adding New Tools

1. Add parameter types to `src/mcp-servers/mezon/types.ts`
2. Add the implementation method to `src/mcp-servers/mezon/provider.ts`
3. Register the tool in `src/mcp-servers/mezon/index.ts` using `server.tool()`
4. Update this skill documentation

### Extending the Cache

The `MezonMessageCache` class in `cache.ts` can be extended with:
- Persistent storage (SQLite) for message history
- Channel metadata caching
- User profile caching
- Attachment content caching

### Future SDK Capabilities

When the Mezon SDK adds new APIs, the provider can be extended to support:
- Message history fetch (HTTP API)
- Channel/user listing
- Thread creation
- File uploads
- Reaction management
