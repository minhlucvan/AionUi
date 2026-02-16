/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ResponseHookRunner
 *
 * Listens to the unified response stream and fires `onReceiveMessage` hooks
 * when an agent response finishes. This enables assistant hooks to parse
 * agent output and queue follow-up messages (e.g., Ralph's autonomous loop).
 *
 * Flow:
 * 1. Agent emits streaming content chunks (type: 'content')
 * 2. Agent emits 'finish' signal when done
 * 3. ResponseHookRunner fires onReceiveMessage with accumulated content
 * 4. If hook returns queueMessage, schedules a follow-up message to the agent
 */

import * as path from 'path';
import { ipcBridge } from '@/common';
import { uuid } from '@/common/utils';
import type { IResponseMessage } from '@/common/ipcBridge';
import { getDatabase } from '@process/database/export';
import { getAssistantsDir } from '@process/initStorage';
import { runHooks } from './HookRunner';
import WorkerManage from '@process/WorkerManage';

/** Per-conversation response accumulator */
const responseBuffers = new Map<string, string>();

/** Track active listener to avoid double-registration */
let listenerCleanup: (() => void) | null = null;

/**
 * Resolve the assistant hooks directory for a conversation.
 * Returns the assistantPath if the conversation has a presetAssistantId.
 */
function resolveAssistantPath(conversationId: string): string | undefined {
  try {
    const db = getDatabase();
    const result = db.getConversation(conversationId);
    if (result.success && result.data?.extra?.presetAssistantId) {
      return path.join(getAssistantsDir(), result.data.extra.presetAssistantId);
    }
  } catch {
    // Database not ready or conversation not found
  }
  return undefined;
}

/**
 * Resolve workspace path for a conversation
 */
function resolveWorkspace(conversationId: string): string | undefined {
  try {
    const db = getDatabase();
    const result = db.getConversation(conversationId);
    if (result.success && result.data?.extra?.workspace) {
      return result.data.extra.workspace;
    }
  } catch {
    // Database not ready or conversation not found
  }
  return undefined;
}

/**
 * Handle a response stream message.
 * Accumulates content and fires hooks on finish.
 */
async function handleResponseMessage(msg: IResponseMessage): Promise<void> {
  const conversationId = msg.conversation_id;
  if (!conversationId) return;

  // Accumulate content chunks
  if (msg.type === 'content' && typeof msg.data === 'string') {
    const buffer = (responseBuffers.get(conversationId) ?? '') + msg.data;
    responseBuffers.set(conversationId, buffer);
    return;
  }

  // On finish, fire onReceiveMessage hooks
  if (msg.type === 'finish') {
    const content = responseBuffers.get(conversationId) ?? '';
    responseBuffers.delete(conversationId);

    // Skip if no content accumulated (empty responses)
    if (!content.trim()) return;

    const assistantPath = resolveAssistantPath(conversationId);
    const workspace = resolveWorkspace(conversationId);

    // Only fire hooks if there's an assistant with hooks
    if (!assistantPath && !workspace) return;

    try {
      const hookResult = await runHooks('onReceiveMessage', {
        workspace: workspace || '',
        assistantPath,
        conversationId,
        content,
      });

      // If hook requests a follow-up message, queue it
      if (hookResult.queueMessage) {
        const delay = hookResult.queueDelay ?? 2000;
        const message = hookResult.queueMessage;

        setTimeout(() => {
          void queueFollowUpMessage(conversationId, message);
        }, delay);
      }
    } catch (error) {
      console.warn('[ResponseHookRunner] onReceiveMessage hook error:', error);
    }
  }
}

/**
 * Send a follow-up message to the agent for a conversation.
 * This mimics a user sending "continue" — the onSendMessage hooks
 * will inject context as usual.
 */
async function queueFollowUpMessage(conversationId: string, message: string): Promise<void> {
  try {
    const task = WorkerManage.getTaskById(conversationId);
    if (!task) {
      // Task may have been killed - try to rebuild it
      const rebuiltTask = await WorkerManage.getTaskByIdRollbackBuild(conversationId);
      if (!rebuiltTask) {
        console.warn('[ResponseHookRunner] Cannot queue message: task not found for', conversationId);
        return;
      }
      await rebuiltTask.sendMessage({
        content: message,
        msg_id: uuid(),
        files: [],
      });
      return;
    }

    await task.sendMessage({
      content: message,
      msg_id: uuid(),
      files: [],
    });
  } catch (error) {
    console.warn('[ResponseHookRunner] Failed to queue follow-up message:', error);
  }
}

/**
 * Initialize the ResponseHookRunner.
 * Call once during application startup to begin listening.
 */
export function initResponseHookRunner(): void {
  if (listenerCleanup) {
    // Already initialized
    return;
  }

  listenerCleanup = ipcBridge.conversation.responseStream.on((msg) => {
    // Fire and forget — don't block the response stream
    void handleResponseMessage(msg);
  });

  console.log('[ResponseHookRunner] Initialized - listening for agent responses');
}

/**
 * Cleanup the ResponseHookRunner.
 * Call during application shutdown.
 */
export function cleanupResponseHookRunner(): void {
  if (listenerCleanup) {
    listenerCleanup();
    listenerCleanup = null;
  }
  responseBuffers.clear();
}
