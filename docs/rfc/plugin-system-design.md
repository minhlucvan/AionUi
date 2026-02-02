# RFC: AionUi Plugin System Design

> **Status**: Draft
> **Authors**: AionUi Team
> **Created**: 2026-02-02

## 1. Summary

This RFC proposes a plugin system for AionUi that allows users to install, configure, and
manage plugins as **npm packages** or **GitHub repositories**. Each plugin ships with
**AI-provider adapters** so it can work seamlessly with Claude Code, Gemini, Codex, and any
future agent backend.

## 2. Motivation

AionUi already supports multiple AI agent backends (Gemini, Codex, ACP/Claude) and a
skills system for prompt-level customization. However, there is no standardized way for
third-party developers to:

- Package and distribute reusable functionality
- Hook into the agent lifecycle (message transform, tool injection, post-processing)
- Provide UI components that render in the AionUi interface
- Adapt their functionality across all supported AI providers

The plugin system addresses these gaps with a first-class, type-safe architecture.

## 3. Design Principles

| Principle | Description |
|-----------|-------------|
| **Install-anywhere** | Plugins install from npm (`npm install aionui-plugin-*`) or GitHub repos |
| **Provider-agnostic** | Every plugin declares adapters per AI provider; the runtime picks the right one |
| **Sandboxed** | Plugins declare capabilities; the host grants or denies them |
| **Progressive** | Light plugins ship only prompt/skill content; rich plugins add tools + UI |
| **Backward-compatible** | Existing skills (`/skills/*`) continue to work unchanged |

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     AionUi Host (Electron)                  │
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│  │ PluginLoader  │──▶│PluginManager │──▶│PluginRegistry│   │
│  │ (npm/github)  │   │ (lifecycle)  │   │ (runtime)    │   │
│  └──────────────┘   └──────┬───────┘   └──────────────┘   │
│                            │                                │
│           ┌────────────────┼────────────────┐              │
│           ▼                ▼                ▼              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│  │ProviderAdapter│ │ProviderAdapter│ │ProviderAdapter│      │
│  │   (Claude)    │ │   (Gemini)   │ │   (Codex)    │      │
│  └──────────────┘ └──────────────┘ └──────────────┘      │
│           │                │                │              │
│           ▼                ▼                ▼              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│  │  ACP Agent    │ │ Gemini Agent │ │  Codex Agent │      │
│  └──────────────┘ └──────────────┘ └──────────────┘      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  Plugin IPC Bridge                    │  │
│  │        (renderer ←→ main process communication)      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 5. Plugin Package Structure

A plugin is an npm-compatible package with this structure:

```
aionui-plugin-example/
├── package.json              # npm metadata + aionui plugin manifest
├── src/
│   ├── index.ts              # Plugin entry point (exports AionPlugin)
│   ├── adapters/
│   │   ├── claude.ts         # Claude Code adapter
│   │   ├── gemini.ts         # Gemini adapter
│   │   └── codex.ts          # Codex adapter
│   ├── tools/                # Custom tool definitions
│   │   └── my-tool.ts
│   └── ui/                   # Optional React components
│       └── SettingsPanel.tsx
├── skills/                   # Optional skill definitions (SKILL.md format)
│   └── SKILL.md
├── PLUGIN.md                 # Plugin documentation
└── tsconfig.json
```

### 5.1 package.json Manifest

```json
{
  "name": "aionui-plugin-example",
  "version": "1.0.0",
  "aionui": {
    "pluginVersion": "1.0",
    "displayName": "Example Plugin",
    "description": "Demonstrates the plugin system",
    "icon": "./assets/icon.png",
    "category": "productivity",
    "capabilities": ["tools", "skills", "ui"],
    "minHostVersion": "1.7.0",
    "adapters": {
      "claude": "./dist/adapters/claude.js",
      "gemini": "./dist/adapters/gemini.js",
      "codex": "./dist/adapters/codex.js"
    },
    "permissions": [
      "fs:read",
      "fs:write",
      "network:fetch",
      "shell:execute"
    ],
    "settings": {
      "apiKey": { "type": "string", "label": "API Key", "secret": true },
      "maxResults": { "type": "number", "label": "Max Results", "default": 10 }
    }
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts"
}
```

## 6. Core Interfaces

### 6.1 Plugin Entry Point

```typescript
export interface AionPlugin<TSettings = Record<string, unknown>> {
  /** Unique plugin identifier (npm package name) */
  readonly id: string;

  /** Semantic version */
  readonly version: string;

  /** Called when the plugin is activated */
  activate(context: PluginContext<TSettings>): Promise<void> | void;

  /** Called when the plugin is deactivated */
  deactivate?(): Promise<void> | void;

  /** Provider-specific adapters */
  adapters?: Partial<Record<AIProvider, ProviderAdapter>>;

  /** Custom tools the plugin provides */
  tools?: PluginTool[];

  /** Skill definitions (alternative to /skills/ directory) */
  skills?: PluginSkill[];

  /** Lifecycle hooks */
  hooks?: PluginHooks;
}
```

### 6.2 Provider Adapter

```typescript
export type AIProvider = 'claude' | 'gemini' | 'codex' | 'acp' | string;

export interface ProviderAdapter {
  /** Transform outgoing user messages before they reach the agent */
  transformRequest?(message: AdapterMessage): AdapterMessage;

  /** Transform incoming agent responses before they reach the UI */
  transformResponse?(message: AdapterMessage): AdapterMessage;

  /** Inject system prompt fragments for this provider */
  getSystemPrompt?(): string;

  /** Return provider-specific tool definitions */
  getTools?(): ProviderToolDefinition[];

  /** Handle a tool call result from the agent */
  handleToolResult?(toolName: string, result: unknown): unknown;

  /** Provider-specific initialization */
  initialize?(config: ProviderAdapterConfig): Promise<void>;
}
```

