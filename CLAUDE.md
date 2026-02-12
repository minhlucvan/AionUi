# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AionUi** is a unified AI agent graphical interface that transforms command-line AI agents into a modern, efficient chat interface. It supports multiple CLI AI tools including Gemini CLI (built-in), Claude Code, CodeX, Qwen Code, and more.

- **Version**: 1.8.6
- **License**: Apache-2.0
- **Platform**: Cross-platform (macOS, Windows, Linux)

## Tech Stack

### Core

- **Electron 37.x** - Desktop application framework
- **React 19.x** - UI framework
- **TypeScript 5.8.x** - Programming language
- **Express 5.x** - Web server (for WebUI remote access)

### Build Tools

- **Webpack 6.x** - Module bundler (via @electron-forge/plugin-webpack)
- **Electron Forge 7.8.x** - Build tooling
- **Electron Builder 26.x** - Application packaging

### UI & Styling

- **Arco Design 2.x** - Enterprise UI component library
- **UnoCSS 66.x** - Atomic CSS engine
- **Monaco Editor 4.x** - Code editor

### AI Integration

- **Anthropic SDK** - Claude API
- **Google GenAI** - Gemini API
- **OpenAI SDK** - OpenAI API
- **MCP SDK** - Model Context Protocol

### Data & Storage

- **Better SQLite3** - Local database
- **Zod** - Data validation

## Development Commands

```bash
# Development
npm start              # Start dev environment
npm run webui          # Start WebUI server

# Code Quality
npm run lint           # Run ESLint
npm run lint:fix       # Auto-fix lint issues
npm run format         # Format with Prettier

# Testing
npm test               # Run all tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
npm test -- path/to/test.spec.ts  # Run specific test

# Building
npm run build          # Full build (macOS arm64 + x64)
npm run dist:mac       # macOS build
npm run dist:win       # Windows build
npm run dist:linux     # Linux build
```

## Architecture Overview

### Multi-Process Model

- **Main Process**: Application logic, database, IPC handling
- **Renderer Process**: React UI
- **Worker Processes**: Background AI tasks (gemini, codex, acp workers)

### IPC Communication System

- **Pattern**: Hub-and-spoke with type-safe bridges
- **Key Files**: `src/preload.ts`, `src/process/bridge/index.ts`, `src/common/ipcBridge.ts`
- Uses single `ADAPTER_BRIDGE_EVENT_KEY` channel with 23+ specialized bridge modules
- **Important**: Bridge initialization order matters (dependencies in `bridge/index.ts`)

### Database Layer

- **Location**: `{userData}/aionui.db`
- **Key File**: `src/process/database/index.ts` (1800+ lines)
- **Key Tables**: `users`, `conversations`, `messages`, `workspaces`, `assistant_plugins`, `assistant_sessions`
- **Pattern**: Singleton with row converters, migration system via `PRAGMA user_version`
- Auto-backups corrupted databases to `.db.backup.{timestamp}`

### Workspace System

- **Key Files**: `src/renderer/context/WorkspaceContext.tsx`, `src/process/bridge/workspaceBridge.ts`
- Groups conversations by directory path
- Always has one `defaultWorkspace` (auto-created as "Home")
- Conversations linked via `workspace_id` foreign key

### Worker Process System

- **Key File**: `src/process/WorkerManage.ts`
- **Pattern**: Task pool with in-memory caching
- Retrieval fallback: cache → database → file storage
- `yoloMode` flag auto-approves tool calls (for cron jobs)

### Channel/Plugin System

- **Key Files**: `src/channels/types.ts`, `src/channels/core/ChannelManager.ts`
- **Pattern**: Adapter pattern for multi-platform integration
- Supported: Telegram, Lark, Slack, Discord, Mezon
- Platform messages → `IUnifiedIncomingMessage` → `ActionExecutor` → Agent → `IUnifiedOutgoingMessage` → Platform

### MCP Integration

- **Key Files**: `src/process/services/mcpServices/McpProtocol.ts`, per-agent implementations
- Each AI agent has separate MCP implementation and config
- Supports transports: stdio, SSE, HTTP, streamable_http
- Uses `withLock()` to prevent race conditions

### Settings/Configuration

- **Key File**: `src/process/initStorage.ts` (1000+ lines)
- **Storage**: File-based (JSON, base64) + Database (SQLite)
- **Key Configs**: `gemini.config`, `acp.config`, `acp.customAgents`, `model.config`, `mcp.config`, `skills.disabledSkills`
- `initStorage()` must run before any storage operations

## Code Conventions

