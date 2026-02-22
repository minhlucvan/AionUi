/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Browser Agent IPC bridge — routes browser agent results from renderer back to the service.
 * The command direction (main → renderer) is handled by BrowserAgentService directly.
 *
 * 浏览器代理 IPC 桥 — 将浏览器代理结果从渲染进程路由回服务。
 * 命令方向（主进程 → 渲染进程）由 BrowserAgentService 直接处理。
 */

import * as ipcBridge from '@/common/ipcBridge';
import { BrowserAgentService } from '../services/browserAgentService';

export function initBrowserAgentBridge(): void {
  // Register status provider
  ipcBridge.browserAgent.getStatus.provider(async () => {
    const service = BrowserAgentService.getInstance();
    return service.getStatus();
  });

  // Note: The browser-agent.command emitter is sent from main→renderer by BrowserAgentService.
  // The browser-agent.result emitter is handled directly in BrowserAgentService via ipcMain.on().
  // This bridge only registers the getStatus provider.
}
