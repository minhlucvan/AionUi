/**
 * Codex (OpenAI) Adapter for Web Search Plugin
 *
 * Adapts the web search tool for OpenAI Codex's tool_call format.
 * Codex uses OpenAI-compatible function calling with JSON schemas.
 */

import type { AdapterMessage, ProviderToolDefinition } from '../../../src/plugin/types';
import { CodexAdapter } from '../../../src/plugin/adapters/CodexAdapter';

export class WebSearchCodexAdapter extends CodexAdapter {
  /**
   * Codex system prompt injection for search awareness.
   */
  getSystemPrompt(): string {
    return [
      'You have access to a web_search tool that can search the web.',
      'Use it when users need current information or when you need to',
      'verify facts that may have changed since your training cutoff.',
    ].join('\n');
  }

  /**
   * OpenAI function calling schema format.
   */
  getTools(): ProviderToolDefinition[] {
    return [
      {
        name: 'web_search',
        description: 'Search the web for information. Returns titles, URLs, and snippets.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string',
            },
            language: {
              type: 'string',
              description: 'Result language preference',
              enum: ['en', 'zh', 'ja', 'ko', 'es', 'fr', 'de'],
            },
          },
          required: ['query'],
        },
        handler: async (params) => {
          return { routed: true };
        },
      },
    ];
  }

  /**
   * Post-process search results for Codex.
   * Codex works best with concise, structured tool outputs.
   */
  handleToolResult(toolName: string, result: unknown): unknown {
    if (toolName !== 'web_search') return result;

    // Format results as a compact string for Codex's context window
    const data = result as { query: string; results: Array<{ title: string; url: string; snippet: string }> };
    if (!data?.results) return result;

    return {
      ...data,
      formatted: data.results
        .map((r, i) => `[${i + 1}] ${r.title} (${r.url}): ${r.snippet}`)
        .join('\n'),
    };
  }
}
