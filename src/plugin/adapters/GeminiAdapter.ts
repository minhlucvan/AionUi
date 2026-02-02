/**
 * Gemini Adapter Base
 *
 * Provides Gemini-specific adapter behavior. Gemini uses function calling
 * with a specific schema format and supports multimodal content.
 *
 * Plugin authors extend this class for Gemini-specific customization.
 *
 * @example
 * ```typescript
 * import { GeminiAdapter } from '@aionui/plugin-sdk';
 *
 * export class MyGeminiAdapter extends GeminiAdapter {
 *   getTools() {
 *     return [{
 *       name: 'analyze_image',
 *       description: 'Analyze an image using custom ML model',
 *       parameters: {
 *         type: 'object',
 *         properties: {
 *           imagePath: { type: 'string', description: 'Path to the image' }
 *         },
 *         required: ['imagePath'],
 *       },
 *       handler: async (params) => {
 *         // Gemini can handle multimodal inputs
 *         return { analysis: 'Image contains...' };
 *       },
 *     }];
 *   }
 * }
 * ```
 */

import type { AdapterMessage, ProviderToolDefinition } from '../types';
import { BaseProviderAdapter } from './BaseAdapter';

export class GeminiAdapter extends BaseProviderAdapter {
  /**
   * Gemini supports multimodal content blocks. This method ensures
   * content arrays are properly formatted for the Gemini API.
   */
  transformRequest(message: AdapterMessage): AdapterMessage {
    // Gemini handles both string and structured content natively
    return message;
  }

  /**
   * Gemini responses may include function call responses and multimodal content.
   * Override for custom post-processing.
   */
  transformResponse(message: AdapterMessage): AdapterMessage {
    return message;
  }

  /**
   * Return tools in Gemini's function declaration format.
   * These will be registered with the Gemini client's tool configuration.
   */
  getTools(): ProviderToolDefinition[] {
    return [];
  }

  /**
   * Gemini system instructions are set at the model level.
   * The returned string will be appended to the system instruction.
   */
  getSystemPrompt(): string {
    return '';
  }
}
