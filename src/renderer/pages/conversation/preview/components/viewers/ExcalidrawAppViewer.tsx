/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AppViewer from './AppViewer';

type ExcalidrawAppViewerProps = {
  content: string;
  onChange?: (content: string) => void;
  viewModeEnabled?: boolean;
  filePath?: string;
  workspace?: string;
};

/**
 * Wrapper that launches the Excalidraw preview app (external server + iframe)
 * and renders it via AppViewer. Handles lifecycle: launch on mount, stop on unmount.
 */
const ExcalidrawAppViewer: React.FC<ExcalidrawAppViewerProps> = ({ content, onChange, filePath, workspace }) => {
  const [appUrl, setAppUrl] = useState<string | null>(null);
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const instanceIdRef = useRef<string | null>(null);
  const launchedRef = useRef(false);

  // Launch the excalidraw preview app on mount
  useEffect(() => {
    if (launchedRef.current) return;
    launchedRef.current = true;

    let cancelled = false;

    const launch = async () => {
      try {
        const info = await ipcBridge.previewApp.launch.invoke({
          appId: 'excalidraw',
          resource: {
            filePath,
            content,
            contentType: 'excalidraw',
            workspace,
          },
        });

        if (cancelled) {
          // Component unmounted before launch completed - stop the instance
          ipcBridge.previewApp.stop.invoke({ instanceId: info.instanceId }).catch(() => {});
          return;
        }

        setAppUrl(info.url);
        setInstanceId(info.instanceId);
        instanceIdRef.current = info.instanceId;
      } catch (err) {
        if (!cancelled) {
          console.error('[ExcalidrawAppViewer] Failed to launch excalidraw app:', err);
          setError(err instanceof Error ? err.message : 'Failed to launch Excalidraw');
        }
      }
    };

    void launch();

    return () => {
      cancelled = true;
    };
  }, []);

  // Stop the app instance on unmount
  useEffect(() => {
    return () => {
      const id = instanceIdRef.current;
      if (id) {
        ipcBridge.previewApp.stop.invoke({ instanceId: id }).catch(() => {});
      }
    };
  }, []);

  // Handle content changes from the app
  const handleContentChanged = useCallback(
    (newContent: string, isDirty: boolean) => {
      if (isDirty && onChange) {
        onChange(newContent);
      }
    },
    [onChange]
  );

  if (error) {
    return (
      <div className='flex-1 flex flex-col items-center justify-center bg-bg-1 gap-8px'>
        <div className='text-14px text-t-secondary'>{error}</div>
        {filePath && <div className='text-12px text-t-secondary'>{filePath}</div>}
      </div>
    );
  }

  if (!appUrl || !instanceId) {
    return (
      <div className='flex-1 flex items-center justify-center bg-bg-1'>
        <div className='text-14px text-t-secondary'>Loading Excalidraw...</div>
      </div>
    );
  }

  return <AppViewer url={appUrl} instanceId={instanceId} appName='Excalidraw' onContentChanged={handleContentChanged} />;
};

export default ExcalidrawAppViewer;
