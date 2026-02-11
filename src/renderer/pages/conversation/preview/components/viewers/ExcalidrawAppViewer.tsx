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
 * Wrapper that opens excalidraw via the app server and renders it in an iframe.
 * Handles lifecycle: open session on mount, close on unmount.
 */
const ExcalidrawAppViewer: React.FC<ExcalidrawAppViewerProps> = ({ content, onChange, filePath, workspace }) => {
  const [appUrl, setAppUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const launchedRef = useRef(false);

  // Open the excalidraw app on mount
  useEffect(() => {
    if (launchedRef.current) return;
    launchedRef.current = true;

    let cancelled = false;

    const open = async () => {
      try {
        const session = await ipcBridge.app.open.invoke({
          appName: 'excalidraw',
          resource: { filePath, content, contentType: 'excalidraw', workspace },
        });

        if (cancelled) {
          ipcBridge.app.close.invoke({ sessionId: session.sessionId }).catch(() => {});
          return;
        }

        setAppUrl(session.url);
        setSessionId(session.sessionId);
        sessionIdRef.current = session.sessionId;
      } catch (err) {
        if (!cancelled) {
          console.error('[ExcalidrawAppViewer] Failed to open excalidraw:', err);
          setError(err instanceof Error ? err.message : 'Failed to launch Excalidraw');
        }
      }
    };

    void open();
    return () => { cancelled = true; };
  }, []);

  // Close session on unmount
  useEffect(() => {
    return () => {
      const sid = sessionIdRef.current;
      if (sid) ipcBridge.app.close.invoke({ sessionId: sid }).catch(() => {});
    };
  }, []);

  const handleContentChanged = useCallback(
    (newContent: string, isDirty: boolean) => {
      if (isDirty && onChange) onChange(newContent);
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

  if (!appUrl || !sessionId) {
    return (
      <div className='flex-1 flex items-center justify-center bg-bg-1'>
        <div className='text-14px text-t-secondary'>Loading Excalidraw...</div>
      </div>
    );
  }

  return <AppViewer url={appUrl} instanceId={sessionId} appName='Excalidraw' onContentChanged={handleContentChanged} />;
};

export default ExcalidrawAppViewer;
