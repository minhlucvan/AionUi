/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  MemuMemorizeRequest,
  MemuMemorizeResponse,
  MemuRetrieveRequest,
  MemuRetrieveResponse,
  MemuCreateItemRequest,
  MemuCreateItemResponse,
  MemuDeleteItemRequest,
  MemuDeleteItemResponse,
  MemuListItemsResponse,
  MemuListCategoriesResponse,
  MemuClearResponse,
  MemuListRequest,
} from './types';

/**
 * REST API client for memU Cloud (https://api.memu.so)
 * Wraps the memU v3 API endpoints with typed request/response handling
 */
export class MemuClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://api.memu.so') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  updateConfig(apiKey: string, baseUrl?: string): void {
    this.apiKey = apiKey;
    if (baseUrl) {
      this.baseUrl = baseUrl.replace(/\/+$/, '');
    }
  }

  private async request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`memU API error ${response.status}: ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Memorize content from a resource (conversation, document, etc.)
   * Extracts memory facts, auto-categorizes, and stores them
   */
  async memorize(params: MemuMemorizeRequest): Promise<MemuMemorizeResponse> {
    return this.request<MemuMemorizeResponse>('POST', '/api/v3/memory/memorize', params);
  }

  /**
   * Retrieve relevant memories based on query context
   * Supports RAG-based (fast) and LLM-based (deep reasoning) methods
   */
  async retrieve(params: MemuRetrieveRequest): Promise<MemuRetrieveResponse> {
    return this.request<MemuRetrieveResponse>('POST', '/api/v3/memory/retrieve', params);
  }

  /**
   * Create a single memory item explicitly
   */
  async createItem(params: MemuCreateItemRequest): Promise<MemuCreateItemResponse> {
    return this.request<MemuCreateItemResponse>('POST', '/api/v3/memory/items', params);
  }

  /**
   * Delete a specific memory item
   */
  async deleteItem(params: MemuDeleteItemRequest): Promise<MemuDeleteItemResponse> {
    return this.request<MemuDeleteItemResponse>('DELETE', '/api/v3/memory/items', params);
  }

  /**
   * List all memory items, optionally filtered by user
   */
  async listItems(params?: MemuListRequest): Promise<MemuListItemsResponse> {
    return this.request<MemuListItemsResponse>('POST', '/api/v3/memory/items/list', params || {});
  }

  /**
   * List all auto-generated memory categories
   */
  async listCategories(params?: MemuListRequest): Promise<MemuListCategoriesResponse> {
    return this.request<MemuListCategoriesResponse>('POST', '/api/v3/memory/categories', params || {});
  }

  /**
   * Clear all memories for a user scope
   */
  async clearMemory(params?: MemuListRequest): Promise<MemuClearResponse> {
    return this.request<MemuClearResponse>('POST', '/api/v3/memory/clear', params || {});
  }

  /**
   * Test API connection by listing categories
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.listCategories();
      return true;
    } catch {
      return false;
    }
  }
}