### 6.3 Plugin Lifecycle Hooks

```typescript
export interface PluginHooks {
  /** Before a message is sent to any agent */
  onBeforeMessage?(ctx: MessageHookContext): Promise<MessageHookResult>;

  /** After a response is received from any agent */
  onAfterResponse?(ctx: ResponseHookContext): Promise<ResponseHookResult>;

  /** When a tool call is about to execute */
  onBeforeToolCall?(ctx: ToolCallHookContext): Promise<ToolCallHookResult>;

  /** After a tool call completes */
  onAfterToolCall?(ctx: ToolCallResultContext): Promise<void>;

  /** When a conversation is created */
  onConversationCreated?(ctx: ConversationContext): Promise<void>;

  /** When a conversation ends */
  onConversationEnded?(ctx: ConversationContext): Promise<void>;

  /** When plugin settings change */
  onSettingsChanged?(settings: Record<string, unknown>): Promise<void>;
}
```

## 7. Installation Flow

### 7.1 npm Install

```
User clicks "Install Plugin" → enters package name
         │
         ▼
PluginLoader.installFromNpm("aionui-plugin-example")
         │
         ▼
npm install --save aionui-plugin-example   (in plugin directory)
         │
         ▼
PluginLoader.loadManifest()   → validate package.json "aionui" field
         │
         ▼
PluginManager.register()      → store in SQLite plugin registry
         │
         ▼
PluginManager.activate()      → call plugin.activate(context)
         │
         ▼
Plugin ready, adapters registered per active AI provider
```

### 7.2 GitHub Install

```
User clicks "Install from GitHub" → enters owner/repo or URL
         │
         ▼
PluginLoader.installFromGithub("owner/repo")
         │
         ▼
git clone --depth 1 https://github.com/owner/repo.git
         │
         ▼
npm install && npm run build   (if build script exists)
         │
         ▼
Same validation + registration flow as npm
```

## 8. Runtime: How Adapters Work

When the user sends a message through AionUi:

```
1. User types message in UI
2. PluginManager.runHooks('onBeforeMessage', message)
   → Each active plugin's hooks.onBeforeMessage() runs in priority order
3. Determine current AI provider (e.g., 'claude')
4. For each active plugin with adapters.claude:
   a. adapter.transformRequest(message)     — modify the message
   b. adapter.getSystemPrompt()             — inject system context
   c. adapter.getTools()                    — register custom tools
5. Send transformed message to the agent (ACP/Gemini/Codex)
6. Agent responds with result
7. For each active plugin (reverse order):
   a. adapter.transformResponse(response)   — post-process
8. PluginManager.runHooks('onAfterResponse', response)
9. Render in UI
```

If the agent calls a **plugin-provided tool**:

```
1. Agent issues tool_call for "plugin:example:myTool"
2. PluginManager routes to the owning plugin
3. Plugin's tool handler executes
4. adapter.handleToolResult() post-processes if needed
5. Result returned to agent
```

## 9. Permissions Model

Plugins declare required permissions in the manifest. The host prompts the user
to approve on first activation:

| Permission | Description |
|-----------|-------------|
| `fs:read` | Read files in the workspace |
| `fs:write` | Write files in the workspace |
| `fs:global` | Access files outside workspace |
| `network:fetch` | Make HTTP requests |
| `shell:execute` | Run shell commands |
| `ui:panel` | Register sidebar panels |
| `ui:overlay` | Show modal/overlay components |
| `clipboard` | Access system clipboard |
| `mcp:server` | Register MCP server tools |

## 10. Plugin Settings

Each plugin declares a settings schema in its manifest. The host renders a settings
UI automatically and persists values in SQLite:

```typescript
export interface PluginSettingDefinition {
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect';
  label: string;
  description?: string;
  default?: unknown;
  secret?: boolean;           // masked input, encrypted storage
  required?: boolean;
  options?: Array<{ label: string; value: string | number }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}
```

## 11. Compatibility with Existing Skills

The current `/skills/` directory with `SKILL.md` files continues to work. Plugins
can optionally include skills in their package. The PluginManager merges both sources:

```
Skill Sources:
  1. Built-in skills:  /skills/SKILL.md          (existing)
  2. Plugin skills:    plugin.skills[]            (new)
  3. Plugin skill dir: plugin-dir/skills/SKILL.md (new)
```

## 12. Plugin SDK (npm package)

A separate `@aionui/plugin-sdk` package provides:

- TypeScript types and interfaces
- Base adapter classes with defaults
- Testing utilities (mock host, mock agents)
- CLI scaffolding (`npx @aionui/plugin-sdk create my-plugin`)

## 13. Security Considerations

1. **Manifest validation** — Zod schema enforces correct structure
2. **Permission gating** — All capabilities require explicit user approval
3. **Sandboxed execution** — Plugins run in a constrained context
4. **Version pinning** — Lock file tracks installed plugin versions
5. **Signature verification** — Future: npm provenance / GPG signing

## 14. Migration Path

| Phase | Scope |
|-------|-------|
| Phase 1 | Core interfaces, PluginManager, PluginLoader (npm + GitHub) |
| Phase 2 | Provider adapters for Claude, Gemini, Codex |
| Phase 3 | Plugin settings UI, permissions prompt |
| Phase 4 | Plugin marketplace / discovery |
| Phase 5 | Hot-reload, plugin dependencies, inter-plugin communication |
