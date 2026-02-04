# RFC: AionUi Plugin System Design

> **Status**: Draft (v2 — capability-based)
> **Authors**: AionUi Team
> **Created**: 2026-02-02

## 1. Summary

A plugin is an **installable capability package** (npm or GitHub) that works
like a current AionUi agent. It bundles **system prompts**, **skills**,
**dedicated tools**, and **MCP servers**. When installed and activated, these
capabilities become available to whichever AI agent the user is talking to —
Claude Code, Gemini, Codex, or any ACP-compatible agent.

## 2. Motivation

AionUi already has a powerful agent architecture with skills (`/skills/*.md`),
system prompts (`presetRules` / `AcpBackendConfig.context`), tools (Gemini
coreTools, ACP function-calling), and MCP servers. But there's no standardized
way to **package and distribute** these capabilities.

The plugin system wraps the same primitives into installable packages:

| Plugin Capability | Existing AionUi Concept |
|-------------------|-------------------------|
| `systemPrompts[]` | `presetRules` / `AcpBackendConfig.context` |
| `skills[]` | `/skills/{name}/SKILL.md` |
| `tools[]` | Gemini coreTools / ACP tool_call |
| `mcpServers[]` | IMcpServer in MCP management |

## 3. Design Principles

| Principle | Description |
|-----------|-------------|
| **Same primitives** | Plugins use the exact same skill/prompt/tool/MCP formats the host already supports |
| **Provider-agnostic** | One plugin definition works across all agents — no per-provider adapters needed |
| **Install-anywhere** | Install from npm, GitHub, or local filesystem |
| **Progressive** | Start with just a skill, add tools later, add MCP when you need it |
| **Sandboxed** | Plugins declare permissions; the host gates access |

## 4. Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      AionUi Host                             │
│                                                              │
│  ┌────────────┐    ┌───────────────┐    ┌──────────────┐    │
│  │PluginLoader│───▶│PluginManager  │───▶│Plugin Registry│    │
│  │(npm/github)│    │  (lifecycle)  │    │  (SQLite/JSON)│    │
│  └────────────┘    └───────┬───────┘    └──────────────┘    │
│                            │                                 │
│         ┌──────────────────┼──────────────────┐             │
│         ▼                  ▼                  ▼             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ System      │  │ Skills       │  │ Tools        │      │
│  │ Prompts     │  │ (SKILL.md)   │  │ (functions)  │      │
│  │             │  │              │  │              │      │
│  │ Injected as │  │ Merged into  │  │ Registered   │      │
│  │ [Assistant  │  │ built-in     │  │ as agent     │      │
│  │  Rules]     │  │ skill pool   │  │ tool defs    │      │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                │                  │  ┌──────────┐ │
│         │                │                  │  │MCP       │ │
│         │                │                  │  │Servers   │ │
│         │                │                  │  │          │ │
│         │                │                  │  │Registered│ │
│         │                │                  │  │alongside │ │
│         │                │                  │  │user MCP  │ │
│         │                │                  │  └────┬─────┘ │
│         ▼                ▼                  ▼       ▼       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Active AI Agent (any provider)            │  │
│  │     Claude Code / Gemini / Codex / ACP agents        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  Plugin IPC Bridge                    │  │
│  │        (renderer ←→ main process communication)      │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## 5. Plugin Package Structure

```
aionui-plugin-example/
├── package.json              # npm metadata + "aionui" manifest
├── src/
│   └── index.ts              # Plugin entry (exports AionPlugin)
├── skills/                   # Skill files (same as /skills/ format)
│   └── my-skill/
│       ├── SKILL.md
│       ├── scripts/          # Bundled scripts
│       └── references/       # Reference docs
├── PLUGIN.md
└── tsconfig.json
```

### 5.1 package.json Manifest

