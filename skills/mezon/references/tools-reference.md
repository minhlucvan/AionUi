# Mezon MCP Tools - Detailed Reference

## Tool Specifications

### mezon_read_messages

**Purpose:** Read recent messages from a Mezon channel or thread.

**When to use:**
- Reviewing recent conversation in a channel before responding
- Getting context for summarization
- Checking what was discussed in a thread

**Input Schema:**
```json
{
  "channel_id": "string (required) - Mezon channel ID",
  "thread_id": "string (optional) - Thread/topic ID for thread-specific messages",
  "limit": "number (optional, default: 50) - Max messages to return (1-500)",
  "before_timestamp": "number (optional) - Unix timestamp in ms, only messages before this time",
  "after_timestamp": "number (optional) - Unix timestamp in ms, only messages after this time"
}
```

**Output Format:**
```
Found N message(s) in channel <id>:

[2025-01-15T10:30:00.000Z] Alice: Hello everyone
[2025-01-15T10:30:05.000Z] Bob: Hi Alice! [1 attachment(s)]
[2025-01-15T10:30:10.000Z] Charlie: Good morning
```

**Notes:**
- Messages are sorted chronologically (oldest first)
- Attachment presence is indicated but content is not included
- Returns from the in-memory cache only (messages received since bot connection)

---

### mezon_send_message

**Purpose:** Send a text message to a Mezon channel, thread, or as a reply.

**When to use:**
- Posting a summary to a channel
- Responding to a user's question
- Sharing analysis results
- Creating threaded replies

**Input Schema:**
```json
{
  "channel_id": "string (required) - Target channel ID",
  "clan_id": "string (required) - Clan/organization ID (get from mezon_list_channels or message data)",
  "text": "string (required) - Message text, max 4000 characters",
  "thread_id": "string (optional) - Post to a specific thread",
  "reply_to_message_id": "string (optional) - Create a threaded reply to this message"
}
```

**Output Format:**
```
Message sent successfully. Message ID: <id>, Channel: <channel_id>
```

**Notes:**
- Text exceeding 4000 characters is automatically truncated with "..."
- `clan_id` is required and can be obtained from `mezon_list_channels` or from previously read messages
- `reply_to_message_id` creates a visible reply thread in the Mezon UI
- For threads: set `thread_id` to post within a thread

---

### mezon_search_messages

**Purpose:** Full-text search across cached messages.

**When to use:**
- Finding discussions about a specific topic
- Locating a message that mentioned a keyword
- Searching for messages from/about a specific person or project

**Input Schema:**
```json
{
  "query": "string (required) - Search text (case-insensitive substring match)",
  "channel_id": "string (optional) - Limit search to a specific channel",
  "limit": "number (optional, default: 20) - Max results"
}
```

**Output Format:**
```
Found N message(s) matching "query":

[2025-01-15T10:30:00.000Z] [channel:abc thread:def] Alice: Message containing query
[2025-01-15T09:00:00.000Z] [channel:abc] Bob: Another message with query
```

**Notes:**
- Search is case-insensitive substring matching
- Results are sorted by most recent first
- Shows channel and thread context for each result
- Searches across all cached channels if `channel_id` is not specified

---

### mezon_channel_summary

**Purpose:** Get a comprehensive summary of channel or thread activity.

**When to use:**
- Before writing a summary of a discussion
- Understanding who participated and when
- Getting a complete view of a conversation

**Input Schema:**
```json
{
  "channel_id": "string (required) - Channel ID to summarize",
  "thread_id": "string (optional) - Thread ID for thread-specific summary"
}
```

**Output Format:**
```
Channel Summary for <channel_id>

Messages: 45
Participants: Alice, Bob, Charlie
Time Range: 2025-01-15T08:00:00.000Z to 2025-01-15T17:00:00.000Z

--- Messages ---
[2025-01-15T08:00:00.000Z] Alice: First message
[2025-01-15T08:01:00.000Z] Bob: Second message
...
```

**Notes:**
- Returns ALL cached messages for the channel (up to cache limit of 500 per channel)
- Participants list shows unique display names
- Time range shows earliest and latest message timestamps
- Full message text is included for agent processing/summarization

---

### mezon_list_channels

**Purpose:** List all channels that have had message activity.

**When to use:**
- Discovering available channels
- Finding channel IDs for other operations
- Monitoring activity across channels

**Input:** None

**Output Format:**
```
Active channels (3):

- Channel: abc123 | Clan: clan456 | Messages: 45 | Last: 2025-01-15T17:00:00.000Z
- Channel: def789 | Clan: clan456 | Messages: 12 | Last: 2025-01-15T16:30:00.000Z
- Channel: ghi012 | Clan: clan789 | Messages: 3 | Last: 2025-01-15T10:00:00.000Z
```

**Notes:**
- Only shows channels where the bot has received messages
- `clan_id` from this output can be used in `mezon_send_message`
- Message count is cumulative since bot connection

---

### mezon_status

**Purpose:** Check bot connection status and cache statistics.

**When to use:**
- Verifying the bot is connected before operations
- Checking how much cached data is available
- Debugging connection issues

**Input:** None

**Output Format:**
```
Mezon Bot Status

Connected: true
Bot ID: bot123
Cached Channels: 5
Cached Messages: 234
```

## Common Workflows

### Workflow 1: Daily Summary

```
1. mezon_list_channels                     → Get channel list
2. mezon_channel_summary(channel_id)       → Get full conversation
3. [Agent generates summary from messages]
4. mezon_send_message(channel_id, summary) → Post summary to channel
```

### Workflow 2: Answer a Question

```
1. mezon_read_messages(channel_id, limit=20)  → Read recent context
2. mezon_search_messages("relevant topic")     → Find related messages
3. [Agent formulates answer]
4. mezon_send_message(..., reply_to=msg_id)   → Reply to the question
```

### Workflow 3: Cross-Channel Intelligence

```
1. mezon_list_channels                        → Get all active channels
2. For each: mezon_channel_summary(ch_id)     → Get all conversations
3. [Agent analyzes across channels]
4. mezon_send_message(target_ch, findings)    → Post insights
```
