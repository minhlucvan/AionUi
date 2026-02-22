/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { BrowserAgentCommand, BrowserAgentResult } from '@/common/types/browserAgent';
import { useCallback, useEffect, useRef } from 'react';

/**
 * Hook that connects the browser agent IPC channel to a webview element.
 * Listens for commands from the main process and executes them on the webview.
 *
 * 将浏览器代理 IPC 通道连接到 webview 元素的 Hook。
 * 监听来自主进程的命令并在 webview 上执行。
 */
export function useBrowserAgent(
  webviewRef: React.RefObject<Electron.WebviewTag | null>,
  currentUrl: string,
  navigateToWithHistory: (url: string) => void
) {
  const isReadyRef = useRef(false);

  // Track when webview is ready
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleDomReady = () => {
      isReadyRef.current = true;
    };

    webview.addEventListener('dom-ready', handleDomReady);
    return () => {
      webview.removeEventListener('dom-ready', handleDomReady);
    };
  }, [webviewRef]);

  const sendResult = useCallback((requestId: string, success: boolean, data?: unknown, error?: string) => {
    const result: BrowserAgentResult = { requestId, success, data, error };
    ipcBridge.browserAgent.result.emit(result);
  }, []);

  const handleNavigate = useCallback(
    async (requestId: string, params: { url?: string }) => {
      const url = params.url;
      if (!url) {
        sendResult(requestId, false, undefined, 'Missing url parameter');
        return;
      }
      navigateToWithHistory(url);
      // Wait a bit for navigation to start
      await new Promise((r) => setTimeout(r, 500));
      sendResult(requestId, true, { url, message: `Navigated to ${url}` });
    },
    [navigateToWithHistory, sendResult]
  );

  const handleScreenshot = useCallback(
    async (requestId: string, _params: { selector?: string; fullPage?: boolean }) => {
      const webview = webviewRef.current;
      if (!webview) {
        sendResult(requestId, false, undefined, 'Browser not available');
        return;
      }

      try {
        const image = await webview.capturePage();
        const dataUrl = image.toDataURL();
        sendResult(requestId, true, { screenshot: dataUrl, format: 'png' });
      } catch (err) {
        sendResult(requestId, false, undefined, `Screenshot failed: ${err}`);
      }
    },
    [webviewRef, sendResult]
  );

  const handleClick = useCallback(
    async (requestId: string, params: { selector?: string }) => {
      const webview = webviewRef.current;
      if (!webview) {
        sendResult(requestId, false, undefined, 'Browser not available');
        return;
      }

      const selector = params.selector;
      if (!selector) {
        sendResult(requestId, false, undefined, 'Missing selector parameter');
        return;
      }

      try {
        const result = await webview.executeJavaScript(`
          (function() {
            const el = document.querySelector(${JSON.stringify(selector)});
            if (!el) return { success: false, error: 'Element not found: ${selector.replace(/'/g, "\\'")}' };
            el.click();
            return { success: true, tagName: el.tagName, text: el.textContent?.substring(0, 100) };
          })();
        `);
        if (result.success) {
          sendResult(requestId, true, result);
        } else {
          sendResult(requestId, false, undefined, result.error);
        }
      } catch (err) {
        sendResult(requestId, false, undefined, `Click failed: ${err}`);
      }
    },
    [webviewRef, sendResult]
  );

  const handleType = useCallback(
    async (requestId: string, params: { selector?: string; text?: string; clearFirst?: boolean }) => {
      const webview = webviewRef.current;
      if (!webview) {
        sendResult(requestId, false, undefined, 'Browser not available');
        return;
      }

      const { selector, text, clearFirst } = params;
      if (!selector || text === undefined) {
        sendResult(requestId, false, undefined, 'Missing selector or text parameter');
        return;
      }

      try {
        const result = await webview.executeJavaScript(`
          (function() {
            const el = document.querySelector(${JSON.stringify(selector)});
            if (!el) return { success: false, error: 'Element not found: ${selector.replace(/'/g, "\\'")}' };
            el.focus();
            ${clearFirst ? 'el.value = "";' : ''}
            el.value = ${JSON.stringify(clearFirst ? text : '')} || el.value + ${JSON.stringify(text)};
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return { success: true };
          })();
        `);
        if (result.success) {
          sendResult(requestId, true, { message: `Typed text into ${selector}` });
        } else {
          sendResult(requestId, false, undefined, result.error);
        }
      } catch (err) {
        sendResult(requestId, false, undefined, `Type failed: ${err}`);
      }
    },
    [webviewRef, sendResult]
  );

  const handleEvaluate = useCallback(
    async (requestId: string, params: { expression?: string }) => {
      const webview = webviewRef.current;
      if (!webview) {
        sendResult(requestId, false, undefined, 'Browser not available');
        return;
      }

      const expression = params.expression;
      if (!expression) {
        sendResult(requestId, false, undefined, 'Missing expression parameter');
        return;
      }

      try {
        const result = await webview.executeJavaScript(expression);
        sendResult(requestId, true, { result: typeof result === 'object' ? JSON.stringify(result) : String(result) });
      } catch (err) {
        sendResult(requestId, false, undefined, `Evaluate failed: ${err}`);
      }
    },
    [webviewRef, sendResult]
  );

  const handleGetHtml = useCallback(
    async (requestId: string, params: { selector?: string; outer?: boolean }) => {
      const webview = webviewRef.current;
      if (!webview) {
        sendResult(requestId, false, undefined, 'Browser not available');
        return;
      }

      try {
        const selector = params.selector || 'html';
        const outer = params.outer !== false;
        const html = await webview.executeJavaScript(`
          (function() {
            const el = document.querySelector(${JSON.stringify(selector)});
            if (!el) return null;
            return ${outer ? 'el.outerHTML' : 'el.innerHTML'};
          })();
        `);
        if (html === null) {
          sendResult(requestId, false, undefined, `Element not found: ${selector}`);
        } else {
          sendResult(requestId, true, { html });
        }
      } catch (err) {
        sendResult(requestId, false, undefined, `Get HTML failed: ${err}`);
      }
    },
    [webviewRef, sendResult]
  );

  const handleGetText = useCallback(
    async (requestId: string, params: { selector?: string }) => {
      const webview = webviewRef.current;
      if (!webview) {
        sendResult(requestId, false, undefined, 'Browser not available');
        return;
      }

      try {
        const selector = params.selector || 'body';
        const text = await webview.executeJavaScript(`
          (function() {
            const el = document.querySelector(${JSON.stringify(selector)});
            if (!el) return null;
            return el.innerText || el.textContent;
          })();
        `);
        if (text === null) {
          sendResult(requestId, false, undefined, `Element not found: ${selector}`);
        } else {
          sendResult(requestId, true, { text });
        }
      } catch (err) {
        sendResult(requestId, false, undefined, `Get text failed: ${err}`);
      }
    },
    [webviewRef, sendResult]
  );

  const handleScroll = useCallback(
    async (requestId: string, params: { x?: number; y?: number; selector?: string; direction?: string }) => {
      const webview = webviewRef.current;
      if (!webview) {
        sendResult(requestId, false, undefined, 'Browser not available');
        return;
      }

      try {
        const { selector, direction, x, y } = params;

        if (selector) {
          await webview.executeJavaScript(`
            (function() {
              const el = document.querySelector(${JSON.stringify(selector)});
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            })();
          `);
        } else if (direction) {
          const amount = direction === 'up' ? -500 : 500;
          await webview.executeJavaScript(`window.scrollBy({ top: ${amount}, behavior: 'smooth' })`);
        } else {
          await webview.executeJavaScript(`window.scrollTo({ left: ${x || 0}, top: ${y || 0}, behavior: 'smooth' })`);
        }

        sendResult(requestId, true, { message: 'Scrolled successfully' });
      } catch (err) {
        sendResult(requestId, false, undefined, `Scroll failed: ${err}`);
      }
    },
    [webviewRef, sendResult]
  );

  const handleHover = useCallback(
    async (requestId: string, params: { selector?: string }) => {
      const webview = webviewRef.current;
      if (!webview) {
        sendResult(requestId, false, undefined, 'Browser not available');
        return;
      }

      const selector = params.selector;
      if (!selector) {
        sendResult(requestId, false, undefined, 'Missing selector parameter');
        return;
      }

      try {
        const result = await webview.executeJavaScript(`
          (function() {
            const el = document.querySelector(${JSON.stringify(selector)});
            if (!el) return { success: false, error: 'Element not found' };
            el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            return { success: true };
          })();
        `);
        if (result.success) {
          sendResult(requestId, true, { message: `Hovered over ${selector}` });
        } else {
          sendResult(requestId, false, undefined, result.error);
        }
      } catch (err) {
        sendResult(requestId, false, undefined, `Hover failed: ${err}`);
      }
    },
    [webviewRef, sendResult]
  );

  const handleSelectOption = useCallback(
    async (requestId: string, params: { selector?: string; value?: string }) => {
      const webview = webviewRef.current;
      if (!webview) {
        sendResult(requestId, false, undefined, 'Browser not available');
        return;
      }

      const { selector, value } = params;
      if (!selector || value === undefined) {
        sendResult(requestId, false, undefined, 'Missing selector or value parameter');
        return;
      }

      try {
        const result = await webview.executeJavaScript(`
          (function() {
            const el = document.querySelector(${JSON.stringify(selector)});
            if (!el || el.tagName !== 'SELECT') return { success: false, error: 'Select element not found' };
            el.value = ${JSON.stringify(value)};
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return { success: true };
          })();
        `);
        if (result.success) {
          sendResult(requestId, true, { message: `Selected option ${value}` });
        } else {
          sendResult(requestId, false, undefined, result.error);
        }
      } catch (err) {
        sendResult(requestId, false, undefined, `Select option failed: ${err}`);
      }
    },
    [webviewRef, sendResult]
  );

  const handleWaitForSelector = useCallback(
    async (requestId: string, params: { selector?: string; timeout?: number }) => {
      const webview = webviewRef.current;
      if (!webview) {
        sendResult(requestId, false, undefined, 'Browser not available');
        return;
      }

      const { selector, timeout = 5000 } = params;
      if (!selector) {
        sendResult(requestId, false, undefined, 'Missing selector parameter');
        return;
      }

      try {
        const found = await webview.executeJavaScript(`
          new Promise((resolve) => {
            const existing = document.querySelector(${JSON.stringify(selector)});
            if (existing) { resolve(true); return; }
            const observer = new MutationObserver(() => {
              if (document.querySelector(${JSON.stringify(selector)})) {
                observer.disconnect();
                resolve(true);
              }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => { observer.disconnect(); resolve(false); }, ${timeout});
          });
        `);
        if (found) {
          sendResult(requestId, true, { message: `Element found: ${selector}` });
        } else {
          sendResult(requestId, false, undefined, `Timeout waiting for selector: ${selector}`);
        }
      } catch (err) {
        sendResult(requestId, false, undefined, `Wait for selector failed: ${err}`);
      }
    },
    [webviewRef, sendResult]
  );

  const handleGoBack = useCallback(
    async (requestId: string) => {
      const webview = webviewRef.current;
      if (!webview) {
        sendResult(requestId, false, undefined, 'Browser not available');
        return;
      }
      try {
        webview.goBack();
        sendResult(requestId, true, { message: 'Navigated back' });
      } catch (err) {
        sendResult(requestId, false, undefined, `Go back failed: ${err}`);
      }
    },
    [webviewRef, sendResult]
  );

  const handleGoForward = useCallback(
    async (requestId: string) => {
      const webview = webviewRef.current;
      if (!webview) {
        sendResult(requestId, false, undefined, 'Browser not available');
        return;
      }
      try {
        webview.goForward();
        sendResult(requestId, true, { message: 'Navigated forward' });
      } catch (err) {
        sendResult(requestId, false, undefined, `Go forward failed: ${err}`);
      }
    },
    [webviewRef, sendResult]
  );

  const handleReload = useCallback(
    async (requestId: string) => {
      const webview = webviewRef.current;
      if (!webview) {
        sendResult(requestId, false, undefined, 'Browser not available');
        return;
      }
      try {
        webview.reload();
        sendResult(requestId, true, { message: 'Page reloaded' });
      } catch (err) {
        sendResult(requestId, false, undefined, `Reload failed: ${err}`);
      }
    },
    [webviewRef, sendResult]
  );

  // Dispatch commands to handlers
  const handleCommand = useCallback(
    async (cmd: BrowserAgentCommand) => {
      const { requestId, command, params } = cmd;
      const p = params as Record<string, unknown>;

      switch (command) {
        case 'navigate':
          return handleNavigate(requestId, p as { url?: string });
        case 'screenshot':
          return handleScreenshot(requestId, p as { selector?: string; fullPage?: boolean });
        case 'click':
          return handleClick(requestId, p as { selector?: string });
        case 'type':
          return handleType(requestId, p as { selector?: string; text?: string; clearFirst?: boolean });
        case 'evaluate':
          return handleEvaluate(requestId, p as { expression?: string });
        case 'get_html':
          return handleGetHtml(requestId, p as { selector?: string; outer?: boolean });
        case 'get_text':
          return handleGetText(requestId, p as { selector?: string });
        case 'scroll':
          return handleScroll(requestId, p as { x?: number; y?: number; selector?: string; direction?: string });
        case 'hover':
          return handleHover(requestId, p as { selector?: string });
        case 'select_option':
          return handleSelectOption(requestId, p as { selector?: string; value?: string });
        case 'wait_for_selector':
          return handleWaitForSelector(requestId, p as { selector?: string; timeout?: number });
        case 'go_back':
          return handleGoBack(requestId);
        case 'go_forward':
          return handleGoForward(requestId);
        case 'reload':
          return handleReload(requestId);
        default:
          sendResult(requestId, false, undefined, `Unknown command: ${command}`);
      }
    },
    [handleNavigate, handleScreenshot, handleClick, handleType, handleEvaluate, handleGetHtml, handleGetText, handleScroll, handleHover, handleSelectOption, handleWaitForSelector, handleGoBack, handleGoForward, handleReload, sendResult]
  );

  // Listen for browser agent commands from main process
  useEffect(() => {
    const unsubscribe = ipcBridge.browserAgent.command.on(handleCommand);
    return () => {
      unsubscribe();
    };
  }, [handleCommand]);

  // Register status handler
  useEffect(() => {
    const webview = webviewRef.current;

    const getTitle = async (): Promise<string> => {
      if (!webview) return '';
      try {
        return await webview.executeJavaScript('document.title');
      } catch {
        return '';
      }
    };

    // Handle status requests by returning current state
    const handleStatusRequest = async () => {
      const title = await getTitle();
      return {
        isOpen: !!webview,
        currentUrl,
        title,
      };
    };

    ipcBridge.browserAgent.getStatus.handle(handleStatusRequest);

    return () => {
      // The handle method replaces the handler, so no explicit cleanup needed
    };
  }, [webviewRef, currentUrl]);
}
