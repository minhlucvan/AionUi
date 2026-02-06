/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { getMemoryService } from '@process/services/memoryService';

/**
 * Initialize memory IPC bridge handlers
 * Exposes memU memory operations to the renderer process
 */
export function initMemoryBridge(): void {
  const service = getMemoryService();

  // Get current memory configuration
  ipcBridge.memory.getConfig.provider(async () => {
    await service.initialize();
    return { success: true, data: service.getConfig() };
  });

  // Update memory configuration
  ipcBridge.memory.updateConfig.provider(async (updates) => {
    try {
      await service.initialize();
      await service.updateConfig(updates);
      return { success: true };
    } catch (error: any) {
      return { success: false, msg: error.message };
    }
  });

  // Test memU API connection
  ipcBridge.memory.testConnection.provider(async () => {
    try {
      await service.initialize();
      const connected = await service.testConnection();
      return { success: true, data: { connected } };
    } catch (error: any) {
      return { success: false, msg: error.message, data: { connected: false } };
    }
  });

  // Retrieve relevant memories for a query
  ipcBridge.memory.retrieve.provider(async ({ query, conversationHistory }) => {
    try {
      await service.initialize();
      const context = await service.retrieveContext(query, conversationHistory);
      return { success: true, data: { context } };
    } catch (error: any) {
      return { success: false, msg: error.message, data: { context: '' } };
    }
  });

  // List all memory items
  ipcBridge.memory.listItems.provider(async () => {
    try {
      await service.initialize();
      const items = await service.listMemories();
      return { success: true, data: { items } };
    } catch (error: any) {
      return { success: false, msg: error.message, data: { items: [] } };
    }
  });

  // List all memory categories
  ipcBridge.memory.listCategories.provider(async () => {
    try {
      await service.initialize();
      const categories = await service.listCategories();
      return { success: true, data: { categories } };
    } catch (error: any) {
      return { success: false, msg: error.message, data: { categories: [] } };
    }
  });

  // Create a memory item
  ipcBridge.memory.createItem.provider(async ({ content, type, categories }) => {
    try {
      await service.initialize();
      const item = await service.createMemory(content, type, categories);
      return { success: true, data: { item } };
    } catch (error: any) {
      return { success: false, msg: error.message, data: { item: null } };
    }
  });

  // Delete a memory item
  ipcBridge.memory.deleteItem.provider(async ({ memoryId }) => {
    try {
      await service.initialize();
      const deleted = await service.deleteMemory(memoryId);
      return { success: deleted, msg: deleted ? undefined : 'Failed to delete memory' };
    } catch (error: any) {
      return { success: false, msg: error.message };
    }
  });

  // Clear all memories
  ipcBridge.memory.clearAll.provider(async () => {
    try {
      await service.initialize();
      const cleared = await service.clearMemory();
      return { success: cleared, msg: cleared ? undefined : 'Failed to clear memories' };
    } catch (error: any) {
      return { success: false, msg: error.message };
    }
  });

  console.log('[MemoryBridge] Initialized');
}
