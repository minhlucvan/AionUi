/**
 * aionui-plugin-web-search
 *
 * Example AionUi plugin that adds web search capabilities.
 * Demonstrates all 4 capability types a plugin can provide:
 *
 *   1. System Prompts → tells the agent it has search capabilities
 *   2. Skills         → SKILL.md with search best practices
 *   3. Tools          → web_search and web_fetch function-calling tools
 *   4. MCP Servers    → optional MCP server for search (stdio transport)
 *
 * This works across all AI agents: Claude Code, Gemini, Codex, etc.
 * The same plugin, same tools, same skills — no per-provider adapters needed.
 *
 * Install:
 *   npm: aionui-plugin-web-search
 *   GitHub: your-org/aionui-plugin-web-search
 *   Local: point to this directory
 */

import type {
  AionPlugin,
  PluginContext,
  PluginMcpServer,
  PluginSkillDefinition,
  PluginSystemPrompt,
  PluginToolDefinition,
  ToolExecutionContext,
  ToolResult,
} from '../../src/plugin/types';

// ─── Settings Type ───────────────────────────────────────────────────────────

interface WebSearchSettings {
  searchEngine: 'google' | 'bing' | 'duckduckgo';
  maxResults: number;
  apiKey?: string;
}

// ─── Tool Handlers ───────────────────────────────────────────────────────────

async function handleWebSearch(
  params: Record<string, unknown>,
  context: ToolExecutionContext,
): Promise<ToolResult> {
  const query = params.query as string;
  const settings = context.settings as WebSearchSettings;

  if (!query || typeof query !== 'string') {
    return { success: false, error: 'Missing required parameter: query' };
  }

  context.logger.info(`Searching "${query}" via ${settings.searchEngine}`);

  try {
    // Real implementation would call the search API here.
    // This is a scaffold showing the pattern.
    const results = [
      {
        title: `Result for "${query}"`,
        url: `https://example.com/search?q=${encodeURIComponent(query)}`,
        snippet: `Example search result for "${query}".`,
      },
    ];

    return {
      success: true,
      data: { query, results, totalResults: results.length },
      display: {
        type: 'markdown',
        content: results
          .map((r, i) => `${i + 1}. **[${r.title}](${r.url})**\n   ${r.snippet}`)
          .join('\n\n'),
      },
    };
  } catch (err) {
    return { success: false, error: `Search failed: ${(err as Error).message}` };
  }
}

async function handleWebFetch(
  params: Record<string, unknown>,
  context: ToolExecutionContext,
): Promise<ToolResult> {
  const url = params.url as string;

  if (!url || typeof url !== 'string') {
    return { success: false, error: 'Missing required parameter: url' };
  }

  context.logger.info(`Fetching content from: ${url}`);

  try {
    // Real implementation would fetch and extract text from the URL
    return {
      success: true,
      data: { url, content: `[Content from ${url} would appear here]` },
      display: { type: 'text', content: `Fetched content from ${url}` },
    };
  } catch (err) {
    return { success: false, error: `Fetch failed: ${(err as Error).message}` };
  }
}

// ─── Plugin Definition ───────────────────────────────────────────────────────

const webSearchPlugin: AionPlugin<WebSearchSettings> = {
  id: 'aionui-plugin-web-search',
  version: '1.0.0',

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  activate(context: PluginContext<WebSearchSettings>) {
    context.logger.info(
      `Web Search plugin activated (engine: ${context.settings.searchEngine})`,
    );

    context.onSettingsChange((settings) => {
      context.logger.info(`Settings updated (engine: ${settings.searchEngine})`);
    });
  },

  deactivate() {
    // Cleanup resources if needed
  },

  // ── Capability 1: System Prompts ──────────────────────────────────────────
  //
  // Injected into the first message as [Assistant Rules], just like
  // presetRules or AcpBackendConfig.context. The agent reads these
  // instructions and knows it can search the web.

  systemPrompts: [
    {
      content: [
        'You have access to web search tools provided by the Web Search plugin.',
        'When the user asks about current events, recent documentation, or',
        'anything that would benefit from up-to-date information, use the',
        'web_search tool to find relevant results.',
        '',
        'Available tools:',
        '- web_search: Search the web for information',
        '- web_fetch: Fetch full content from a specific URL',
        '',
        'Always cite your sources with URLs when using search results.',
      ].join('\n'),
      priority: 50,
      // Works with all providers — no filter needed
    },
  ] satisfies PluginSystemPrompt[],

  // ── Capability 2: Skills ──────────────────────────────────────────────────
  //
  // Skills are SKILL.md files that get merged into the built-in skill pool.
  // The agent sees "web-search" in [Available Skills] alongside docx, pdf, etc.
  // The SKILL.md file is in skills/web-search/SKILL.md (file-based).

  skills: [
    {
      name: 'web-search',
      description:
        'Best practices for web searching: query formulation, source evaluation, and result synthesis. When you need to find current information, verify facts, or research a topic.',
      // body is omitted — the host loads from skills/web-search/SKILL.md
    },
  ] satisfies PluginSkillDefinition[],

  // ── Capability 3: Tools ───────────────────────────────────────────────────
  //
  // Function-calling tools the agent can invoke.
  // These work with ALL providers — Claude, Gemini, Codex, any ACP agent.
  // No per-provider adapters needed.

  tools: [
    {
      name: 'web_search',
      description:
        'Search the web for current information. Returns results with titles, URLs, and snippets.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query',
          },
          language: {
            type: 'string',
            description: 'Language for results (e.g., "en", "zh")',
          },
        },
        required: ['query'],
      },
      handler: handleWebSearch,
    },
    {
      name: 'web_fetch',
      description:
        'Fetch and extract text content from a URL. Use when you need the full page content.',
      inputSchema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The URL to fetch content from',
          },
        },
        required: ['url'],
      },
      handler: handleWebFetch,
    },
  ] satisfies PluginToolDefinition[],

  // ── Capability 4: MCP Servers ─────────────────────────────────────────────
  //
  // Optional MCP server that provides the same tools via MCP protocol.
  // This is useful for agents that prefer MCP over function-calling.
  // The server binary is bundled inside the plugin package.

  mcpServers: [
    {
      name: 'web-search-mcp',
      description: 'Web search and fetch via MCP protocol',
      transport: {
        type: 'stdio' as const,
        command: 'node',
        args: ['./dist/mcp-server.js'],
      },
      bundled: true, // command path is relative to plugin root
    },
  ] satisfies PluginMcpServer[],

  // ── Optional: Hooks ───────────────────────────────────────────────────────

  hooks: {
    async onBeforeMessage(ctx) {
      // Pass through — most plugins don't need hooks
      return { message: ctx.message };
    },

    async onSettingsChanged(settings) {
      console.log('[WebSearch] Settings changed:', settings);
    },
  },

  priority: 50,
};

export default webSearchPlugin;
