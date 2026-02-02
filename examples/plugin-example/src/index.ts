/**
 * aionui-plugin-web-search
 *
 * Example plugin demonstrating the AionUi plugin system.
 * This plugin adds a "web_search" tool that works across all AI providers
 * (Claude Code, Gemini, Codex) through provider-specific adapters.
 *
 * Usage:
 *   npm install aionui-plugin-web-search
 *   # Then enable in AionUi Settings → Plugins
 */

import type {
  AionPlugin,
  PluginContext,
  PluginHooks,
  PluginTool,
  ProviderAdapter,
  ToolExecutionContext,
  ToolExecutionResult,
} from '../../src/plugin/types';

import { WebSearchClaudeAdapter } from './adapters/claude';
import { WebSearchCodexAdapter } from './adapters/codex';
import { WebSearchGeminiAdapter } from './adapters/gemini';

// ─── Plugin Settings Type ────────────────────────────────────────────────────

interface WebSearchSettings {
  searchEngine: 'google' | 'bing' | 'duckduckgo';
  maxResults: number;
  apiKey?: string;
}

// ─── Search Tool Implementation ──────────────────────────────────────────────

async function executeWebSearch(
  params: Record<string, unknown>,
  context: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const query = params.query as string;
  const maxResults = (context.settings as WebSearchSettings).maxResults ?? 5;

  if (!query || typeof query !== 'string') {
    return { success: false, error: 'Missing required parameter: query' };
  }

  context.logger.info(`Searching for: "${query}" (max ${maxResults} results)`);

  try {
    // In a real plugin, this would call the actual search API
    // This is a demonstration of the tool execution pattern
    const results = [
      {
        title: `Search result for "${query}"`,
        url: `https://example.com/search?q=${encodeURIComponent(query)}`,
        snippet: `This is an example search result for the query "${query}".`,
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
    return {
      success: false,
      error: `Search failed: ${(err as Error).message}`,
    };
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

    // Subscribe to settings changes
    context.onSettingsChange((settings) => {
      context.logger.info(`Settings updated (engine: ${settings.searchEngine})`);
    });

    // Subscribe to provider changes
    context.onProviderChange((provider) => {
      context.logger.info(`Provider changed to: ${provider}`);
    });
  },

  deactivate() {
    // Cleanup resources if needed
  },

  // ── Provider Adapters ─────────────────────────────────────────────────────

  adapters: {
    claude: new WebSearchClaudeAdapter(),
    gemini: new WebSearchGeminiAdapter(),
    codex: new WebSearchCodexAdapter(),
  } as Record<string, ProviderAdapter>,

  // ── Cross-Provider Tools ──────────────────────────────────────────────────

  tools: [
    {
      name: 'web_search',
      description: 'Search the web for information. Returns relevant search results with titles, URLs, and snippets.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to look up',
          },
          language: {
            type: 'string',
            description: 'Language for results (e.g., "en", "zh")',
            default: 'en',
          },
        },
        required: ['query'],
      },
      handler: executeWebSearch,
    } satisfies PluginTool,
  ],

  // ── Lifecycle Hooks ───────────────────────────────────────────────────────

  hooks: {
    async onBeforeMessage(ctx) {
      // Example: Auto-detect search intent and add context
      const content = typeof ctx.message.content === 'string'
        ? ctx.message.content
        : '';

      // No transformation needed, pass through
      return { message: ctx.message };
    },

    async onAfterResponse(ctx) {
      // Example: Could post-process responses to add source citations
      return { response: ctx.response };
    },
  } satisfies PluginHooks,

  // Plugin priority (lower = earlier in pipeline)
  priority: 50,
};

// ── Export ────────────────────────────────────────────────────────────────────

export default webSearchPlugin;
