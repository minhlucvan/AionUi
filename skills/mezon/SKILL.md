---
name: mezon
description: |
  Mezon platform integration for reading and writing channel data.
  Use when: (1) Agent needs to read/summarize Mezon conversations, (2) Agent needs to send messages or reply to Mezon channels/threads, (3) Agent needs to search Mezon message history, (4) Agent needs to interact with Mezon as a productivity tool.
---

# Mezon Skill

Enables AI agents to interact with the Mezon platform as a power tool - reading conversations, summarizing discussions, sending messages, and replying to channels/threads.

## Overview

The Mezon CLI (`skills/mezon/scripts/cli.ts`) provides one-shot commands via Node.js subprocess that agents can call directly.

## Architecture

```
Agent (Claude, Gemini, Codex, etc.)
  ↓ CLI (subprocess)
mezon-cli
  ↓ WebSocket + mezon-sdk
Mezon Platform (channels, threads, DMs)
```

### Components

| Component | File | Purpose |
|-----------|------|---------|
| CLI | `skills/mezon/scripts/cli.ts` | CLI entry point, command parsing, JSON output |
| Provider | `skills/mezon/scripts/provider.ts` | SDK wrapper, tool method implementations |
| Cache | `skills/mezon/scripts/cache.ts` | In-memory message/channel cache |
| Types | `skills/mezon/scripts/types.ts` | TypeScript type definitions |

## CLI Usage

### Environment Setup

```bash
export MEZON_BOT_TOKEN="<your-bot-token>"
export MEZON_BOT_ID="<your-bot-id>"
```

### Commands

All CLI commands output **JSON to stdout** (machine-readable). Status/progress goes to stderr.

```bash
# Check bot connection
npx ts-node skills/mezon/scripts/cli.ts status

# List channels with activity
npx ts-node skills/mezon/scripts/cli.ts list-channels

# Read last 20 messages from a channel
npx ts-node skills/mezon/scripts/cli.ts read-messages --channel-id abc123 --limit 20

# Read from a thread
npx ts-node skills/mezon/scripts/cli.ts read-messages --channel-id abc123 --thread-id thread456

# Send a message
npx ts-node skills/mezon/scripts/cli.ts send-message \
  --channel-id abc123 --clan-id clan456 --text "Hello!"

# Reply to a specific message
npx ts-node skills/mezon/scripts/cli.ts send-message \
  --channel-id abc123 --clan-id clan456 --text "Great point!" --reply-to msg789

# Search messages
npx ts-node skills/mezon/scripts/cli.ts search --query "deployment" --limit 10

# Get channel summary (participants, time range, all messages)
npx ts-node skills/mezon/scripts/cli.ts summary --channel-id abc123
```

### CLI Output Format

All commands return JSON with `ok: true` on success:

```json
{
  "ok": true,
  "channelId": "abc123",
  "count": 3,
  "messages": [
    {
      "id": "msg1",
      "channelId": "abc123",
      "senderId": "user1",
      "senderName": "Alice",
      "text": "Hello everyone",
      "timestamp": 1705312200000
    }
  ]
}
```

## CLI Command Reference

| Command | Required Flags | Optional Flags |
|---------|---------------|----------------|
| `status` | - | - |
| `list-channels` | - | - |
| `read-messages` | `--channel-id` | `--thread-id`, `--limit`, `--before`, `--after`, `--wait` |
| `send-message` | `--channel-id`, `--clan-id`, `--text` | `--thread-id`, `--reply-to` |
| `search` | `--query` | `--channel-id`, `--limit`, `--wait` |
| `summary` | `--channel-id` | `--thread-id`, `--wait` |

The `--wait` flag (default: 3000ms) controls how long the CLI listens for messages before returning results. Increase for channels with less frequent traffic.

## Usage Patterns

### Summarize a Channel Discussion
```
1. mezon-cli list-channels             → find the target channel ID + clan ID
2. mezon-cli summary --channel-id xxx  → get all messages and participants
3. Agent processes messages and generates a summary
4. mezon-cli send-message ...          → post summary back to channel
```

### Reply to a Discussion
```
1. mezon-cli read-messages --channel-id xxx  → read recent context
2. Agent formulates a response
3. mezon-cli send-message --reply-to yyy ... → reply to specific message
```

### Search and Respond
```
1. mezon-cli search --query "topic"    → find relevant messages
2. Agent analyzes search results
3. mezon-cli send-message ...          → respond in channel
```

## Limitations

- **Cache-based history**: Messages are cached from when the bot connects. Historical messages from before connection are not available.
- **Text-only sending**: Currently supports sending text messages only (no file uploads).
- **4000 char limit**: Mezon messages are limited to 4000 characters. Longer texts are truncated.
- **No channel management**: Cannot create/delete channels or threads (SDK limitation).
- **WebSocket-dependent**: CLI commands connect, wait briefly to collect messages, then disconnect.

## Development

### Adding New CLI Commands

1. Add the command function in `skills/mezon/scripts/cli.ts`
2. Add the case to the `switch` in `main()`
3. Update `showHelp()` with usage info
4. Update this skill documentation

### Adding New Provider Methods

1. Add parameter/result types to `skills/mezon/scripts/types.ts`
2. Add the method to `skills/mezon/scripts/provider.ts`
3. Expose via CLI command
