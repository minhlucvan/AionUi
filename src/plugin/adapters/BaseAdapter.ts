/**
 * Base Provider Adapter
 *
 * Abstract base class that provides sensible defaults for all adapter methods.
 * Plugin authors can extend this class and override only the methods they need.
 */

import type {
  AdapterMessage,
  ProviderAdapter,
  ProviderAdapterConfig,
  ProviderToolDefinition,
} from '../types';

export abstract class BaseProviderAdapter implements ProviderAdapter {
  protected config: ProviderAdapterConfig | null = null;

  async initialize(config: ProviderAdapterConfig): Promise<void> {
    this.config = config;
  }

  async dispose(): Promise<void> {
    this.config = null;
  }

  /** Override to transform outgoing messages */
  transformRequest(message: AdapterMessage): AdapterMessage {
    return message;
  }

  /** Override to transform incoming responses */
  transformResponse(message: AdapterMessage): AdapterMessage {
    return message;
  }

  /** Override to inject system prompt content */
  getSystemPrompt(): string {
    return '';
  }

  /** Override to provide tools for this specific provider */
  getTools(): ProviderToolDefinition[] {
    return [];
  }

  /** Override to post-process tool results */
  handleToolResult(toolName: string, result: unknown): unknown {
    return result;
  }
}
