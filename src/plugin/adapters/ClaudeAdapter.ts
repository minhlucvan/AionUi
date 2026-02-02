/**
 * Claude Code Adapter Base
 *
 * Provides Claude-specific adapter behavior. Claude Code communicates via ACP
 * (Agent Communication Protocol), so this adapter understands ACP message
 * formats and injects Claude-compatible tool definitions.
 *
 * Plugin authors extend this class when they need Claude-specific customization.
 *
 * @example
 * ```typescript
 * import { ClaudeAdapter } from '@aionui/plugin-sdk';
 *
 * export class MyClaudeAdapter extends ClaudeAdapter {
 *   getSystemPrompt() {
 *     return 'You have access to the MyPlugin tools...';
 *   }
 *
 *   getTools() {
 *     return [{
 *       name: 'search',
 *       description: 'Search the knowledge base',
 *       parameters: { type: 'object', properties: { query: { type: 'string' } } },
 *       handler: async (params) => ({ results: [] }),
 *     }];
 *   }
 * }
 * ```
 */

import type { AdapterMessage, ProviderToolDefinition } from '../types';
import { BaseProviderAdapter } from './BaseAdapter';

export class ClaudeAdapter extends BaseProviderAdapter {
  /**
   * Claude Code supports rich content blocks. This method ensures
   * the message format is compatible with Claude's expectations.
   */
  transformRequest(message: AdapterMessage): AdapterMessage {
    // Claude Code via ACP expects string content for user messages
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
   * Claude returns markdown-formatted responses. Override this if you need
   * to post-process Claude's output (e.g., extract structured data).
   */
  transformResponse(message: AdapterMessage): AdapterMessage {
    return message;
  }

  /**
   * Return tools in Claude Code's expected format.
   * Tools provided here will be registered with the ACP session.
   */
  getTools(): ProviderToolDefinition[] {
    return [];
  }

  /**
   * Claude Code system prompts are injected as context in the ACP session.
   */
  getSystemPrompt(): string {
    return '';
  }
}
