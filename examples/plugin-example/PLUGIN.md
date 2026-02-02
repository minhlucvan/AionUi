# aionui-plugin-web-search

Example plugin demonstrating the AionUi plugin system architecture.

## What This Plugin Does

Adds a `web_search` tool that works across all AI providers:
- **Claude Code** — Registered via ACP session tools
- **Gemini** — Registered as Gemini function declarations
- **Codex** — Registered as OpenAI function calling tools

Each provider gets a tailored adapter that formats the tool definition
and system prompt in the provider's native format.

## Plugin Structure

```
src/
├── index.ts                # Plugin entry point (implements AionPlugin)
├── adapters/
│   ├── claude.ts           # Claude Code adapter (extends ClaudeAdapter)
│   ├── gemini.ts           # Gemini adapter (extends GeminiAdapter)
│   └── codex.ts            # Codex adapter (extends CodexAdapter)
```

## How to Create Your Own Plugin

1. Create a new npm package
2. Add the `aionui` field to `package.json` (see this example)
3. Implement the `AionPlugin` interface in your entry point
4. Create adapter classes for each AI provider you want to support
5. Publish to npm or push to GitHub

### Minimal Plugin

```typescript
import type { AionPlugin } from '@aionui/plugin-sdk';

const myPlugin: AionPlugin = {
  id: 'my-plugin',
  version: '1.0.0',
  activate(ctx) {
    ctx.logger.info('Hello from my plugin!');
  },
};

export default myPlugin;
```

### Plugin with Adapters

```typescript
import { ClaudeAdapter, GeminiAdapter } from '@aionui/plugin-sdk';

class MyClaude extends ClaudeAdapter {
  getSystemPrompt() { return 'Custom instructions for Claude...'; }
  getTools() { return [/* tool definitions */]; }
}

class MyGemini extends GeminiAdapter {
  getSystemPrompt() { return 'Custom instructions for Gemini...'; }
  getTools() { return [/* tool definitions */]; }
}

const plugin: AionPlugin = {
  id: 'my-plugin',
  version: '1.0.0',
  activate(ctx) { /* ... */ },
  adapters: {
    claude: new MyClaude(),
    gemini: new MyGemini(),
  },
};
```

## Installation Methods

### From npm
```
# In AionUi Settings → Plugins → Install
# Enter: aionui-plugin-web-search
```

### From GitHub
```
# In AionUi Settings → Plugins → Install from GitHub
# Enter: your-org/aionui-plugin-web-search
```

### Local Development
```
# In AionUi Settings → Plugins → Install from Local
# Select the plugin directory
```