```json
{
  "name": "aionui-plugin-example",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "aionui": {
    "pluginVersion": "1.0",
    "displayName": "Example Plugin",
    "description": "Demonstrates the plugin capability model",
    "category": "ai-tools",
    "minHostVersion": "1.7.0",
    "skills": [
      { "name": "my-skill", "description": "Does something useful" }
    ],
    "tools": [
      { "name": "my_tool", "description": "Performs an action" }
    ],
    "mcpServers": [
      { "name": "my-mcp", "description": "MCP tools", "transport": "stdio" }
    ],
    "permissions": ["network:fetch", "mcp:server"],
    "settings": {
      "apiKey": { "type": "string", "label": "API Key", "secret": true }
    }
  }
}
```

## 6. Core Interface

```typescript
interface AionPlugin<TSettings = Record<string, unknown>> {
  readonly id: string;
  readonly version: string;

  activate(context: PluginContext<TSettings>): Promise<void> | void;
  deactivate?(): Promise<void> | void;

  // ── Capabilities (same primitives as the host) ──────────────────
  systemPrompts?: PluginSystemPrompt[];   // → presetRules / context
  skills?:        PluginSkillDefinition[]; // → /skills/SKILL.md
  tools?:         PluginToolDefinition[];  // → coreTools / tool_call
  mcpServers?:    PluginMcpServer[];       // → IMcpServer config

  hooks?:    PluginHooks;  // optional message hooks
  priority?: number;       // ordering (lower = earlier)
}
```

## 7. How Each Capability Integrates

### 7.1 System Prompts

Plugin system prompts are collected by `PluginManager.collectSystemPrompts()`
and injected into the first message alongside `presetRules`:

```
[Assistant Rules - You MUST follow these instructions]
{presetRules}                    ← existing
{plugin system prompts}          ← new: from active plugins
{skills index}                   ← existing

[User Request]
{user message}
```

### 7.2 Skills

Plugin skills are installed as SKILL.md files in the host's skills directory
(`getSkillsDir()`). The existing `AcpSkillManager` and `loadSkillsContent`
discover them automatically — no changes needed to skill loading code.

```
skills/
├── docx/SKILL.md        ← built-in
├── pdf/SKILL.md         ← built-in
├── web-search/SKILL.md  ← from plugin!
└── diagram/SKILL.md     ← from plugin!
```

### 7.3 Tools

Plugin tools are function-calling definitions with handlers. The PluginManager
collects them via `collectPluginTools()` and the agent bridge registers them
alongside built-in tools. Tool names are namespaced: `plugin:pluginId:toolName`.

### 7.4 MCP Servers

Plugin MCP servers are collected via `collectPluginMcpServers()` and registered
alongside user-configured MCP servers. They use the existing `IMcpServerTransport`
types. For bundled servers, command paths are resolved relative to the plugin root.

## 8. Installation Flow

### npm Install
```
User → Settings → Plugins → Install
     → enters "aionui-plugin-web-search"
     → PluginLoader.installFromNpm()
     → npm install in isolated directory
     → validate package.json "aionui" field
     → PluginManager.register()
     → User clicks "Activate"
     → plugin.activate(context)
     → skills copied to /skills/
     → MCP servers registered
     → system prompts + tools available to all agents
```

### GitHub Install
```
User → Settings → Plugins → Install from GitHub
     → enters "owner/repo"
     → git clone --depth 1
     → npm install && npm run build
     → same validation + registration flow
```

## 9. Runtime Flow

When the user sends a message:

```
1. User types message in UI
2. PluginManager.runBeforeMessageHooks(message)
3. PluginManager.collectSystemPrompts() → injected with presetRules
4. Plugin skill names added to enabledSkills list
5. prepareFirstMessage / prepareFirstMessageWithSkillsIndex runs
   (now includes plugin prompts + plugin skills)
6. Plugin tools registered with the active agent
7. Plugin MCP server tools available to the agent
8. Agent processes message with all capabilities
9. If agent calls a plugin tool → PluginManager.executeTool()
10. PluginManager.runAfterResponseHooks(response)
11. Response rendered in UI
```

## 10. Permissions Model

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

## 11. Compatibility

