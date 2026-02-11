/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { ExecuteAppCapabilityParams, LaunchPreviewAppParams } from '@/common/types/previewApp';
import { previewAppRegistry } from '../services/previewApp';

/**
 * Initialize IPC bridge handlers for the Preview App system.
 *
 * These handlers connect the renderer process (UI) to the preview app
 * registry running in the main process.
 */
export function initPreviewAppBridge(): void {
  // List all registered app manifests
  ipcBridge.previewApp.listApps.provider(() => {
    return previewAppRegistry.getRegisteredApps();
  });

  // Launch a preview app instance
  ipcBridge.previewApp.launch.provider(async (params: LaunchPreviewAppParams) => {
    const info = await previewAppRegistry.launchApp(params);

    // Emit instance changed event
    ipcBridge.previewApp.instanceChanged.emit(info);

    return info;
  });

  // Stop a running preview app instance
  ipcBridge.previewApp.stop.provider(async ({ instanceId }: { instanceId: string }) => {
    await previewAppRegistry.stopApp(instanceId);
  });

  // List all running instances
  ipcBridge.previewApp.listInstances.provider(() => {
    return previewAppRegistry.getRunningInstances();
  });

  // Get a specific instance
  ipcBridge.previewApp.getInstance.provider(({ instanceId }: { instanceId: string }) => {
    return previewAppRegistry.getInstance(instanceId) || null;
  });

  // Execute a capability on a running app (agent bridge)
  ipcBridge.previewApp.executeCapability.provider(async (params: ExecuteAppCapabilityParams) => {
    return previewAppRegistry.executeCapability(params);
  });

  // Get all capabilities across all running instances
  ipcBridge.previewApp.getCapabilities.provider(() => {
    return previewAppRegistry.getAllCapabilities();
  });

  // Forward app content-changed messages to the renderer
  previewAppRegistry.addMessageListener((instanceId, msg) => {
    if (msg.type === 'app:content-changed') {
      ipcBridge.previewApp.contentChanged.emit({
        instanceId,
        filePath: msg.payload.filePath,
        content: msg.payload.content,
        isDirty: msg.payload.isDirty,
      });
    }
  });

  // Forward file stream content updates to all running preview app instances.
  // When an agent writes a file, this broadcasts the update to all apps so they
  // can reflect the change in real-time.
  ipcBridge.fileStream.contentUpdate.on((data: { filePath: string; content: string; operation: 'write' | 'delete' }) => {
    if (data.operation === 'write') {
      previewAppRegistry.broadcastContentUpdate(data.filePath, data.content, 'agent');
    }
  });

  // Load builtin preview apps on startup
  previewAppRegistry.loadBuiltinApps().catch((err) => {
    console.error('[PreviewAppBridge] Failed to load builtin apps:', err);
  });
}
