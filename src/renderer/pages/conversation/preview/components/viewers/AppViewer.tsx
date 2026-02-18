/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loading, CloseOne, Refresh } from '@icon-park/react';

type AppViewerProps = {
  url: string;
  instanceId: string;
  appName?: string;
  showLoading?: boolean;
  onContentChanged?: (content: string, isDirty: boolean) => void;
  onLoad?: () => void;
  onError?: (error: string) => void;
};

/**
 * AppViewer - Renders a preview app in an Electron <webview>.
 * Uses webview instead of iframe to bypass CSP restrictions on http://127.0.0.1:* origins.
 */
const AppViewer: React.FC<AppViewerProps> = ({ url, instanceId, appName, showLoading = true, onContentChanged, onLoad, onError }) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const onContentChangedRef = useRef(onContentChanged);
  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);
  onContentChangedRef.current = onContentChanged;
  onLoadRef.current = onLoad;
  onErrorRef.current = onError;

  const sendTheme = useCallback((webview: HTMLElement) => {
    const isDark = document.documentElement.getAttribute('arco-theme') === 'dark';
    const theme = isDark ? 'dark' : 'light';
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (webview as any)
        .executeJavaScript(
          `
        window.dispatchEvent(new MessageEvent('message', {
          data: { type: 'host:theme', payload: { theme: '${theme}' } },
          origin: window.location.origin
        }));
      `
        )
        .catch(() => {});
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create webview imperatively to attach events before it starts loading
    const webview = document.createElement('webview') as HTMLElement;
    webview.setAttribute('src', url);
    webview.setAttribute('data-instance-id', instanceId);
    webview.setAttribute('allowpopups', 'true');
    webview.style.cssText = 'width:100%;height:100%;border:0;flex:1;display:flex;';

    const handleFinishLoad = () => {
      setIsLoading(false);
      setHasError(false);
      sendTheme(webview);
      onLoadRef.current?.();
    };

    const handleFailLoad = () => {
      setIsLoading(false);
      setHasError(true);
      setErrorMessage(t('preview.app.loadFailed', { defaultValue: 'Failed to load preview app' }));
      onErrorRef.current?.('webview load error');
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleIpcMessage = (event: any) => {
      if (event.channel !== 'app-message') return;
      const msg = event.args?.[0];
      if (!msg?.type) return;
      switch (msg.type) {
        case 'app:content-changed':
          if (msg.payload) onContentChangedRef.current?.(msg.payload.content ?? '', msg.payload.isDirty ?? false);
          break;
        case 'app:ready':
          setIsLoading(false);
          setHasError(false);
          break;
        case 'app:error':
          setHasError(true);
          setErrorMessage(msg.payload?.message || 'Unknown error');
          onErrorRef.current?.(msg.payload?.message || 'Unknown error');
          break;
      }
    };

    webview.addEventListener('did-finish-load', handleFinishLoad);
    webview.addEventListener('did-fail-load', handleFailLoad);
    webview.addEventListener('ipc-message', handleIpcMessage);

    container.appendChild(webview);

    // Observe theme changes
    const observer = new MutationObserver(() => sendTheme(webview));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['arco-theme'] });

    return () => {
      webview.removeEventListener('did-finish-load', handleFinishLoad);
      webview.removeEventListener('did-fail-load', handleFailLoad);
      webview.removeEventListener('ipc-message', handleIpcMessage);
      observer.disconnect();
      container.removeChild(webview);
    };
  }, [url]);

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
    const webview = containerRef.current?.querySelector('webview') as HTMLElement | null;
    if (webview) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (webview as any).reload();
    }
  }, []);

  return (
    <div className='relative h-full w-full flex flex-col'>
      {showLoading && isLoading && (
        <div className='absolute inset-0 z-10 flex flex-col items-center justify-center bg-bg-1'>
          <Loading theme='outline' size={24} className='animate-spin text-primary mb-8px' />
          <span className='text-12px text-t-secondary'>{appName ? `Loading ${appName}...` : 'Loading...'}</span>
        </div>
      )}

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

      {/* webview is injected imperatively so events are attached before load */}
      <div ref={containerRef} className='w-full flex-1 flex' />
    </div>
  );
};

export default AppViewer;
