/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * usePreviewApps - React hook for the app system.
 *
 * Simple interface to list available apps, open resources, and close sessions.
 */

import { useCallback, useEffect, useState } from 'react';
import { ipcBridge } from '@/common';
import type { AppInfo, AppResource, AppSession } from '@/common/types/app';
import { usePreviewContext } from '../context/PreviewContext';

export function usePreviewApps() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const { openPreview } = usePreviewContext();

  const refreshApps = useCallback(async () => {
    try {
      const list = await ipcBridge.app.list.invoke(undefined as never);
      setApps(list);
    } catch (err) {
      console.error('[usePreviewApps] Failed to list apps:', err);
    }
  }, []);

  /** Open a resource in an app and show it in the preview panel */
  const launchApp = useCallback(
    async (appName: string, resource?: AppResource): Promise<AppSession> => {
      setLoading(true);
      try {
        const session = await ipcBridge.app.open.invoke({ appName, resource });

        openPreview(session.url, 'app', {
          title: session.appName,
          appId: session.appName,
          appInstanceId: session.sessionId,
          appUrl: session.url,
          appName: session.appName,
          editable: session.editable,
          filePath: resource?.filePath,
          workspace: resource?.workspace,
          fileName: resource?.filePath?.split('/').pop() || resource?.filePath?.split('\\').pop(),
        });

        return session;
      } finally {
        setLoading(false);
      }
    },
    [openPreview]
  );

  const closeApp = useCallback(async (sessionId: string) => {
    await ipcBridge.app.close.invoke({ sessionId });
  }, []);

  useEffect(() => {
    refreshApps();
  }, [refreshApps]);

  return { apps, loading, launchApp, closeApp, refreshApps };
}
