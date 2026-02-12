/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { AppResource } from '@/common/types/app';
import { appServer } from '../services/appServer';

/**
 * Initialize IPC bridge for the app system.
 * Connects the renderer to the single AppServer.
 */
export function initAppBridge(): void {
  // List available apps
  ipcBridge.app.list.provider(() => {
    return appServer.listApps();
  });

  // Open a resource in an app → returns session with URL
  ipcBridge.app.open.provider(async ({ appName, resource }: { appName: string; resource?: AppResource }) => {
    // Ensure server is running
    if (!appServer.isRunning()) {
      await appServer.start();
    }
    return appServer.open(appName, resource);
  });

  // Close a session
  ipcBridge.app.close.provider(({ sessionId }: { sessionId: string }) => {
    appServer.close(sessionId);
  });

  // Execute a capability
  ipcBridge.app.execute.provider(async ({ sessionId, capability, params }: { sessionId: string; capability: string; params: Record<string, unknown> }) => {
    return appServer.execute(sessionId, capability, params);
  });

  // Read workspace preview config (.aionui/preview.json)
  ipcBridge.app.getWorkspaceConfig.provider(({ workspace }: { workspace: string }) => {
    return appServer.getWorkspaceConfig(workspace);
  });

  // Open workspace dev server as live preview
  ipcBridge.app.openWorkspace.provider(async ({ workspace }: { workspace: string }) => {
    if (!appServer.isRunning()) {
      await appServer.start();
    }
    return appServer.openWorkspacePreview(workspace);
  });

  // Forward app content-changed messages to renderer
  appServer.onMessage((sessionId, type, payload) => {
    if (type === 'app:content-changed') {
      ipcBridge.app.contentChanged.emit({
        sessionId,
        content: payload.content as string,
        isDirty: payload.isDirty as boolean,
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
