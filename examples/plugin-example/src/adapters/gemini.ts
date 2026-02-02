/**
 * Gemini Adapter for Web Search Plugin
 *
 * Adapts the web search tool for Google Gemini's function calling format.
 * Gemini has native grounding with Google Search, so this adapter
 * complements it with custom search options.
 */

import type { ProviderToolDefinition } from '../../../src/plugin/types';
import { GeminiAdapter } from '../../../src/plugin/adapters/GeminiAdapter';

export class WebSearchGeminiAdapter extends GeminiAdapter {
  /**
   * Gemini system instructions to explain the search capability.
   */
  getSystemPrompt(): string {
    return [
      'A web search tool is available through the Web Search plugin.',
      'Use the web_search function when you need to look up current',
      'information that may not be in your training data.',
    ].join('\n');
  }

  /**
   * Gemini function declarations use a specific schema format.
   * The Gemini API expects FunctionDeclaration objects.
   */
  getTools(): ProviderToolDefinition[] {
    return [
      {
        name: 'web_search',
        description:
          'Search the web for current information, documentation, or recent events.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query to execute',
            },
            language: {
              type: 'string',
              description: 'Language code for results (default: en)',
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
}
