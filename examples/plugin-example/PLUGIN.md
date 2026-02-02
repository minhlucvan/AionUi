# aionui-plugin-web-search

Example plugin demonstrating the AionUi plugin system.

## How Plugins Work

A plugin works like a current agent in AionUi — it bundles the same primitives:

| Plugin Capability | Maps to AionUi Concept |
|-------------------|------------------------|
| **System Prompts** | `presetRules` / `AcpBackendConfig.context` |
| **Skills** | `/skills/*/SKILL.md` (same format) |
| **Tools** | Gemini coreTools / ACP function-calling |
| **MCP Servers** | MCP management (same `IMcpServer` config) |

When a user installs and activates a plugin, all its capabilities become
available to whichever AI agent they're talking to — Claude Code, Gemini,
Codex, or any ACP agent. No per-provider adapters needed.

## What This Plugin Provides

### 1. System Prompt
Tells the agent it has web search capabilities and how to use them.

### 2. Skill: `web-search`
A SKILL.md file with best practices for query formulation, source
evaluation, and result synthesis. Appears in [Available Skills]
alongside docx, pdf, pptx, etc.

### 3. Tools: `web_search` + `web_fetch`
Function-calling tools the agent can invoke to search the web
and fetch full page content.

### 4. MCP Server: `web-search-mcp`
An optional MCP server (stdio transport) that provides the same
tools via the MCP protocol.

## Plugin Structure

```
aionui-plugin-web-search/
├── package.json              # npm metadata + aionui manifest
├── src/
│   └── index.ts              # Plugin entry point (implements AionPlugin)
├── skills/
│   └── web-search/
│       └── SKILL.md          # Skill file (same format as built-in skills)
├── PLUGIN.md
└── tsconfig.json
```

## How to Create Your Own Plugin

### 1. Minimal Plugin (skill only)

```typescript
import type { AionPlugin } from '@aionui/plugin-sdk';

const plugin: AionPlugin = {
  id: 'aionui-plugin-diagram',
  version: '1.0.0',
  activate(ctx) {
    ctx.logger.info('Diagram plugin ready');
  },
  skills: [
    { name: 'mermaid', description: 'Create Mermaid diagrams from text' }
  ],
};

export default plugin;
```

### 2. Plugin with Tools

```typescript
const plugin: AionPlugin = {
  id: 'aionui-plugin-github',
  version: '1.0.0',
  activate(ctx) { /* ... */ },

  systemPrompts: [
    { content: 'You can manage GitHub repos using the github_* tools.' }
  ],

  tools: [
    {
      name: 'github_create_pr',
      description: 'Create a pull request',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          body: { type: 'string' },
        },
        required: ['title'],
      },
      handler: async (params, ctx) => {
        // Create PR via GitHub API
        return { success: true, data: { prUrl: '...' } };
      },
    },
  ],
};
```

### 3. Plugin with MCP Server

```typescript
const plugin: AionPlugin = {
  id: 'aionui-plugin-database',
  version: '1.0.0',
  activate(ctx) { /* ... */ },

  mcpServers: [
    {
      name: 'postgres-mcp',
      description: 'Query PostgreSQL databases',
      transport: { type: 'stdio', command: 'npx', args: ['@modelcontextprotocol/server-postgres'] },
      env: { POSTGRES_URL: 'postgres://...' },
    },
  ],
};
```

## Installation Methods

### From npm
```
Settings → Plugins → Install → Enter: aionui-plugin-web-search
```

### From GitHub
```
Settings → Plugins → Install from GitHub → Enter: your-org/aionui-plugin-web-search
```

### Local Development
```
Settings → Plugins → Install from Local → Select the plugin directory
```