- **Existing skills** (`/skills/*.md`) continue to work unchanged
- **Existing MCP servers** continue to work unchanged
- **Existing agents** (Gemini, ACP, Codex) continue to work unchanged
- Plugin capabilities are additive — they merge into the existing pools
- No changes required to the current agent code

## 12. Examples

### Skill-only Plugin (simplest)
```typescript
const plugin: AionPlugin = {
  id: 'aionui-plugin-mermaid',
  version: '1.0.0',
  activate(ctx) {},
  skills: [{ name: 'mermaid', description: 'Create Mermaid diagrams' }],
};
```

### Tool Plugin
```typescript
const plugin: AionPlugin = {
  id: 'aionui-plugin-jira',
  version: '1.0.0',
  activate(ctx) {},
  systemPrompts: [{ content: 'You can create and manage Jira issues...' }],
  tools: [{
    name: 'jira_create_issue',
    description: 'Create a Jira issue',
    inputSchema: { type: 'object', properties: { title: { type: 'string' } } },
    handler: async (params, ctx) => ({ success: true, data: { key: 'PROJ-123' } }),
  }],
};
```

### MCP Plugin
```typescript
const plugin: AionPlugin = {
  id: 'aionui-plugin-postgres',
  version: '1.0.0',
  activate(ctx) {},
  mcpServers: [{
    name: 'postgres',
    description: 'Query PostgreSQL databases',
    transport: { type: 'stdio', command: 'npx', args: ['@mcp/server-postgres'] },
  }],
};
```

## 13. Plugin SDK Helpers

The `src/plugin/sdk/pluginHelpers.ts` module provides shared utilities for
plugin authors:

```typescript
import { createScriptRunner, toolSuccess, toolError, validateRequired } from '@aionui/plugin-sdk';

// Create a script runner bound to the plugin's directory
const runner = createScriptRunner({
  pluginDir: ctx.pluginDir,
  exec: ctx.exec,
  cwd: ctx.workspace,
});

// Run a bundled Python script
const result = await runner.python('skills/pdf/scripts/split_pdf.py', [input, output], ctx.logger);

// Run a bundled Node script
const result = await runner.node('scripts/converter.js', [input], ctx.logger);

// Validate required tool parameters
const error = validateRequired(params, ['inputPdf', 'outputPath']);
if (error) return error;
```

## 14. Migration Proof

To validate the architecture, all four document skills were migrated to
standalone plugin packages. Each migration wraps the exact same SKILL.md,
scripts, and resources — proving that built-in capabilities can be
distributed as installable plugins:

| Built-in Skill | Plugin Package | Tools | Scripts |
|---------------|----------------|-------|---------|
| `skills/pdf/` | `plugins/plugin-pdf/` | 6 (split, merge, images, forms...) | 10 Python scripts |
| `skills/pptx/` | `plugins/plugin-pptx/` | 8 (create, extract, thumbnail, ooxml...) | 5 Python + 1 Node |
| `skills/docx/` | `plugins/plugin-docx/` | 5 (unpack, pack, validate, text, images) | 3 Python + templates |
| `skills/xlsx/` | `plugins/plugin-xlsx/` | 1 (recalculate) | 1 Python (recalc.py) |

### Key Migration Patterns

1. **File-based skills**: The PluginManager detects `skills/{name}/SKILL.md`
   in the plugin directory and copies the entire directory tree (scripts,
   references, schemas, templates) into the host's skills directory.

2. **Script execution**: Tool handlers use `context.exec()` (gated by the
   `shell:execute` permission) to run bundled Python/Node scripts. The
   `pluginDir` and `exec` are passed to tool handlers via the extended
   `ToolExecutionContext`.

3. **Same primitives**: Each migrated plugin uses the same four capabilities
   as any new plugin: `systemPrompts[]`, `skills[]`, `tools[]`, and
   optionally `mcpServers[]`.

4. **Zero host changes**: The existing `AcpSkillManager`, `loadSkillsContent`,
   and agent code required no modifications. Plugin skills merge seamlessly
   into the built-in pool.

