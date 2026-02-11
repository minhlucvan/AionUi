/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '../../common';
import { getDatabase } from '@process/database';
import { uuid } from '../../common/utils';
import type { IWorkspace } from '@/common/types/workspace';

export function initWorkspaceBridge(): void {
  // Create workspace
  ipcBridge.workspace.create.provider(async (params) => {
    const db = getDatabase();
    const now = Date.now();

    const workspace: IWorkspace = {
      id: `ws_${uuid()}`,
      name: params.name,
      path: params.path,
      description: params.description,
      icon: params.icon,
      config: params.config ? { ...params.config } : {},
      pinned: false,
      createdAt: now,
      updatedAt: now,
    };

    const result = db.createWorkspace(workspace);
    if (!result.success) {
      throw new Error(result.error || 'Failed to create workspace');
    }
    return result.data!;
  });

  // Get workspace by ID
  ipcBridge.workspace.get.provider(async ({ id }) => {
    const db = getDatabase();
    const result = db.getWorkspace(id);
    if (result.success) {
      return result.data ?? null;
    }
    return null;
  });

  // Get workspace by path
  ipcBridge.workspace.getByPath.provider(async ({ path }) => {
    const db = getDatabase();
    const result = db.getWorkspaceByPath(path);
    if (result.success) {
      return result.data ?? null;
    }
    return null;
  });

  // List user workspaces
  ipcBridge.workspace.list.provider(async ({ page = 0, pageSize = 100 }) => {
    const db = getDatabase();
    const result = db.getUserWorkspaces(undefined, page, pageSize);
    return result.data || [];
  });

  // Update workspace
  ipcBridge.workspace.update.provider(async ({ id, updates }) => {
    const db = getDatabase();
    const result = db.updateWorkspace(id, updates as Partial<IWorkspace>);
    return result.success && !!result.data;
  });

  // Delete workspace
  ipcBridge.workspace.delete.provider(async ({ id }) => {
    const db = getDatabase();
    const result = db.deleteWorkspace(id);
    return result.success && !!result.data;
  });

  // Get conversations for a workspace
  ipcBridge.workspace.getConversations.provider(async ({ workspaceId }) => {
    const db = getDatabase();
    const result = db.getWorkspaceConversations(workspaceId);
    return result.data || [];
  });

  // Set active conversation for workspace
  ipcBridge.workspace.setActiveConversation.provider(async ({ workspaceId, conversationId }) => {
    const db = getDatabase();
    const result = db.updateWorkspace(workspaceId, { lastActiveConversationId: conversationId } as Partial<IWorkspace>);
    return result.success && !!result.data;
  });

  // Set or clear workspace for a conversation
  ipcBridge.workspace.setConversationWorkspace.provider(async ({ conversationId, workspaceId }) => {
    const db = getDatabase();
    const result = db.setConversationWorkspace(conversationId, workspaceId);
    return result.success && !!result.data;
  });
}
