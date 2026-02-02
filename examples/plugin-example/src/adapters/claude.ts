/**
 * Claude Code Adapter for Web Search Plugin
 *
 * Adapts the web search tool for Claude Code's ACP protocol.
 * Claude Code supports rich tool definitions and markdown responses.
 */

import type { ProviderToolDefinition } from '../../../src/plugin/types';
import { ClaudeAdapter } from '../../../src/plugin/adapters/ClaudeAdapter';

export class WebSearchClaudeAdapter extends ClaudeAdapter {
  /**
   * Inject system prompt context so Claude knows it can search the web.
   */
  getSystemPrompt(): string {
    return [
      'You have access to a web search tool provided by the Web Search plugin.',
      'When the user asks about current events, recent information, or anything',
      'that might benefit from a web search, use the web_search tool to find',
      'relevant and up-to-date information.',
      '',
      'Always cite your sources when using search results.',
    ].join('\n');
  }

  /**
   * Claude Code tool definitions follow the ACP tool format.
   * Tools are registered with the session and available for function calling.
   */
  getTools(): ProviderToolDefinition[] {
    return [
      {
        name: 'web_search',
        description:
          'Search the web for current information. Use this when the user asks about recent events, documentation, or any topic that benefits from up-to-date web results.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query',
            },
            language: {
              type: 'string',
              description: 'Preferred language code (e.g., "en")',
              default: 'en',
            },
          },
          required: ['query'],
        },
        handler: async (params) => {
          // The actual handler is in the cross-provider tools definition.
          // This adapter-level tool definition is used for provider-specific
          // schema registration. The PluginManager routes execution
          // to the correct handler.
          return { routed: true };
        },
      },
    ];
  }
}
