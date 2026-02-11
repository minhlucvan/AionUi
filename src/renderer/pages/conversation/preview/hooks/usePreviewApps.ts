/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * usePreviewApps - React hook for interacting with the Preview App system.
 *
 * Provides:
 * - List of registered apps (available to launch)
 * - List of running instances
 * - Functions to launch, stop, and open files in apps
 * - Integration with PreviewContext to open apps as preview tabs
 */

import { useCallback, useEffect, useState } from 'react';
import { ipcBridge } from '@/common';
import type { PreviewAppInfo, PreviewAppManifest } from '@/common/types/previewApp';
import { usePreviewContext } from '../context/PreviewContext';

export function usePreviewApps() {
  const [registeredApps, setRegisteredApps] = useState<PreviewAppManifest[]>([]);
  const [runningInstances, setRunningInstances] = useState<PreviewAppInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const { openPreview } = usePreviewContext();

  // Fetch registered apps
  const refreshApps = useCallback(async () => {
    try {
      const apps = await ipcBridge.previewApp.listApps.invoke(undefined as never);
      setRegisteredApps(apps);
    } catch (err) {
      console.error('[usePreviewApps] Failed to list apps:', err);
    }
  }, []);

  // Fetch running instances
  const refreshInstances = useCallback(async () => {
    try {
      const instances = await ipcBridge.previewApp.listInstances.invoke(undefined as never);
      setRunningInstances(instances);
    } catch (err) {
      console.error('[usePreviewApps] Failed to list instances:', err);
    }
  }, []);

  // Launch an app and open it in the preview panel
  const launchApp = useCallback(
    async (appId: string, resource?: { filePath?: string; content?: string; language?: string; contentType?: string; workspace?: string }) => {
      setLoading(true);
      try {
        const info = await ipcBridge.previewApp.launch.invoke({ appId, resource });

        // Open in preview panel as an iframe
        openPreview(info.url, 'app', {
          title: info.name,
          appId: info.appId,
          appInstanceId: info.instanceId,
          appUrl: info.url,
          appName: info.name,
          editable: info.editable,
          filePath: resource?.filePath,
          workspace: resource?.workspace,
          fileName: resource?.filePath?.split('/').pop() || resource?.filePath?.split('\\').pop(),
        });

        // Refresh instances list
        await refreshInstances();

        return info;
      } catch (err) {
        console.error('[usePreviewApps] Failed to launch app:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [openPreview, refreshInstances]
  );

  // Stop a running app instance
  const stopApp = useCallback(
    async (instanceId: string) => {
      try {
        await ipcBridge.previewApp.stop.invoke({ instanceId });
        await refreshInstances();
      } catch (err) {
        console.error('[usePreviewApps] Failed to stop app:', err);
        throw err;
      }
    },
    [refreshInstances]
  );

  // Listen for instance changes
  useEffect(() => {
    const unsubscribe = ipcBridge.previewApp.instanceChanged.on(() => {
      refreshInstances();
    });

    return unsubscribe;
  }, [refreshInstances]);

  // Initial fetch
  useEffect(() => {
    refreshApps();
    refreshInstances();
  }, [refreshApps, refreshInstances]);

  return {
    registeredApps,
    runningInstances,
    loading,
    launchApp,
    stopApp,
    refreshApps,
    refreshInstances,
  };
}