## 15. Plugin UI and User Interface

### 15.1 IPC Bridge

The plugin system exposes a complete IPC bridge (`src/common/ipcBridge.ts`) for
renderer-to-main process communication:

```typescript
export const plugin = {
  // Query operations
  list: bridge.buildProvider<IBridgeResponse<PluginRegistryEntry[]>, void>('plugin:list'),
  get: bridge.buildProvider<IBridgeResponse<PluginRegistryEntry | undefined>, { pluginId: string }>('plugin:get'),
  listActive: bridge.buildProvider<IBridgeResponse<PluginRegistryEntry[]>, void>('plugin:list-active'),

  // Installation operations
  installNpm: bridge.buildProvider<IBridgeResponse<{ pluginId: string }>, { packageName: string; version?: string }>('plugin:install-npm'),
  installGithub: bridge.buildProvider<IBridgeResponse<{ pluginId: string }>, { repo: string; ref?: string }>('plugin:install-github'),
  installLocal: bridge.buildProvider<IBridgeResponse<{ pluginId: string }>, { dirPath: string }>('plugin:install-local'),

  // Lifecycle operations
  activate: bridge.buildProvider<IBridgeResponse, { pluginId: string }>('plugin:activate'),
  deactivate: bridge.buildProvider<IBridgeResponse, { pluginId: string }>('plugin:deactivate'),
  uninstall: bridge.buildProvider<IBridgeResponse, { pluginId: string }>('plugin:uninstall'),

  // Configuration
  updateSettings: bridge.buildProvider<IBridgeResponse, { pluginId: string; settings: Record<string, unknown> }>('plugin:update-settings'),
  grantPermissions: bridge.buildProvider<IBridgeResponse, { pluginId: string; permissions: PluginPermission[] }>('plugin:grant-permissions'),
  revokePermissions: bridge.buildProvider<IBridgeResponse, { pluginId: string; permissions: PluginPermission[] }>('plugin:revoke-permissions'),

  // Updates
  checkUpdates: bridge.buildProvider<IBridgeResponse<Array<{ pluginId: string; currentVersion: string; latestVersion: string }>>, void>('plugin:check-updates'),

  // Events
  pluginActivated: bridge.buildEmitter<{ pluginId: string }>('plugin:event:activated'),
  pluginDeactivated: bridge.buildEmitter<{ pluginId: string }>('plugin:event:deactivated'),
  pluginError: bridge.buildEmitter<{ pluginId: string; error: string }>('plugin:event:error'),
};
```

### 15.2 React Hooks

The `src/renderer/hooks/usePlugins.ts` module provides a complete set of React
hooks for plugin management:

- `usePlugins()` - Query all installed plugins with real-time updates via event listeners
- `useActivePlugins()` - Query only active plugins
- `usePluginInstall()` - Install plugins from npm, GitHub, or local sources
- `usePluginActions()` - Activate, deactivate, and uninstall plugins
- `usePluginUpdates()` - Check for available plugin updates
- `usePluginPermissions(pluginId)` - Grant and revoke plugin permissions

### 15.3 Plugin Marketplace UI

**Location**: `src/renderer/pages/settings/PluginsMarketplace.tsx`

A VS Code-style marketplace interface with:

- **Hybrid Navigation**: Category sidebar (All Plugins, Installed, Document, Productivity, AI Tools, Code Analysis, Integration, Other) with live counts + global search bar
- **Plugin Grid**: Responsive 3-column grid (1 column on mobile, 2 on tablet, 3 on desktop) showing plugin cards with category badges, state indicators, and action buttons
- **Real-time Search**: Filter plugins by name, description, or ID with instant results
- **Installation Dialog**: Three-tab interface (npm, GitHub, local) with file picker for local plugins
- **Plugin Detail Modal**: Three-tab modal (Overview, Capabilities, Permissions) showing full plugin information

### 15.4 Plugin Settings UI

**Location**: `src/renderer/pages/settings/PluginsSettings.tsx`

