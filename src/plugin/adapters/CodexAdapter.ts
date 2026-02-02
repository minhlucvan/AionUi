/**
 * Codex Adapter Base
 *
 * Provides Codex-specific adapter behavior. Codex (OpenAI) uses tool_call
 * messages with JSON schemas and has specific permission/sandbox models.
 *
 * Plugin authors extend this class for Codex-specific customization.
 *
 * @example
 * ```typescript
 * import { CodexAdapter } from '@aionui/plugin-sdk';
 *
 * export class MyCodexAdapter extends CodexAdapter {
 *   getTools() {
 *     return [{
 *       name: 'run_tests',
 *       description: 'Run the project test suite',
 *       parameters: {
 *         type: 'object',
 *         properties: {
 *           pattern: { type: 'string', description: 'Test file pattern' }
 *         },
 *       },
 *       handler: async (params) => {
 *         return { passed: 42, failed: 0 };
 *       },
 *     }];
 *   }
 * }
 * ```
 */

import type { AdapterMessage, ProviderToolDefinition } from '../types';
import { BaseProviderAdapter } from './BaseAdapter';

export class CodexAdapter extends BaseProviderAdapter {
  /**
   * Codex expects OpenAI-compatible message formats.
   * Ensures content is serialized properly for the Codex agent.
   */
  transformRequest(message: AdapterMessage): AdapterMessage {
    // Codex via OpenAI format expects string content for most messages
    if (typeof message.content !== 'string' && Array.isArray(message.content)) {
      const textParts = message.content
        .filter((p) => p.type === 'text' && p.text)
        .map((p) => p.text)
        .join('\n');

      return { ...message, content: textParts };
    }

    return message;
  }

  /**
   * Codex responses follow OpenAI's chat completion format.
   * Override for custom post-processing.
   */
  transformResponse(message: AdapterMessage): AdapterMessage {
    return message;
  }

  /**
   * Return tools in OpenAI's function calling schema format.
   * These will be registered with the Codex session.
   */
  getTools(): ProviderToolDefinition[] {
    return [];
  }

  /**
   * System prompt content for the Codex agent.
   * Will be included in the system message.
   */
  getSystemPrompt(): string {
    return '';
  }
}
