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

## 15. Migration Path

| Phase | Scope |
|-------|-------|
| Phase 1 | Core types, PluginManager, PluginLoader, IPC bridge |
| Phase 2 | Skill/prompt/tool integration with agent managers |
| Phase 3 | Plugin settings UI, permissions prompt |
| Phase 4 | Plugin marketplace / discovery |