Management interface for installed plugins with:

- **Dashboard Stats**: Total plugins, active plugins, inactive plugins counts
- **Plugin Grid**: 2-column responsive grid showing all installed plugins
- **Quick Actions**: Activate, deactivate, uninstall buttons with confirmation dialogs
- **Plugin Details**: Click any plugin to view full details, capabilities, and permissions

### 15.5 UI Components

**Location**: `src/renderer/components/plugins/`

- **PluginCard.tsx**: Reusable card component showing plugin metadata, state badge (Active/Installed/Available/Error), source badge (npm/GitHub/local), capability counts, and action buttons
- **PluginDetailModal.tsx**: Comprehensive modal with tabbed interface for viewing plugin overview (description, requirements, installation details), capabilities (all tools/skills/agents/MCP servers), and permissions
- **PluginInstallDialog.tsx**: Multi-source installation dialog with npm package search, GitHub repository input, and local directory picker with permission approval display

### 15.6 Navigation

Plugins are accessible via Settings in two locations:

- **Settings → Plugins**: Shows installed plugins dashboard
- **Settings → Plugins → Browse Marketplace**: Full marketplace interface with category browsing and search

## 16. Implementation Status

### ✅ Completed (Phases 1-3)

1. **Core Types** (`src/plugin/types/index.ts`)
   - `AionPlugin` interface with systemPrompts, skills, tools, mcpServers
   - `PluginContext` with workspace, logger, settings, exec
   - Permission types and manifest definitions

2. **Plugin Manager** (`src/plugin/PluginManager.ts`)
   - Plugin lifecycle management (register, activate, deactivate, uninstall)
   - Capability collection (system prompts, skills, tools, MCP servers)
   - Permission enforcement and settings management
   - Event emission for UI reactivity

3. **Plugin Loader** (`src/plugin/PluginLoader.ts`)
   - Installation from npm packages with version support
   - Installation from GitHub repositories (owner/repo or full URLs)
   - Installation from local directories (development mode)
   - Manifest validation and dependency resolution

4. **IPC Bridge** (`src/common/ipcBridge.ts`)
   - Complete bidirectional communication layer
   - 15 provider endpoints for plugin operations
   - 3 event emitters for real-time updates
   - Type-safe request/response with IBridgeResponse

5. **Built-in Plugins** (`src/plugin/builtin/`)
   - 6 migrated plugins (PDF, PPTX, DOCX, XLSX, Content Converters, Creators)
   - Proof-of-concept showing skill/tool/agent bundling
   - Demonstrates script execution and file-based skill loading

6. **React Hooks** (`src/renderer/hooks/usePlugins.ts`)
   - 6 specialized hooks for different use cases
   - Real-time event listening with automatic cleanup
   - Error handling and loading states

7. **UI Components** (`src/renderer/components/plugins/`)
   - 3 production-ready React components
   - UnoCSS styling matching app theme
   - Accessibility features (keyboard navigation, ARIA labels)

8. **Settings Pages** (`src/renderer/pages/settings/`)
   - Complete plugin marketplace with category browsing
   - Installed plugins dashboard with stats
   - Responsive design for all screen sizes

### 🚧 Remaining Work (Phase 4)

- **Plugin Discovery**: Public plugin registry/marketplace backend
- **Plugin Updates**: Automated update checking and installation
- **Plugin Dependencies**: Dependency resolution between plugins
- **Plugin Sandboxing**: Process isolation for untrusted plugins
- **Plugin Testing**: Automated testing framework for plugin validation

## 17. Migration Path

| Phase | Scope | Status |
|-------|-------|--------|
| Phase 1 | Core types, PluginManager, PluginLoader, IPC bridge | ✅ Complete |
| Phase 2 | Skill/prompt/tool integration with agent managers | ✅ Complete |
| Phase 3 | Plugin UI (marketplace, settings, components) | ✅ Complete |
| Phase 4 | Plugin discovery, automated updates, sandboxing | 🚧 Planned |
