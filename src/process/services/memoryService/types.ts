/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * memU Memory Service type definitions
 * Based on memU REST API (https://github.com/NevaMind-AI/memU)
 */

// Memory item types supported by memU
export type MemoryType = 'profile' | 'event' | 'knowledge' | 'behavior' | 'skill' | 'tool';

// Memory item extracted from conversations
export interface MemuMemoryItem {
  id: string;
  resource_id?: string;
  memory_type: MemoryType;
  summary: string;
  happened_at?: string;
  extra?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Auto-organized topic grouping
export interface MemuCategory {
  id: string;
  name: string;
  description: string;
  summary?: string;
  created_at: string;
  updated_at: string;
}

// Original data resource (conversation, document, etc.)
export interface MemuResource {
  id: string;
  url: string;
  modality: string;
  local_path: string;
  caption?: string;
  created_at: string;
  updated_at: string;
}

// Modality types for memorize
export type MemuModality = 'conversation' | 'text' | 'audio' | 'video' | 'image' | 'document';

// Retrieval method
export type MemuRetrieveMethod = 'rag' | 'llm';

// Query message format for retrieve
export interface MemuQueryMessage {
  role: 'user' | 'assistant';
  content: { text: string } | string;
}

// --- API Request Types ---

export interface MemuMemorizeRequest {
  resource_url: string;
  modality: MemuModality;
  user?: Record<string, string>;
}

export interface MemuRetrieveRequest {
  queries: MemuQueryMessage[];
  where?: Record<string, string>;
  method?: MemuRetrieveMethod;
}

export interface MemuCreateItemRequest {
  memory_type: MemoryType;
  memory_content: string;
  memory_categories: string[];
  user?: Record<string, string>;
}

export interface MemuDeleteItemRequest {
  memory_id: string;
  user?: Record<string, string>;
}

export interface MemuListRequest {
  where?: Record<string, string>;
}

// --- API Response Types ---

export interface MemuMemorizeResponse {
  resources: MemuResource[];
  items: MemuMemoryItem[];
  categories: MemuCategory[];
}

export interface MemuRetrieveResponse {
  categories: MemuCategory[];
  items: MemuMemoryItem[];
  resources: MemuResource[];
}

export interface MemuCreateItemResponse {
  memory_item: MemuMemoryItem;
  category_updates: MemuCategory[];
}

export interface MemuDeleteItemResponse {
  memory_item: MemuMemoryItem;
  category_updates: MemuCategory[];
}

export interface MemuListItemsResponse {
  items: MemuMemoryItem[];
}

export interface MemuListCategoriesResponse {
  categories: MemuCategory[];
}

export interface MemuClearResponse {
  deleted_categories: MemuCategory[];
  deleted_items: MemuMemoryItem[];
  deleted_resources: MemuResource[];
}

// --- Local Memory Cache Types ---

export interface MemoryCacheRow {
  id: string;
  user_id: string;
  conversation_id?: string;
  category: string;
  content: string; // JSON of the memory item
  relevance_score?: number;
  source: 'memu_cloud' | 'local';
  created_at: number;
  updated_at: number;
}

// --- Config Types ---

export type MemuMode = 'cloud' | 'local';

export interface MemuConfig {
  enabled: boolean;
  mode: MemuMode;
  // Cloud mode settings
  apiKey: string;
  baseUrl: string;
  // Local mode settings
  localPort: number;
  llmBaseUrl: string;
  llmApiKey: string;
  chatModel: string;
  embedModel: string;
  // Shared settings
  userId: string;
  autoMemorize: boolean;
  retrieveMethod: MemuRetrieveMethod;
}

export const DEFAULT_MEMU_CONFIG: MemuConfig = {
  enabled: false,
  mode: 'cloud',
  apiKey: '',
  baseUrl: 'https://api.memu.so',
  localPort: 11411,
  llmBaseUrl: '',
  llmApiKey: '',
  chatModel: 'gpt-4o-mini',
  embedModel: 'text-embedding-3-small',
  userId: 'default',
  autoMemorize: true,
  retrieveMethod: 'rag',
};
