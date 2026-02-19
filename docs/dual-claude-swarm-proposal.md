# Proposal: Dual-Claude Swarm — Multi-Agent Collaborative Sessions

> **Status**: Draft
> **Date**: 2026-02-19
> **Inspired by**: [anthropics/claude-quickstarts/autonomous-coding](https://github.com/anthropics/claude-quickstarts/tree/main/autonomous-coding), AionUi's Ralph & Ouroboros assistants

## 1. Overview

Implement a **multi-agent swarm** system where two (or more) Claude Code sessions collaborate within a single AionUi conversation. One agent acts as the **Driver** (executes code, writes files) and the other as the **Navigator** (reviews, plans, directs). They communicate through a shared message feed, coordinated by hooks, and appear in the UI as distinct participants in the same conversation.

### Key Difference from Anthropic's Quickstart

The Anthropic `autonomous-coding` demo runs sessions **sequentially** (one finishes, next starts, filesystem is the shared state). Our design runs agents **concurrently** within a single conversation, communicating through a real-time message feed — closer to pair programming than relay racing.

### Design Principles

- **Simple but effective** — reuse existing hook system, message queue, and assistant framework
- **File-based coordination** — `.swarm/feed.jsonl` as the message bus (inspectable, debuggable, crash-recoverable)
- **Minimal UI changes** — extend existing message model with agent identity metadata
- **Extensible** — start with 2 agents (driver/navigator), architecture supports N agents

## 2. Architecture

```
┌─────────────────────────────────────────────────────┐
│                    AionUi Conversation              │
│                                                     │
│  ┌──────────────┐    .swarm/feed.jsonl    ┌──────────────┐
│  │   Driver      │ ◄──────────────────► │   Navigator    │
│  │   (Claude)    │    shared message bus │   (Claude)     │
│  │               │                      │                │
│  │  Executes     │                      │  Reviews       │
│  │  Writes code  │                      │  Plans         │
│  │  Runs tests   │                      │  Directs       │
│  └──────┬───────┘                      └──────┬───────┘
│         │                                      │
│         │  hooks/driver-hooks.js               │  hooks/navigator-hooks.js
│         │  - onAgentResponse: write to feed     │  - onAgentResponse: write to feed
│         │  - poll feed for navigator messages   │  - poll feed for driver messages
│         │                                      │
│  ┌──────┴──────────────────────────────────────┴───────┐
│  │              SwarmSessionManager                     │
│  │  - Spawns & manages agent sessions                  │
│  │  - Routes feed events to correct agent queue        │
│  │  - Handles lifecycle (start, pause, terminate)      │
│  └──────────────────────────────────────────────────────┘
│                          │
│  ┌───────────────────────┴───────────────────────────┐
│  │              Message Feed (.swarm/feed.jsonl)       │
│  │  - Append-only JSONL file                          │
│  │  - Each line: {from, to, type, content, ts}        │
│  │  - Agents read from last-seen offset               │
│  └───────────────────────────────────────────────────┘
│                          │
│  ┌───────────────────────┴───────────────────────────┐
│  │                   UI Layer                         │
│  │  - Messages show agent avatar + name               │
│  │  - Driver messages: blue avatar, left-aligned      │
│  │  - Navigator messages: green avatar, left-aligned  │
│  │  - User messages: right-aligned (as before)        │
│  └───────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────┘
```

## 3. Data Structures

### 3.1 assistant.json — New `mode` Field

Add a `mode` field to `assistant.json` to indicate multi-agent behavior:

```jsonc
// assistant/dual-claude/assistant.json
{
  "id": "dual-claude",
  "name": "Dual Claude — Driver & Navigator",
  "version": "1.0.0",
  "description": "Two Claude Code agents collaborating: one drives (writes code), one navigates (reviews & plans).",
  "author": "AionUi",
  "presetAgentType": "claude",
  "avatar": "🤝",
  "workspacePath": "./workspace",
  "tags": ["autonomous", "multi-agent", "swarm", "pair-programming", "claude-code"],

  // NEW: multi-agent mode configuration
  "mode": "swarm",
  "swarm": {
    "feedPath": ".swarm/feed.jsonl",
    "agents": [
      {
        "role": "driver",
        "name": "Driver",
        "avatar": "🔧",
        "description": "Executes code, writes files, runs tests. Takes direction from Navigator.",
        "hooksDir": "swarm/driver/hooks",
        "systemPrompt": "You are the DRIVER in a pair-programming session. You write code, run commands, and implement features. The Navigator will review your work and give you direction via messages in the feed. After each action, report what you did and wait for the Navigator's input. Focus on execution, not planning."
      },
      {
        "role": "navigator",
        "name": "Navigator",
        "avatar": "🧭",
        "description": "Reviews code, plans architecture, gives direction to Driver.",
        "hooksDir": "swarm/navigator/hooks",
        "systemPrompt": "You are the NAVIGATOR in a pair-programming session. You review the Driver's code, plan the architecture, catch bugs, and give clear direction. Read the feed to see what the Driver has done, then provide your next instruction or review. Focus on strategy and quality, not writing code directly."
      }
    ],
    "maxTurns": 30,
    "turnStrategy": "round-robin"
  },

  "defaultEnabledSkills": [],
  "queuedMessages": {
    "description": "Swarm: onQueueInit seeds both agents, onAgentResponse routes via feed",
    "phases": [
      { "trigger": "onQueueInit", "messages": 2, "purpose": "Seed driver and navigator with initial context" },
      { "trigger": "onAgentResponse", "messages": "N (feed-driven)", "purpose": "Route agent outputs through feed to the other agent" }
    ]
  }
}
```

### 3.2 Feed Message Format (`.swarm/feed.jsonl`)

Each line in the feed is a JSON object:

```typescript
// src/agent/swarm/types.ts

type SwarmFeedEntry = {
  /** Unique message ID */
  id: string;
  /** Monotonic sequence number */
  seq: number;
  /** Agent role that sent this message */
  from: string;            // "driver" | "navigator" | "system" | "user"
  /** Target agent role (or "all" for broadcast) */
  to: string;              // "driver" | "navigator" | "all"
  /** Message type */
  type: 'message' | 'action' | 'review' | 'directive' | 'status' | 'done';
  /** Message content */
  content: string;
  /** Files referenced or changed */
  files?: string[];
  /** ISO timestamp */
  ts: string;
};
```

Example `.swarm/feed.jsonl`:

```jsonl
{"id":"f001","seq":1,"from":"system","to":"all","type":"directive","content":"Task: Build a REST API with user authentication","ts":"2026-02-19T10:00:00Z"}
{"id":"f002","seq":2,"from":"navigator","to":"driver","type":"directive","content":"Start by creating the Express server scaffold in src/server.ts with health check endpoint. Use TypeScript.","ts":"2026-02-19T10:00:05Z"}
{"id":"f003","seq":3,"from":"driver","to":"navigator","type":"action","content":"Created src/server.ts with Express setup and /health endpoint. Running on port 3000.","files":["src/server.ts"],"ts":"2026-02-19T10:01:30Z"}
{"id":"f004","seq":4,"from":"navigator","to":"driver","type":"review","content":"Looks good. Now add the auth middleware. Use JWT with bcrypt for password hashing. Create src/middleware/auth.ts.","ts":"2026-02-19T10:01:35Z"}
```

### 3.3 Message Model Extension

Extend the existing `IMessage` type to carry agent identity:

```typescript
// Addition to src/common/chatLib.ts

/** Agent identity metadata for multi-agent (swarm) conversations */
type SwarmAgentMeta = {
  /** Agent role identifier */
  role: string;           // "driver" | "navigator"
  /** Display name */
  name: string;           // "Driver" | "Navigator"
  /** Avatar emoji or image path */
  avatar: string;         // "🔧" | "🧭"
};

// Extended IMessage — add optional agentMeta field
interface IMessage<T extends TMessageType, Content extends Record<string, any>> {
  id: string;
  msg_id?: string;
  conversation_id: string;
  type: T;
  content: Content;
  createdAt?: number;
  position?: 'left' | 'right' | 'center' | 'pop';
  status?: 'finish' | 'pending' | 'error' | 'work';
  /** NEW: Agent identity for swarm/multi-agent conversations */
  agentMeta?: SwarmAgentMeta;
}
```

## 4. Implementation Plan

### 4.1 New Files & Directories

```
src/agent/swarm/
├── types.ts                    # SwarmConfig, SwarmFeedEntry, SwarmAgentConfig types
├── SwarmSessionManager.ts      # Manages multiple agent sessions within one conversation
├── SwarmFeedManager.ts         # Read/write/watch .swarm/feed.jsonl
├── SwarmTurnController.ts      # Turn-taking strategy (round-robin, on-demand)
└── index.ts                    # Public API

assistant/dual-claude/
├── assistant.json              # Configuration (see §3.1)
├── swarm/
│   ├── driver/
│   │   └── hooks/
│   │       └── driver-hooks.js     # Driver agent hooks
│   └── navigator/
│       └── hooks/
│           └── navigator-hooks.js  # Navigator agent hooks
├── workspace/                  # Template workspace
└── dual-claude.en-US.md        # Preset prompt/rules

tests/unit/swarm/
├── SwarmFeedManager.test.ts
├── SwarmTurnController.test.ts
└── swarmHooks.test.ts
```

### 4.2 `SwarmFeedManager` — The Message Bus

Manages the `.swarm/feed.jsonl` file as an append-only message bus.

```typescript
// src/agent/swarm/SwarmFeedManager.ts

class SwarmFeedManager {
  private feedPath: string;
  private seq: number = 0;
  private cursors: Map<string, number> = new Map();  // role → last-read seq

  constructor(workspacePath: string, feedRelPath: string);

  /** Initialize feed directory and file */
  init(): void;

  /** Append a message to the feed */
  append(entry: Omit<SwarmFeedEntry, 'id' | 'seq' | 'ts'>): SwarmFeedEntry;

  /** Read new messages for a specific agent since its last cursor position */
  readNewFor(role: string): SwarmFeedEntry[];

  /** Read all messages */
  readAll(): SwarmFeedEntry[];

  /** Check if a "done" message exists */
  isDone(): boolean;

  /** Get current sequence number */
  getSeq(): number;
}
```

**Key design decisions:**

- **Append-only JSONL** — Each write is a single `fs.appendFileSync()` call (atomic on most filesystems for small writes). No file locking needed.
- **Cursor-based reads** — Each agent tracks its `lastSeenSeq`. `readNewFor(role)` returns entries where `seq > cursor AND (to === role OR to === 'all')`.
- **Inspectable** — Humans can `cat .swarm/feed.jsonl` to see the full conversation history between agents.
- **Crash-recoverable** — On restart, read the file, find max seq, rebuild cursors.

### 4.3 `SwarmSessionManager` — Agent Orchestration

Manages the lifecycle of multiple agent sessions within a single conversation.

```typescript
// src/agent/swarm/SwarmSessionManager.ts

class SwarmSessionManager {
  private feedManager: SwarmFeedManager;
  private agents: Map<string, SwarmAgentSession>;
  private turnController: SwarmTurnController;
  private conversationId: string;

  constructor(config: SwarmConfig, conversationId: string);

  /** Initialize all agent sessions and the feed */
  async init(userMessage: string): Promise<void>;

  /** Route a feed entry to the target agent's message queue */
  routeToAgent(entry: SwarmFeedEntry): void;

  /** Handle agent response — write to feed, trigger next agent */
  async onAgentResponse(role: string, content: string): Promise<void>;

  /** Pause all agents */
  pause(): void;

  /** Resume all agents */
  resume(): void;

  /** Terminate the swarm session */
  terminate(): void;

  /** Check if the task is complete */
  isDone(): boolean;
}
```

**Lifecycle:**

1. User sends message → `SwarmSessionManager.init(userMessage)`
2. Write `{from: "user", to: "all", type: "directive", content: userMessage}` to feed
3. Seed Navigator first (it plans), then Driver (it waits for direction)
4. Navigator responds → `onAgentResponse("navigator", content)` → write to feed → route to Driver
5. Driver responds → `onAgentResponse("driver", content)` → write to feed → route to Navigator
6. Repeat until `done` signal or `maxTurns` reached

### 4.4 `SwarmTurnController` — Turn-Taking Strategy

```typescript
// src/agent/swarm/SwarmTurnController.ts

type TurnStrategy = 'round-robin' | 'on-demand';

class SwarmTurnController {
  private strategy: TurnStrategy;
  private agentOrder: string[];
  private currentIndex: number = 0;
  private turnCount: number = 0;
  private maxTurns: number;

  constructor(strategy: TurnStrategy, agents: string[], maxTurns: number);

  /** Get the next agent role that should act */
  next(): string;

  /** Check if max turns reached */
  isExhausted(): boolean;

  /** Get turn count */
  getTurnCount(): number;
}
```

**Strategies:**

- **`round-robin`** (default): Navigator → Driver → Navigator → Driver → ...
- **`on-demand`**: Agent specifies who should go next via `to` field in feed (more flexible, less predictable)

### 4.5 Hooks Implementation

#### 4.5.1 Driver Hooks

```javascript
// assistant/dual-claude/swarm/driver/hooks/driver-hooks.js

const ROLE = 'driver';

module.exports = {
  /**
   * onQueueInit — Seed the driver with initial context
   * The driver waits for the navigator's first directive before acting.
   */
  onQueueInit: {
    handler: async (context) => {
      if (!context.backend || !context.workspace) return {};

      const fs = require('fs');
      const path = require('path');
      const feedPath = path.join(context.workspace, '.swarm', 'feed.jsonl');

      // Read the user's task from the feed (system already wrote it)
      let taskDescription = context.content || 'No task specified.';
      if (fs.existsSync(feedPath)) {
        const lines = fs.readFileSync(feedPath, 'utf-8').trim().split('\n');
        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            if (entry.from === 'user' || entry.from === 'system') {
              taskDescription = entry.content;
            }
          } catch { /* skip malformed */ }
        }
      }

      return {
        queueMessages: [{
          content: [
            '## Swarm — Driver Session',
            '',
            `**Task:** ${taskDescription}`,
            '',
            'You are the **Driver** in a pair-programming swarm.',
            'The Navigator will review your work and provide direction.',
            '',
            '**Your workflow:**',
            '1. Read `.swarm/feed.jsonl` for the Navigator\'s latest directive',
            '2. Execute the directive (write code, run tests, etc.)',
            '3. Report what you did clearly',
            '4. Wait for the Navigator\'s next instruction',
            '',
            'Start by reading the feed for the Navigator\'s first directive.',
          ].join('\n'),
          priority: 'normal',
          source: 'hook',
        }],
      };
    },
    priority: 50,
  },

  /**
   * onAgentResponse — Driver completed an action
   * Write the result to the feed and wait for navigator's review.
   */
  onAgentResponse: {
    handler: async (context) => {
      if (!context.backend || !context.workspace) return {};

      const fs = require('fs');
      const path = require('path');
      const swarmDir = path.join(context.workspace, '.swarm');
      const feedPath = path.join(swarmDir, 'feed.jsonl');
      const agentOutput = context.content || '';

      // Check for done signal
      if (/<done\s*\/?>/.test(agentOutput)) {
        const doneEntry = JSON.stringify({
          id: `f-${Date.now()}`,
          seq: getNextSeq(feedPath, fs),
          from: ROLE,
          to: 'all',
          type: 'done',
          content: 'Driver signals task completion.',
          ts: new Date().toISOString(),
        });
        fs.appendFileSync(feedPath, doneEntry + '\n', 'utf-8');
        return {};
      }

      // Write driver's output to feed
      if (!fs.existsSync(swarmDir)) fs.mkdirSync(swarmDir, { recursive: true });

      const entry = JSON.stringify({
        id: `f-${Date.now()}`,
        seq: getNextSeq(feedPath, fs),
        from: ROLE,
        to: 'navigator',
        type: 'action',
        content: agentOutput.slice(0, 4000), // Truncate for feed readability
        ts: new Date().toISOString(),
      });
      fs.appendFileSync(feedPath, entry + '\n', 'utf-8');

      // Read navigator's latest message (if any new ones)
      const navigatorMessages = readNewMessagesFor(ROLE, feedPath, fs, context);
      if (navigatorMessages.length > 0) {
        const latest = navigatorMessages[navigatorMessages.length - 1];
        return {
          queueMessages: [{
            content: [
              '## Navigator says:',
              '',
              latest.content,
              '',
              '---',
              '_Read `.swarm/feed.jsonl` for full context. Execute the directive above._',
            ].join('\n'),
            priority: 'normal',
            source: 'hook',
          }],
        };
      }

      // No new navigator messages yet — will be routed by SwarmSessionManager
      return {};
    },
    priority: 50,
  },
};

// ─── Helpers ───

function getNextSeq(feedPath, fs) {
  if (!fs.existsSync(feedPath)) return 1;
  const lines = fs.readFileSync(feedPath, 'utf-8').trim().split('\n').filter(Boolean);
  let maxSeq = 0;
  for (const line of lines) {
    try { maxSeq = Math.max(maxSeq, JSON.parse(line).seq || 0); } catch { /* skip */ }
  }
  return maxSeq + 1;
}

function readNewMessagesFor(role, feedPath, fs, context) {
  if (!fs.existsSync(feedPath)) return [];
  const cursorKey = `__swarm_cursor_${role}`;
  const cursor = context[cursorKey] || 0;
  const lines = fs.readFileSync(feedPath, 'utf-8').trim().split('\n').filter(Boolean);
  const newMessages = [];
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.seq > cursor && entry.from !== role && (entry.to === role || entry.to === 'all')) {
        newMessages.push(entry);
      }
    } catch { /* skip */ }
  }
  // Update cursor
  if (newMessages.length > 0) {
    context[cursorKey] = newMessages[newMessages.length - 1].seq;
  }
  return newMessages;
}
```

#### 4.5.2 Navigator Hooks

```javascript
// assistant/dual-claude/swarm/navigator/hooks/navigator-hooks.js

const ROLE = 'navigator';

module.exports = {
  /**
   * onQueueInit — Navigator seeds the collaboration
   * Reads the task, creates an initial plan, and writes the first directive.
   */
  onQueueInit: {
    handler: async (context) => {
      if (!context.backend || !context.workspace) return {};

      const fs = require('fs');
      const path = require('path');
      const swarmDir = path.join(context.workspace, '.swarm');
      const feedPath = path.join(swarmDir, 'feed.jsonl');

      // Ensure feed directory exists
      if (!fs.existsSync(swarmDir)) fs.mkdirSync(swarmDir, { recursive: true });

      const userRequest = (context.content || '').trim();

      // Write user task to feed as system message
      const systemEntry = JSON.stringify({
        id: `f-${Date.now()}`,
        seq: 1,
        from: 'user',
        to: 'all',
        type: 'directive',
        content: userRequest,
        ts: new Date().toISOString(),
      });
      fs.appendFileSync(feedPath, systemEntry + '\n', 'utf-8');

      return {
        queueMessages: [{
          content: [
            '## Swarm — Navigator Session',
            '',
            `**Task:** ${userRequest}`,
            '',
            'You are the **Navigator** in a pair-programming swarm.',
            'The Driver will execute your directives and report back.',
            '',
            '**Your workflow:**',
            '1. Analyze the task and break it into clear, actionable steps',
            '2. Write your first directive to the Driver',
            '3. After the Driver reports back, review the work',
            '4. Provide the next directive or corrections',
            '5. When all work is complete, output `<done/>`',
            '',
            '**Rules:**',
            '- Give ONE clear directive at a time (not a list of 10 things)',
            '- Be specific: include file paths, function names, exact requirements',
            '- Review the Driver\'s output critically — catch bugs and design issues',
            '- Write your directives to `.swarm/feed.jsonl` (the Driver reads this)',
            '',
            'Begin by analyzing the task and writing your first directive.',
          ].join('\n'),
          priority: 'normal',
          source: 'hook',
        }],
      };
    },
    priority: 50,
  },

  /**
   * onAgentResponse — Navigator provided a review or directive
   * Write to feed and wait for driver's next action report.
   */
  onAgentResponse: {
    handler: async (context) => {
      if (!context.backend || !context.workspace) return {};

      const fs = require('fs');
      const path = require('path');
      const swarmDir = path.join(context.workspace, '.swarm');
      const feedPath = path.join(swarmDir, 'feed.jsonl');
      const agentOutput = context.content || '';

      // Check for done signal
      if (/<done\s*\/?>/.test(agentOutput)) {
        const doneEntry = JSON.stringify({
          id: `f-${Date.now()}`,
          seq: getNextSeq(feedPath, fs),
          from: ROLE,
          to: 'all',
          type: 'done',
          content: 'Navigator signals task completion.',
          ts: new Date().toISOString(),
        });
        fs.appendFileSync(feedPath, doneEntry + '\n', 'utf-8');
        return {};
      }

      // Write navigator's output to feed
      if (!fs.existsSync(swarmDir)) fs.mkdirSync(swarmDir, { recursive: true });

      const entry = JSON.stringify({
        id: `f-${Date.now()}`,
        seq: getNextSeq(feedPath, fs),
        from: ROLE,
        to: 'driver',
        type: 'directive',
        content: agentOutput.slice(0, 4000),
        ts: new Date().toISOString(),
      });
      fs.appendFileSync(feedPath, entry + '\n', 'utf-8');

      // Read driver's latest report (if any new ones)
      const driverMessages = readNewMessagesFor(ROLE, feedPath, fs, context);
      if (driverMessages.length > 0) {
        const latest = driverMessages[driverMessages.length - 1];
        return {
          queueMessages: [{
            content: [
              '## Driver reports:',
              '',
              latest.content,
              '',
              '---',
              '_Read `.swarm/feed.jsonl` for full context. Review and provide next directive._',
            ].join('\n'),
            priority: 'normal',
            source: 'hook',
          }],
        };
      }

      return {};
    },
    priority: 50,
  },
};

// ─── Helpers (same as driver) ───

function getNextSeq(feedPath, fs) {
  if (!fs.existsSync(feedPath)) return 1;
  const lines = fs.readFileSync(feedPath, 'utf-8').trim().split('\n').filter(Boolean);
  let maxSeq = 0;
  for (const line of lines) {
    try { maxSeq = Math.max(maxSeq, JSON.parse(line).seq || 0); } catch { /* skip */ }
  }
  return maxSeq + 1;
}

function readNewMessagesFor(role, feedPath, fs, context) {
  if (!fs.existsSync(feedPath)) return [];
  const cursorKey = `__swarm_cursor_${role}`;
  const cursor = context[cursorKey] || 0;
  const lines = fs.readFileSync(feedPath, 'utf-8').trim().split('\n').filter(Boolean);
  const newMessages = [];
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.seq > cursor && entry.from !== role && (entry.to === role || entry.to === 'all')) {
        newMessages.push(entry);
      }
    } catch { /* skip */ }
  }
  if (newMessages.length > 0) {
    context[cursorKey] = newMessages[newMessages.length - 1].seq;
  }
  return newMessages;
}
```

### 4.6 `SwarmSessionManager` — Core Implementation

The SwarmSessionManager is the orchestrator. It lives in the main process and coordinates the two agent sessions.

```typescript
// src/agent/swarm/SwarmSessionManager.ts — simplified pseudocode

import { SwarmFeedManager } from './SwarmFeedManager';
import { SwarmTurnController } from './SwarmTurnController';
import type { SwarmConfig, SwarmAgentConfig } from './types';

export class SwarmSessionManager {
  private feedManager: SwarmFeedManager;
  private turnController: SwarmTurnController;
  private agentQueues: Map<string, AcpMessageQueue>;
  private config: SwarmConfig;

  constructor(config: SwarmConfig, workspace: string) {
    this.config = config;
    this.feedManager = new SwarmFeedManager(workspace, config.feedPath);
    this.turnController = new SwarmTurnController(
      config.turnStrategy,
      config.agents.map(a => a.role),
      config.maxTurns
    );
  }

  async init(userMessage: string): Promise<void> {
    // 1. Initialize feed
    this.feedManager.init();

    // 2. Write user's task to feed
    this.feedManager.append({
      from: 'user',
      to: 'all',
      type: 'directive',
      content: userMessage,
    });

    // 3. Initialize agent sessions (each gets its own queue + hooks)
    for (const agentConfig of this.config.agents) {
      await this.initAgentSession(agentConfig);
    }

    // 4. Start the first agent (navigator goes first in round-robin)
    const firstRole = this.turnController.next();
    this.triggerAgent(firstRole);
  }

  async onAgentResponse(role: string, content: string): Promise<void> {
    // 1. Write response to feed
    this.feedManager.append({
      from: role,
      to: this.getCounterpart(role),
      type: role === 'navigator' ? 'directive' : 'action',
      content: content,
    });

    // 2. Check termination
    if (this.feedManager.isDone() || this.turnController.isExhausted()) {
      this.terminate();
      return;
    }

    // 3. Trigger next agent with new feed entries
    const nextRole = this.turnController.next();
    const newEntries = this.feedManager.readNewFor(nextRole);
    this.sendFeedToAgent(nextRole, newEntries);
  }

  private getCounterpart(role: string): string {
    return role === 'driver' ? 'navigator' : 'driver';
  }
}
```

### 4.7 Integration with Existing Systems

The swarm integrates into the existing AionUi architecture at three points:

#### 4.7.1 Assistant Loading (`src/common/presets/assistantPresets.ts`)

Register the new assistant:

```typescript
{
  id: 'dual-claude',
  name: 'Dual Claude',
  avatar: '🤝',
  presetAgentType: 'claude',
  mode: 'swarm',  // NEW field recognized by agent init
  // ...
}
```

#### 4.7.2 Agent Initialization (`src/process/initAgent.ts`)

When `assistant.mode === 'swarm'`:

1. Read `swarm` config from `assistant.json`
2. Create `SwarmSessionManager` instead of single agent manager
3. Load hooks from each agent's `hooksDir` (driver-hooks.js, navigator-hooks.js)
4. Initialize the feed workspace

#### 4.7.3 Message Queue Integration (`src/process/task/AcpAgentManager.ts`)

The swarm manager wraps the existing `AcpMessageQueue`:

- Each agent role gets its own `AcpMessageQueue` instance
- `runQueueInitHooks()` and `runAgentResponseHooks()` are called per-agent with role-specific hooks
- Feed routing happens between the hook response and queue enqueue

### 4.8 UI Changes

#### 4.8.1 Message Rendering with Agent Identity

In `src/renderer/messages/MessageList.tsx`, when rendering messages with `agentMeta`:

```tsx
// Conceptual change to MessageItem
const MessageItem: React.FC<{ message: TMessage }> = ({ message }) => {
  const isSwarm = !!message.agentMeta;

  return (
    <div className={classNames('flex items-start message-item', {
      'justify-end': message.position === 'right',
      'justify-start': message.position === 'left',
    })}>
      {/* NEW: Show agent avatar for swarm messages */}
      {isSwarm && message.position === 'left' && (
        <SwarmAgentBadge
          avatar={message.agentMeta.avatar}
          name={message.agentMeta.name}
          role={message.agentMeta.role}
        />
      )}
      {/* Existing message content rendering */}
      <MessageContent message={message} />
    </div>
  );
};
```

#### 4.8.2 `SwarmAgentBadge` Component

```tsx
// src/renderer/components/SwarmAgentBadge.tsx

type SwarmAgentBadgeProps = {
  avatar: string;
  name: string;
  role: string;
};

const ROLE_COLORS: Record<string, string> = {
  driver: 'bg-blue-100 text-blue-700 border-blue-200',
  navigator: 'bg-green-100 text-green-700 border-green-200',
};

const SwarmAgentBadge: React.FC<SwarmAgentBadgeProps> = ({ avatar, name, role }) => (
  <div className="flex flex-col items-center mr-2 min-w-8">
    <span className="text-lg">{avatar}</span>
    <span className={classNames(
      'text-xs px-1 rounded border mt-0.5',
      ROLE_COLORS[role] || 'bg-gray-100 text-gray-600'
    )}>
      {name}
    </span>
  </div>
);
```

#### 4.8.3 Database Schema

Add `agent_meta` column to messages table:

```sql
-- Migration
ALTER TABLE messages ADD COLUMN agent_meta TEXT;
-- Stores JSON: {"role":"driver","name":"Driver","avatar":"🔧"}
```

The `rowToMessage()` / `messageToRow()` functions in `src/process/database/types.ts` parse/stringify this field.

## 5. Sequence Diagram

```
User                  SwarmSessionManager        Navigator             Driver              Feed
  │                          │                      │                    │                  │
  │── "Build REST API" ─────►│                      │                    │                  │
  │                          │── write task ─────────┼────────────────────┼─────────────────►│
  │                          │── seed navigator ────►│                    │                  │
  │                          │                      │── analyze task     │                  │
  │                          │                      │── plan steps       │                  │
  │                          │◄── "Create Express   │                    │                  │
  │                          │    scaffold first" ──│                    │                  │
  │                          │── write to feed ──────┼────────────────────┼─────────────────►│
  │                          │── route to driver ────┼───────────────────►│                  │
  │                          │                      │                    │── read directive  │
  │                          │                      │                    │── create files    │
  │                          │                      │                    │── run code        │
  │                          │◄──────────────────────┼── "Created         │                  │
  │                          │                      │   server.ts" ──────│                  │
  │                          │── write to feed ──────┼────────────────────┼─────────────────►│
  │                          │── route to navigator ►│                    │                  │
  │                          │                      │── review code      │                  │
  │                          │                      │── check quality    │                  │
  │                          │◄── "Add auth         │                    │                  │
  │                          │    middleware next" ──│                    │                  │
  │                          │── write to feed ──────┼────────────────────┼─────────────────►│
  │                          │── route to driver ────┼───────────────────►│                  │
  │                          │                      │                    │── implement auth  │
  │                          │                      │                    │                  │
  │                          │        ... continues round-robin ...      │                  │
  │                          │                      │                    │                  │
  │                          │◄── "<done/>" ────────│                    │                  │
  │◄── "Task complete" ─────│                      │                    │                  │
  │                          │                      │                    │                  │
```

## 6. Unit Tests

### 6.1 `SwarmFeedManager.test.ts`

```typescript
// tests/unit/swarm/SwarmFeedManager.test.ts

describe('SwarmFeedManager', () => {
  let feedManager: SwarmFeedManager;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-test-'));
    feedManager = new SwarmFeedManager(tmpDir, '.swarm/feed.jsonl');
    feedManager.init();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('init creates .swarm directory and empty feed file', () => {
    expect(fs.existsSync(path.join(tmpDir, '.swarm'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.swarm', 'feed.jsonl'))).toBe(true);
  });

  test('append adds entry with auto-incremented seq', () => {
    feedManager.append({ from: 'user', to: 'all', type: 'directive', content: 'Task A' });
    feedManager.append({ from: 'navigator', to: 'driver', type: 'directive', content: 'Do X' });

    const entries = feedManager.readAll();
    expect(entries).toHaveLength(2);
    expect(entries[0].seq).toBe(1);
    expect(entries[1].seq).toBe(2);
    expect(entries[1].from).toBe('navigator');
  });

  test('readNewFor returns only messages addressed to the role', () => {
    feedManager.append({ from: 'user', to: 'all', type: 'directive', content: 'Task' });
    feedManager.append({ from: 'navigator', to: 'driver', type: 'directive', content: 'Do X' });
    feedManager.append({ from: 'driver', to: 'navigator', type: 'action', content: 'Did X' });

    const forDriver = feedManager.readNewFor('driver');
    expect(forDriver).toHaveLength(2); // user→all + navigator→driver
    expect(forDriver[0].content).toBe('Task');
    expect(forDriver[1].content).toBe('Do X');

    const forNavigator = feedManager.readNewFor('navigator');
    expect(forNavigator).toHaveLength(2); // user→all + driver→navigator
  });

  test('readNewFor respects cursor — does not return already-read messages', () => {
    feedManager.append({ from: 'user', to: 'all', type: 'directive', content: 'Task' });
    feedManager.readNewFor('driver'); // advance cursor

    feedManager.append({ from: 'navigator', to: 'driver', type: 'directive', content: 'Do Y' });
    const newMessages = feedManager.readNewFor('driver');
    expect(newMessages).toHaveLength(1);
    expect(newMessages[0].content).toBe('Do Y');
  });

  test('isDone returns true when done entry exists', () => {
    feedManager.append({ from: 'navigator', to: 'all', type: 'done', content: 'Complete' });
    expect(feedManager.isDone()).toBe(true);
  });

  test('isDone returns false when no done entry', () => {
    feedManager.append({ from: 'navigator', to: 'driver', type: 'directive', content: 'Work' });
    expect(feedManager.isDone()).toBe(false);
  });
});
```

### 6.2 `SwarmTurnController.test.ts`

```typescript
// tests/unit/swarm/SwarmTurnController.test.ts

describe('SwarmTurnController', () => {
  test('round-robin alternates between agents', () => {
    const controller = new SwarmTurnController('round-robin', ['navigator', 'driver'], 10);
    expect(controller.next()).toBe('navigator');
    expect(controller.next()).toBe('driver');
    expect(controller.next()).toBe('navigator');
    expect(controller.next()).toBe('driver');
  });

  test('isExhausted returns true after maxTurns', () => {
    const controller = new SwarmTurnController('round-robin', ['navigator', 'driver'], 3);
    controller.next(); // turn 1
    controller.next(); // turn 2
    controller.next(); // turn 3
    expect(controller.isExhausted()).toBe(true);
  });

  test('isExhausted returns false before maxTurns', () => {
    const controller = new SwarmTurnController('round-robin', ['navigator', 'driver'], 10);
    controller.next();
    expect(controller.isExhausted()).toBe(false);
  });

  test('getTurnCount tracks total turns', () => {
    const controller = new SwarmTurnController('round-robin', ['a', 'b'], 100);
    expect(controller.getTurnCount()).toBe(0);
    controller.next();
    controller.next();
    expect(controller.getTurnCount()).toBe(2);
  });
});
```

### 6.3 `swarmHooks.test.ts`

```typescript
// tests/unit/swarm/swarmHooks.test.ts

describe('Driver hooks', () => {
  test('onQueueInit returns seed message for driver', async () => {
    const hooks = require('../../../assistant/dual-claude/swarm/driver/hooks/driver-hooks.js');
    const result = await hooks.onQueueInit.handler({
      backend: 'claude',
      workspace: tmpDir,
      content: 'Build a REST API',
    });
    expect(result.queueMessages).toHaveLength(1);
    expect(result.queueMessages[0].content).toContain('Driver');
  });

  test('onAgentResponse writes to feed and returns empty when no navigator message', async () => {
    const hooks = require('../../../assistant/dual-claude/swarm/driver/hooks/driver-hooks.js');
    setupFeedDir(tmpDir);

    const result = await hooks.onAgentResponse.handler({
      backend: 'claude',
      workspace: tmpDir,
      content: 'Created server.ts with Express setup.',
    });

    // Should have written to feed
    const feed = readFeed(tmpDir);
    expect(feed.length).toBeGreaterThan(0);
    expect(feed[feed.length - 1].from).toBe('driver');
  });

  test('onAgentResponse detects <done/> signal', async () => {
    const hooks = require('../../../assistant/dual-claude/swarm/driver/hooks/driver-hooks.js');
    setupFeedDir(tmpDir);

    const result = await hooks.onAgentResponse.handler({
      backend: 'claude',
      workspace: tmpDir,
      content: 'All done! <done/>',
    });

    const feed = readFeed(tmpDir);
    const doneEntries = feed.filter(e => e.type === 'done');
    expect(doneEntries).toHaveLength(1);
    expect(result).toEqual({});
  });
});

describe('Navigator hooks', () => {
  test('onQueueInit writes user task to feed and returns seed message', async () => {
    const hooks = require('../../../assistant/dual-claude/swarm/navigator/hooks/navigator-hooks.js');
    const result = await hooks.onQueueInit.handler({
      backend: 'claude',
      workspace: tmpDir,
      content: 'Build a REST API',
    });

    expect(result.queueMessages).toHaveLength(1);
    expect(result.queueMessages[0].content).toContain('Navigator');

    const feed = readFeed(tmpDir);
    expect(feed).toHaveLength(1);
    expect(feed[0].from).toBe('user');
  });
});
```

## 7. Configuration Summary

### Minimal Implementation Checklist

| # | Task | Files | Scope |
|---|------|-------|-------|
| 1 | Add `mode` field to assistant type | `src/common/presets/assistantPresets.ts`, assistant type defs | Small |
| 2 | Create `src/agent/swarm/types.ts` | New file | Small |
| 3 | Create `SwarmFeedManager` | `src/agent/swarm/SwarmFeedManager.ts` | Medium |
| 4 | Create `SwarmTurnController` | `src/agent/swarm/SwarmTurnController.ts` | Small |
| 5 | Create `SwarmSessionManager` | `src/agent/swarm/SwarmSessionManager.ts` | Medium |
| 6 | Create `dual-claude` assistant config | `assistant/dual-claude/assistant.json` + hooks | Medium |
| 7 | Create driver hooks | `assistant/dual-claude/swarm/driver/hooks/driver-hooks.js` | Medium |
| 8 | Create navigator hooks | `assistant/dual-claude/swarm/navigator/hooks/navigator-hooks.js` | Medium |
| 9 | Integrate swarm mode in agent init | `src/process/initAgent.ts` | Small |
| 10 | Add `agentMeta` to message model | `src/common/chatLib.ts`, `src/process/database/types.ts` | Small |
| 11 | Add `agent_meta` DB column | `src/process/database/schema.ts` migration | Small |
| 12 | Create `SwarmAgentBadge` UI component | `src/renderer/components/SwarmAgentBadge.tsx` | Small |
| 13 | Update `MessageList` to render agent badges | `src/renderer/messages/MessageList.tsx` | Small |
| 14 | Unit tests | `tests/unit/swarm/*.test.ts` | Medium |

### Implementation Order

**Phase 1 — Core (get it working):**
Tasks 1–5, 9: Types, feed manager, turn controller, session manager, agent init integration

**Phase 2 — Assistant & Hooks (make it autonomous):**
Tasks 6–8: dual-claude assistant config and hook implementations

**Phase 3 — UI (make it visible):**
Tasks 10–13: Message model extension, DB migration, agent badge component

**Phase 4 — Tests (make it reliable):**
Task 14: Unit tests for feed, turn controller, and hooks

## 8. Future Extensions

- **N-agent swarms** — Add a "reviewer" or "tester" role (architecture supports it, just add to `swarm.agents[]`)
- **Cross-backend swarms** — Driver is Claude, Navigator is Gemini (different `presetAgentType` per agent)
- **Human-in-the-loop** — User can inject messages into the feed via UI, acting as a third participant
- **Feed visualization** — Dedicated UI panel showing the `.swarm/feed.jsonl` as a timeline
- **Swarm templates** — Pre-built configurations: "Code Review" (writer + reviewer), "TDD" (test-writer + implementer), "Full Stack" (frontend + backend)
