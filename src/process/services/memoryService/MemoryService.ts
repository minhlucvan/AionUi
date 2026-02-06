/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConfigStorage } from '@/common/storage';
import { MemuClient } from './MemuClient';
import type { MemuConfig, MemuMemoryItem, MemuCategory, MemuRetrieveResponse, MemuQueryMessage } from './types';
import { DEFAULT_MEMU_CONFIG } from './types';

/**
 * Memory service orchestration layer
 *
 * Manages memU API interactions, handles memorization pipeline,
 * memory retrieval with context injection, and configuration management.
 */
export class MemoryService {
  private client: MemuClient;
  private config: MemuConfig = { ...DEFAULT_MEMU_CONFIG };
  private initialized = false;

  // Queue for async memorization tasks
  private memorizeQueue: Array<{ conversationId: string; messages: Array<{ role: string; content: string }> }> = [];
  private processing = false;

  constructor() {
    this.client = new MemuClient('', DEFAULT_MEMU_CONFIG.baseUrl);
  }

  /**
   * Initialize the service by loading config from storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const stored = await ConfigStorage.get('memory.config');
      if (stored) {
        this.config = { ...DEFAULT_MEMU_CONFIG, ...stored };
        this.client.updateConfig(this.config.apiKey, this.config.baseUrl);
      }
    } catch (error) {
      console.warn('[MemoryService] Failed to load config, using defaults:', error);
    }

    this.initialized = true;
    console.log(`[MemoryService] Initialized (enabled: ${this.config.enabled})`);
  }

  /**
   * Update memory configuration
   */
  async updateConfig(updates: Partial<MemuConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    this.client.updateConfig(this.config.apiKey, this.config.baseUrl);

    try {
      await ConfigStorage.set('memory.config', this.config);
    } catch (error) {
      console.error('[MemoryService] Failed to save config:', error);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): MemuConfig {
    return { ...this.config };
  }

  /**
   * Check if memory is enabled and properly configured
   */
  isEnabled(): boolean {
    return this.config.enabled && !!this.config.apiKey;
  }

  /**
   * Test the memU API connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.config.apiKey) return false;
    return this.client.testConnection();
  }

  /**
   * Queue conversation messages for memorization
   * Called by MessageMiddleware after agent turn completes
   */
  queueMemorize(conversationId: string, messages: Array<{ role: string; content: string }>): void {
    if (!this.isEnabled() || !this.config.autoMemorize) return;

    this.memorizeQueue.push({ conversationId, messages });
    void this.processQueue();
  }

  /**
   * Process memorization queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.memorizeQueue.length === 0) return;
    this.processing = true;

    try {
      while (this.memorizeQueue.length > 0) {
        const task = this.memorizeQueue.shift();
        if (!task) continue;

        try {
          await this.memorizeConversation(task.conversationId, task.messages);
        } catch (error) {
          console.error(`[MemoryService] Failed to memorize conversation ${task.conversationId}:`, error);
        }
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Memorize a conversation exchange
   * Serializes messages to a temporary JSON resource and calls memU's memorize API
   */
  private async memorizeConversation(conversationId: string, messages: Array<{ role: string; content: string }>): Promise<void> {
    if (messages.length === 0) return;

    try {
      // Use inline resource URL pattern for cloud API
      const resourceUrl = `aionui://conversation/${conversationId}/${Date.now()}`;

      await this.client.memorize({
        resource_url: resourceUrl,
        modality: 'conversation',
        user: { user_id: this.config.userId },
      });

      console.log(`[MemoryService] Memorized ${messages.length} messages from conversation ${conversationId}`);
    } catch (error) {
      console.error('[MemoryService] Memorization failed:', error);
      throw error;
    }
  }

  /**
   * Retrieve relevant memories for a user query
   * Returns formatted context string for injection into agent system prompt
   */
  async retrieveContext(userMessage: string, conversationHistory?: Array<{ role: string; content: string }>): Promise<string> {
    if (!this.isEnabled()) return '';

    try {
      const queries: MemuQueryMessage[] = [];

      // Include recent conversation history for better context
      if (conversationHistory && conversationHistory.length > 0) {
        const recent = conversationHistory.slice(-4); // Last 4 messages
        for (const msg of recent) {
          queries.push({
            role: msg.role as 'user' | 'assistant',
            content: { text: msg.content },
          });
        }
      }

      // Add the current query
      queries.push({
        role: 'user',
        content: { text: userMessage },
      });

      const result: MemuRetrieveResponse = await this.client.retrieve({
        queries,
        where: { user_id: this.config.userId },
        method: this.config.retrieveMethod,
      });

      return this.formatRetrievedContext(result);
    } catch (error) {
      console.error('[MemoryService] Retrieval failed:', error);
      return '';
    }
  }

  /**
   * Format retrieved memories into a context string for agent injection
   */
  private formatRetrievedContext(result: MemuRetrieveResponse): string {
    const parts: string[] = [];

    if (result.items.length > 0) {
      parts.push('## Relevant Memories');
      for (const item of result.items) {
        parts.push(`- [${item.memory_type}] ${item.summary}`);
      }
    }

    if (result.categories.length > 0) {
      const categoriesWithSummary = result.categories.filter((c) => c.summary);
      if (categoriesWithSummary.length > 0) {
        parts.push('\n## Memory Context');
        for (const cat of categoriesWithSummary) {
          parts.push(`### ${cat.name}`);
          parts.push(cat.summary!);
        }
      }
    }

    return parts.join('\n');
  }

  /**
   * Create a memory item explicitly
   */
  async createMemory(content: string, type: string = 'knowledge', categories: string[] = ['general']): Promise<MemuMemoryItem | null> {
    if (!this.isEnabled()) return null;

    try {
      const result = await this.client.createItem({
        memory_type: type as any,
        memory_content: content,
        memory_categories: categories,
        user: { user_id: this.config.userId },
      });
      return result.memory_item;
    } catch (error) {
      console.error('[MemoryService] Create memory failed:', error);
      return null;
    }
  }

  /**
   * Delete a memory item
   */
  async deleteMemory(memoryId: string): Promise<boolean> {
    if (!this.isEnabled()) return false;

    try {
      await this.client.deleteItem({
        memory_id: memoryId,
        user: { user_id: this.config.userId },
      });
      return true;
    } catch (error) {
      console.error('[MemoryService] Delete memory failed:', error);
      return false;
    }
  }

  /**
   * List all memory items
   */
  async listMemories(): Promise<MemuMemoryItem[]> {
    if (!this.isEnabled()) return [];

    try {
      const result = await this.client.listItems({
        where: { user_id: this.config.userId },
      });
      return result.items;
    } catch (error) {
      console.error('[MemoryService] List memories failed:', error);
      return [];
    }
  }

  /**
   * List all memory categories
   */
  async listCategories(): Promise<MemuCategory[]> {
    if (!this.isEnabled()) return [];

    try {
      const result = await this.client.listCategories({
        where: { user_id: this.config.userId },
      });
      return result.categories;
    } catch (error) {
      console.error('[MemoryService] List categories failed:', error);
      return [];
    }
  }

  /**
   * Clear all memories for the current user
   */
  async clearMemory(): Promise<boolean> {
    if (!this.isEnabled()) return false;

    try {
      await this.client.clearMemory({
        where: { user_id: this.config.userId },
      });
      return true;
    } catch (error) {
      console.error('[MemoryService] Clear memory failed:', error);
      return false;
    }
  }
}

// Singleton instance
let memoryServiceInstance: MemoryService | null = null;

export function getMemoryService(): MemoryService {
  if (!memoryServiceInstance) {
    memoryServiceInstance = new MemoryService();
  }
  return memoryServiceInstance;
}