### Naming

- **Components**: PascalCase (`Button.tsx`, `Modal.tsx`)
- **Utilities**: camelCase (`formatDate.ts`)
- **Constants**: UPPER_SNAKE_CASE
- **Unused params**: prefix with `_`

### TypeScript

- Strict mode enabled
- Use path aliases: `@/*`, `@process/*`, `@renderer/*`, `@worker/*`
- Prefer `type` over `interface` (per ESLint config)

### React

- Functional components only
- Hooks: `use*` prefix
- Event handlers: `on*` prefix
- Props interface: `${ComponentName}Props`

### Styling

- UnoCSS atomic classes preferred
- CSS modules for component-specific styles: `*.module.css`
- Use Arco Design semantic colors

## Git Conventions

### Commit Messages

- **Format**: `<type>(<scope>): <subject>`
- **Types**: feat, fix, refactor, chore, docs, test, style, perf

Examples:

```
feat(cron): implement scheduled task system
fix(webui): correct modal z-index issue
chore: remove debug console.log statements
```

### No AI Signature (MANDATORY)

**NEVER add any AI-related signatures to commits.** This includes but is not limited to:

- `Co-Authored-By: Claude` or any Claude-related attribution
- `Co-Authored-By: <any AI assistant>`
- `🤖 Generated with Claude` or similar markers
- Any other AI tool signatures or attributions

This is a strict rule. Violating this will pollute the git history.

## Internationalization (i18n)

Supported languages: English (en-US), Chinese Simplified (zh-CN), Chinese Traditional (zh-TW), Japanese (ja-JP), Korean (ko-KR)

Translation files: `src/renderer/i18n/locales/*.json`

### Critical Rules

1. **ALL** user-visible text must use `t()` function
2. New keys use flat format: `module.feature.detail` (e.g., `cron.form.title`)
3. **MUST** add keys to ALL 5 locale files simultaneously
4. No hardcoded Chinese/English strings in JSX
5. Use `common.*` for shared text (`common.save`, `common.cancel`)

### Workflow

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <button>{t('module.feature.action')}</button>;
}
```

### Verification

```bash
# Check sync across locales
diff <(grep -oE '"[a-zA-Z0-9_.]+":' src/renderer/i18n/locales/en-US.json | sort) \
     <(grep -oE '"[a-zA-Z0-9_.]+":' src/renderer/i18n/locales/zh-CN.json | sort)
```

For detailed guidelines, see `.claude/skills/i18n/SKILL.md`.

## Common Pitfalls

1. **Bridge Initialization Order**: Bridges depend on each other. Check `src/process/bridge/index.ts` for correct order.
2. **Workspace Context**: Always use `WorkspaceContext` to get `effectiveWorkspace` when querying conversations.
3. **MCP Race Conditions**: Use `withLock()` in MCP operations to prevent concurrent modifications.
4. **Database Migrations**: Increment `SCHEMA_VERSION` and add migration function when changing schema.
5. **Worker Memory Leaks**: Always call `kill()` when conversation ends or `clear()` on app shutdown.

## Key Files to Understand

**Entry Points**:

- `src/index.ts` - Main process entry, app lifecycle
- `src/preload.ts` - IPC security setup

**Core Systems**:

- `src/process/bridge/index.ts` - Bridge initialization sequence
- `src/process/database/index.ts` - Database operations (1800+ lines)
- `src/process/initStorage.ts` - Configuration initialization (1000+ lines)
- `src/process/WorkerManage.ts` - Task lifecycle management

**State Management**:

- `src/renderer/context/WorkspaceContext.tsx` - Workspace state
- `src/channels/types.ts` - Channel system types

**Build Configuration**:

- `forge.config.ts` - Electron Forge build config
- `uno.config.ts` - UnoCSS styling config
- `.eslintrc.json` - Linting rules
- `jest.config.js` - Test configuration

## Native Modules

The following require special handling during build:

- `better-sqlite3` - Database
- `node-pty` - Terminal emulation
- `tree-sitter` - Code parsing

These are configured as externals in Webpack.

## Testing

- **Framework**: Jest + ts-jest
- **Structure**: `tests/unit/`, `tests/integration/`, `tests/contract/`
- Run with `npm test`

## Additional Resources

- **WebUI Guide**: `WEBUI_GUIDE.md` - Remote access setup
- **Code Style**: `CODE_STYLE.md` - Detailed style guide (Chinese)
- **Issues**: https://github.com/iOfficeAI/AionUi/issues
- **Wiki**: https://github.com/iOfficeAI/AionUi/wiki
