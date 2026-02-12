/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { AppResource } from '@/common/types/app';
import { appServer } from '../services/appServer';

/**
 * Initialize IPC bridge for the app platform.
 * Connects the renderer to the AppServer.
 */
export function initAppBridge(): void {
  // List available apps
  ipcBridge.app.list.provider(() => {
    return appServer.listApps();
  });

  // Open a resource in an app → returns session with URL
  ipcBridge.app.open.provider(async ({ appName, resource }: { appName: string; resource?: AppResource }) => {
    if (!appServer.isRunning()) {
      await appServer.start();
    }
    return appServer.open(appName, resource);
  });

  // Close a session
  ipcBridge.app.close.provider(({ sessionId }: { sessionId: string }) => {
    appServer.close(sessionId);
  });

  // Call a tool on an app session
  ipcBridge.app.callTool.provider(async ({ sessionId, tool, params }: { sessionId: string; tool: string; params: Record<string, unknown> }) => {
    return appServer.callTool(sessionId, tool, params);
  });

  // Legacy: execute a capability (deprecated, use callTool)
  ipcBridge.app.execute.provider(async ({ sessionId, capability, params }: { sessionId: string; capability: string; params: Record<string, unknown> }) => {
    return appServer.callTool(sessionId, capability, params);
  });

  // Read workspace app config (.aionui/app.json)
  ipcBridge.app.getWorkspaceConfig.provider(({ workspace }: { workspace: string }) => {
    return appServer.getWorkspaceConfig(workspace);
  });

  // Open workspace app
  ipcBridge.app.openWorkspace.provider(async ({ workspace }: { workspace: string }) => {
    if (!appServer.isRunning()) {
      await appServer.start();
    }
    return appServer.openWorkspaceApp(workspace);
  });

  // Get app session state
  ipcBridge.app.getState.provider(({ sessionId }: { sessionId: string }) => {
    return appServer.getState(sessionId);
  });

  // Forward app messages to renderer
  appServer.onMessage((sessionId, type, payload) => {
    if (type === 'app:content-changed') {
      ipcBridge.app.contentChanged.emit({
        sessionId,
        content: payload.content as string,
        isDirty: payload.isDirty as boolean,
      });
    }
    if (type === 'app:event') {
      ipcBridge.app.event.emit({
        sessionId,
        event: payload.event as string,
        data: payload,
      });
    }
    if (type === 'app:state-update') {
      ipcBridge.app.stateUpdated.emit({
        sessionId,
        state: payload as Record<string, unknown>,
      });
    }
  });

  // Forward file stream updates to apps
  ipcBridge.fileStream.contentUpdate.on((data: { filePath: string; content: string; operation: 'write' | 'delete' }) => {
    if (data.operation === 'write') {
      appServer.broadcastContentUpdate(data.filePath, data.content, 'agent');
    }
  });

  // Start the server
  appServer.start().catch((err) => {
    console.error('[AppBridge] Failed to start app server:', err);
  });
}
