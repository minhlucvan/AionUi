/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loading, CloseOne, Refresh } from '@icon-park/react';

type AppViewerProps = {
  /** The URL of the preview app server (e.g., http://127.0.0.1:PORT) */
  url: string;
  /** Instance ID for tracking */
  instanceId: string;
  /** App display name */
  appName?: string;
  /** Whether to show the loading overlay */
  showLoading?: boolean;
  /** Callback when the app reports content changed */
  onContentChanged?: (content: string, isDirty: boolean) => void;
  /** Callback when the iframe loads */
  onLoad?: () => void;
  /** Callback when the iframe encounters an error */
  onError?: (error: string) => void;
};

/**
 * AppViewer - Renders a preview app in an isolated iframe.
 *
 * This is the universal container for all preview apps in the new architecture.
 * Each preview app runs on its own server and is displayed in this iframe.
 * Communication between the host and the app happens via:
 * 1. WebSocket (app ↔ backend, for tools, events, and file ops)
 * 2. postMessage (iframe ↔ host, for UI coordination like theme, focus)
 */
const AppViewer: React.FC<AppViewerProps> = ({ url, instanceId, appName, showLoading = true, onContentChanged, onLoad, onError }) => {
  const { t } = useTranslation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Handle postMessage from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from our app's origin
      if (!url) return;
      try {
        const appOrigin = new URL(url).origin;
        if (event.origin !== appOrigin) return;
      } catch {
        return;
      }

      const { type, payload } = event.data || {};

      switch (type) {
        case 'app:content-changed':
          if (onContentChanged && payload) {
            onContentChanged(payload.content, payload.isDirty);
          }
          break;
        case 'app:ready':
          setIsLoading(false);
          setHasError(false);
          break;
        case 'app:error':
          setHasError(true);
          setErrorMessage(payload?.message || 'Unknown error');
          onError?.(payload?.message || 'Unknown error');
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [url, onContentChanged, onError]);

  // Send theme info to the iframe when it loads
  const sendThemeToIframe = useCallback(() => {
    if (!iframeRef.current?.contentWindow) return;

    const isDark = document.documentElement.getAttribute('arco-theme') === 'dark';
    try {
      const appOrigin = new URL(url).origin;
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'host:theme',
          payload: { theme: isDark ? 'dark' : 'light' },
        },
        appOrigin
      );
    } catch {
      // Ignore if origin parsing fails
    }
  }, [url]);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
    sendThemeToIframe();
    onLoad?.();
  }, [sendThemeToIframe, onLoad]);

  const handleIframeError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    setErrorMessage(t('preview.app.loadFailed', { defaultValue: 'Failed to load preview app' }));
    onError?.('iframe load error');
  }, [t, onError]);

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
  }, [url]);

  // Observe theme changes and forward to iframe
  useEffect(() => {
    const observer = new MutationObserver(() => {
      sendThemeToIframe();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['arco-theme'],
    });

    return () => observer.disconnect();
  }, [sendThemeToIframe]);

  return (
    <div className='relative h-full w-full flex flex-col'>
      {/* Loading overlay */}
      {showLoading && isLoading && (
        <div className='absolute inset-0 z-10 flex flex-col items-center justify-center bg-bg-1'>
          <Loading theme='outline' size={24} className='animate-spin text-primary mb-8px' />
          <span className='text-12px text-t-secondary'>{appName ? `Loading ${appName}...` : 'Loading...'}</span>
        </div>
      )}

      {/* Error overlay */}
      {hasError && (
        <div className='absolute inset-0 z-10 flex flex-col items-center justify-center bg-bg-1'>
          <CloseOne theme='outline' size={24} className='text-danger mb-8px' />
          <span className='text-12px text-t-secondary mb-12px'>{errorMessage}</span>
          <button onClick={handleRefresh} className='flex items-center gap-4px px-12px py-6px rd-6px bg-primary text-white text-12px cursor-pointer hover:opacity-90 transition-opacity border-none'>
            <Refresh theme='outline' size={14} />
            {t('common.retry', { defaultValue: 'Retry' })}
          </button>
        </div>
      )}

      {/* The iframe */}
      <iframe
        ref={iframeRef}
        src={url}
        data-instance-id={instanceId}
        className='w-full h-full border-0'
        sandbox='allow-scripts allow-same-origin allow-forms allow-popups allow-modals'
        allow='clipboard-read; clipboard-write'
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        title={appName || 'Preview App'}
      />
    </div>
  );
};

export default AppViewer;
