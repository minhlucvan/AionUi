/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Built-in memory hooks for memU integration.
 *
 * These hooks run automatically when memory is enabled for an assistant:
 * - on-send-message: Retrieves relevant memories and injects them as context
 * - on-agent-response: Queues the response for memorization
 *
 * Unlike file-based hooks (workspace JS files), these are system-level hooks
 * that check the assistant's `memoryEnabled` flag in AcpBackendConfig.
 */

import { ConfigStorage } from '@/common/storage';
import type { AcpBackendConfig } from '@/types/acpTypes';
import { getMemoryService } from '@process/services/memoryService';

/**
 * Check whether memory is enabled for a given assistant.
 *
 * @param presetAssistantId - The assistant's config ID
 * @returns true if the assistant has memoryEnabled=true
 */
async function isMemoryEnabledForAssistant(presetAssistantId?: string): Promise<boolean> {
  if (!presetAssistantId) return false;
  try {
    const service = getMemoryService();
    if (!service.isEnabled()) return false;

    const customAgents = await ConfigStorage.get('acp.customAgents');
    if (!customAgents || !Array.isArray(customAgents)) return false;
    const assistant = customAgents.find((a: AcpBackendConfig) => a.id === presetAssistantId);
    return assistant?.memoryEnabled === true;
  } catch {
    return false;
  }
}

/**
 * Retrieve relevant memory context and prepend it to the user message.
 * Runs on 'on-send-message' for assistants with memory enabled.
 *
 * @param content - The user's message content
 * @param presetAssistantId - The assistant's config ID
 * @returns The content with memory context prepended, or original content
 */
export async function runMemoryRetrieveHook(content: string, presetAssistantId?: string): Promise<string> {
  if (!(await isMemoryEnabledForAssistant(presetAssistantId))) return content;

  try {
    const service = getMemoryService();
    await service.initialize();
    const memoryContext = await service.retrieveContext(content);
    if (memoryContext) {
      return `${memoryContext}\n\n${content}`;
    }
  } catch (error) {
    console.warn('[MemoryHooks] Failed to retrieve memory context:', error);
  }
  return content;
}

/**
 * Queue a completed agent response for memorization.
 * Runs on 'on-agent-response' for assistants with memory enabled.
 *
 * @param conversationId - The conversation ID
 * @param content - The agent's response text
 * @param presetAssistantId - The assistant's config ID
 */
export async function runMemoryMemorizeHook(conversationId: string, content: string, presetAssistantId?: string): Promise<void> {
  if (!(await isMemoryEnabledForAssistant(presetAssistantId))) return;

  try {
    const service = getMemoryService();
    if (!service.isEnabled()) return;

    service.queueMemorize(conversationId, [{ role: 'assistant', content }]);
  } catch (error) {
    console.warn('[MemoryHooks] Failed to queue memorization:', error);
  }
}
