# Bosun Clone — AI Coding Supervisor

A production-grade supervisor assistant for autonomous AI coding agents, inspired by the open-source [Bosun framework](https://github.com/virtengine/bosun). Routes tasks across multiple AI executors (Codex, Copilot, Claude), automates PR lifecycles, manages retries and failover, and keeps operators in control through notifications and dashboards.

## Overview

Bosun is a supervisor layer that sits above individual AI coding agents. Instead of running a single agent on a single task, Bosun orchestrates multiple agents across multiple repositories, routing work intelligently and recovering from failures automatically.

### What Bosun Does

- **Task routing** — Distributes work across Codex, Copilot, and Claude executors using weighted, round-robin, or primary-only strategies
- **PR lifecycle automation** — Opens PRs, runs CI checks, auto-merges on success, labels with `bosun-needs-fix` on failure, and retries
- **Failover and retry** — Automatic retry with configurable cooldowns, executor fallback on consecutive failures
- **Operator control** — Telegram bot, Mini App dashboard, and optional WhatsApp notifications
- **Workflow engine** — DAG-based workflow execution with triggers, conditions, and agent action nodes
- **Multi-workspace** — Manage multiple repositories from a single supervisor instance
- **Agent logging** — Structured JSONL logs with error clustering, cost tracking, and anomaly detection

## Prerequisites

Before setting up Bosun, ensure you have:

- **Node.js 18+** — Runtime environment
- **Git** — Version control
- **GitHub CLI (`gh`)** — Recommended for GitHub operations
- **Bash** (macOS/Linux) or **PowerShell 7+** (Windows)

Optional for notifications:
- **Telegram Bot Token** — For operator control via Telegram
- **WhatsApp** — For notification forwarding

## Installation

### Option 1: npm (Recommended)

```bash
npm install -g bosun
```

### Option 2: Clone from Source

```bash
git clone https://github.com/virtengine/bosun.git
cd bosun
npm install
npm link
```

### Verify Installation

```bash
bosun --version
bosun --doctor    # Validate .env and config setup
```

## Quick Start

### 1. Initialize in Your Repository

```bash
cd your-project
bosun --setup
```

This launches the web-based setup wizard. For a terminal-based setup instead:

```bash
bosun --setup-terminal
```

### 2. Configure Executors

Create or edit `bosun.config.json` in your project root:

```json
{
  "$schema": "./node_modules/bosun/bosun.schema.json",
  "projectName": "my-project",
  "primaryAgent": "claude-sdk",
  "distribution": "weighted",
  "executors": [
    {
      "name": "claude-primary",
      "executor": "CLAUDE",
      "weight": 60,
      "role": "primary"
    },
    {
      "name": "codex-secondary",
      "executor": "CODEX",
      "weight": 30,
      "role": "secondary"
    },
    {
      "name": "copilot-fallback",
      "executor": "COPILOT",
      "weight": 10,
      "role": "fallback"
    }
  ],
  "failover": {
    "strategy": "weighted-random",
    "maxRetries": 3,
    "cooldownMinutes": 5,
    "disableOnConsecutiveFailures": 3
  }
}
```

### 3. Set Up Environment Variables

Create a `.env` file:

```bash
# GitHub
GITHUB_TOKEN=ghp_xxxxxxxxxxxx

# AI Executors
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxx

# Telegram (optional)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF
TELEGRAM_CHAT_ID=your_chat_id

# Agent Logging
AGENT_WORK_LOGGING_ENABLED=true
```

### 4. Start the Supervisor

```bash
# Foreground (interactive)
bosun

# Background daemon
bosun --daemon
bosun --daemon-status
bosun --stop-daemon
```

## Configuration Reference

### Top-Level Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `projectName` | string | — | Project identifier |
| `primaryAgent` | enum | — | `"codex-sdk"`, `"copilot-sdk"`, or `"claude-sdk"` |
| `distribution` | enum | — | `"weighted"`, `"round-robin"`, or `"primary-only"` |
| `mode` | enum | — | `"virtengine"` or `"generic"` |
| `logDir` | string | `"./logs"` | Log file directory |
| `logMaxSizeMb` | number | `500` | Max total log folder size in MB |
| `watchEnabled` | boolean | — | Enable file watching for auto-restart |
| `autoFixEnabled` | boolean | — | Enable automatic error fixing |
| `codexEnabled` | boolean | — | Enable Codex integration |
| `shellEnabled` | boolean | — | Enable shell execution |
| `telegramVerbosity` | enum | `"summary"` | `"minimal"`, `"summary"`, or `"detailed"` |

### Executor Configuration

Each executor in the `executors` array:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Unique executor name |
| `executor` | enum | `"CODEX"`, `"COPILOT"`, or `"CLAUDE"` |
| `variant` | string | Executor variant (e.g., `"DEFAULT"`) |
| `weight` | number | Routing weight (0–100) |
| `role` | enum | `"primary"`, `"secondary"`, or `"fallback"` |

### Failover Strategy

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `strategy` | enum | — | `"weighted-random"`, `"sequential"`, `"primary-only"` |
| `maxRetries` | number | `3` | Max retry attempts per task |
| `cooldownMinutes` | number | `5` | Wait time between retries |
| `disableOnConsecutiveFailures` | number | `3` | Disable executor after N consecutive failures |

### Authentication

```json
{
  "auth": {
    "copilot": { "sources": ["env", "cli"], "interactiveFallback": false },
    "claude": { "sources": ["env", "cli"], "interactiveFallback": false },
    "codex": { "sources": ["config"], "interactiveFallback": true }
  }
}
```

## CLI Reference

### Core Commands

| Command | Description |
|---------|-------------|
| `bosun` | Start supervisor (runs setup on first launch) |
| `bosun --setup` | Launch web-based setup wizard |
| `bosun --setup-terminal` | Terminal setup wizard |
| `bosun --doctor` | Validate config and environment |
| `bosun --where` | Show resolved config directory |

### Daemon Management

| Command | Description |
|---------|-------------|
| `bosun --daemon` / `-d` | Run as background daemon |
| `bosun --stop-daemon` | Stop running daemon |
| `bosun --daemon-status` | Check daemon status |
| `bosun --terminate` | Hard-stop all processes |

### Agent Configuration

| Command | Description |
|---------|-------------|
| `--primary-agent <name>` | Override primary agent (`codex`, `copilot`, `claude`) |
| `--no-codex` | Disable Codex executor |
| `--no-autofix` | Disable automatic error fixing |
| `--shell` / `--interactive` | Enable interactive shell mode |

### Workspace Management

| Command | Description |
|---------|-------------|
| `--workspace-list` | List configured workspaces |
| `--workspace-add <name>` | Create new workspace |
| `--workspace-switch <id>` | Switch active workspace |
| `--workspace-add-repo <url>` | Add repository to workspace |
| `--workspace-health` | Run health diagnostics |

### Task Management

| Command | Description |
|---------|-------------|
| `task list [--status s] [--json]` | List tasks with optional filters |
| `task create <json\|flags>` | Create a new task |
| `task get <id> [--json]` | Show task details |
| `task update <id> <patch>` | Modify task fields |
| `task delete <id>` | Remove a task |
| `task stats [--json]` | Show aggregate statistics |
| `task import <file.json>` | Bulk import tasks |
| `task plan [--count N]` | Trigger AI task planner |

### Notifications

| Command | Description |
|---------|-------------|
| `--no-telegram-bot` | Disable Telegram bot |
| `--telegram-commands` | Enable Telegram polling |
| `--whatsapp-auth` | WhatsApp QR code auth |
| `--whatsapp-auth --pairing-code` | WhatsApp pairing code auth |

### Logging & Output

| Command | Description |
|---------|-------------|
| `--echo-logs` | Tail active monitor log |
| `--log-dir <path>` | Set log directory |
| `--log-level <level>` | `trace`, `debug`, `info`, `warn`, `error`, `silent` |
| `--quiet` / `-q` | Warnings and errors only |
| `--verbose` / `-V` | Debug-level output |

## Workflow Engine

Bosun includes a DAG-based workflow engine (`workflow-engine.mjs`) for complex automation. Workflows are defined as JSON and chain together nodes connected by edges.

### Workflow Structure

```json
{
  "id": "pr-auto-merge",
  "name": "PR Auto-Merge",
  "trigger": {
    "type": "pr_event",
    "events": ["opened", "synchronize"]
  },
  "nodes": [
    {
      "id": "check-ci",
      "type": "validation.build",
      "config": { "ciTimeoutMs": 300000 }
    },
    {
      "id": "auto-merge",
      "type": "action.run_command",
      "config": { "command": "gh pr merge {{prNumber}} --squash" }
    }
  ],
  "edges": [
    { "from": "check-ci", "to": "auto-merge", "condition": "$output.passed === true" }
  ]
}
```

### Node Types

| Category | Type | Description |
|----------|------|-------------|
| **Trigger** | `pr_event` | GitHub PR lifecycle events |
| **Trigger** | `scheduled` | Cron-based execution |
| **Trigger** | `webhook` | External event matching |
| **Trigger** | `manual` | User-initiated |
| **Action** | `action.run_command` | Shell command execution |
| **Action** | `action.run_agent` | Dispatch to AI executor |
| **Action** | `action.delay` | Timed pause |
| **Condition** | `condition.expression` | Boolean routing (yes/no) |
| **Condition** | `condition.switch` | Multi-way branching |
| **Validation** | `validation.build` | CI status check |
| **Notify** | `notify.telegram` | Telegram message |
| **Notify** | `notify.log` | Log output |
| **Transform** | `transform.json_extract` | Field extraction |

### Execution Limits

| Parameter | Default |
|-----------|---------|
| Max concurrent branches | 8 |
| Per-node timeout | 10 minutes |
| Retry attempts | 3 per node |
| History retention | 200 runs |

## Library System

Bosun's library manager provides three reusable artifact types stored in `.bosun/`:

### Prompts (`.bosun/agents/`)

Markdown files defining agent personality or task specialization. Referenced in workflows via `{{prompt:id}}`.

### Agent Profiles (`.bosun/profiles/`)

JSON configurations for complete agent instantiation:

```json
{
  "id": "frontend-specialist",
  "sdk": "claude",
  "model": "claude-sonnet-4-5",
  "scopes": ["src/components/**", "src/pages/**"],
  "titlePatterns": ["*UI*", "*frontend*", "*CSS*"],
  "skills": ["react-best-practices", "accessibility"],
  "env": { "NODE_ENV": "development" }
}
```

### Skills (`.bosun/skills/`)

Markdown documents providing domain knowledge (coding conventions, API patterns, testing requirements) injected into every agent session.

## PR Lifecycle Management

Bosun automates the entire pull request lifecycle:

1. **Open PR** — Agent creates PR with conventional title and description
2. **CI Monitoring** — Watches for CI status (configurable timeout, default 5 min)
3. **Auto-merge** — Merges on CI success (squash, merge, or rebase strategies)
4. **Failure labeling** — Applies `bosun-needs-fix` label on CI failure
5. **Auto-retry** — Re-attempts fix with the same or different executor
6. **Conflict resolution** — Detects merge conflicts, attempts rebase, escalates on failure
7. **Stale cleanup** — Closes PRs inactive for 14+ days (configurable)
8. **Release drafting** — Generates changelog on merge to base branch

## Agent Logging

Structured JSONL logs in `.cache/agent-work-logs/`:

```json
{
  "timestamp": "2026-02-27T14:23:45.123Z",
  "attempt_id": "ve-a1b2-implement-auth",
  "event_type": "error",
  "task_id": "task-uuid-123",
  "executor": "CODEX",
  "model": "claude-sonnet-4-5",
  "data": { "error_message": "...", "error_fingerprint": "git_not_repo" }
}
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AGENT_WORK_LOGGING_ENABLED` | `true` | Enable/disable logging |
| `AGENT_ERROR_LOOP_THRESHOLD` | `4` | Alert after N consecutive errors |
| `AGENT_STUCK_THRESHOLD_MS` | `300000` | Idle detection (5 min) |
| `AGENT_COST_ANOMALY_THRESHOLD` | `1.0` | Cost alert threshold ($) |

## Architecture

### Bosun Core Components

```
bosun/
├── cli.mjs              # CLI entry point
├── monitor.mjs          # Primary orchestration loop
├── config.mjs           # Unified configuration loader
├── ui-server.mjs        # Telegram Mini App backend
├── workflow-engine.mjs  # DAG workflow executor
├── lib/                 # Core libraries
├── .bosun/
│   ├── agents/          # Prompt templates
│   ├── profiles/        # Agent profiles
│   ├── skills/          # Domain knowledge
│   └── library.json     # Library manifest
├── docs/                # Documentation
├── tests/               # Test suites
└── site/                # Marketing website
```

### How It Integrates with AionUi

This assistant clones Bosun's supervisor pattern into AionUi's assistant framework:

| Bosun Concept | AionUi Equivalent |
|---------------|-------------------|
| Executor routing | Agent type selection (`presetAgentType`) |
| Task management | Conversation queue + hooks |
| Workflow engine | Hooks (`onQueueInit`, `onAgentResponse`) |
| Agent profiles | Workspace skills + CLAUDE.md |
| Telegram dashboard | AionUi Channels (Telegram plugin) |
| PR lifecycle | Git operations via agent tools |

### Workspace Structure

```
assistant/bosun-clone/
├── assistant.json              # Metadata, i18n, preset prompts
├── bosun-supervisor.md         # System instructions (English)
├── README.md                   # This documentation
└── workspace/
    ├── CLAUDE.md               # Quick reference for the agent
    ├── .bosun/                 # Bosun library (prompts, profiles, skills)
    └── workflows/              # Workflow templates
```

## Comparison: Bosun vs AionUi Bosun Clone

| Feature | Bosun (Standalone) | AionUi Bosun Clone |
|---------|-------------------|-------------------|
| Runtime | Node.js CLI daemon | AionUi assistant (Electron/WebUI) |
| Executors | Codex, Copilot, Claude | Claude (via AionUi ACP) |
| Notifications | Telegram, WhatsApp | AionUi Channels (Telegram, Lark, DingTalk) |
| Workflows | JSON DAG engine | Hook-based queue system |
| Storage | File-based JSONL | SQLite + file-based |
| PR Management | Built-in automation | Agent-driven via tools |
| Dashboard | Telegram Mini App | AionUi desktop/web UI |

## Resources

- **Bosun Repository**: [github.com/virtengine/bosun](https://github.com/virtengine/bosun)
- **Bosun Docs**: [bosun.virtengine.com/docs](https://bosun.virtengine.com/docs/)
- **Bosun NPM**: `npm install -g bosun`
- **Bosun Schema**: `bosun.schema.json` (full configuration reference)
- **AionUi Assistants**: See `assistant/README.md` for the assistant framework guide

## License

Part of AionUi. Licensed under Apache-2.0.
Bosun is also licensed under Apache-2.0.
