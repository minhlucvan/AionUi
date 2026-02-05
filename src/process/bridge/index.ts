/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { acpDetector } from '@/agent/acp/AcpDetector';
import { initAcpConversationBridge } from './acpConversationBridge';
import { initApplicationBridge } from './applicationBridge';
import { initAuthBridge } from './authBridge';
import { initCodexConversationBridge } from './codexConversationBridge';
import { initConversationBridge } from './conversationBridge';
import { initDocumentBridge } from './documentBridge';
import { initDatabaseBridge } from './databaseBridge';
import { initDialogBridge } from './dialogBridge';
import { initFileWatchBridge } from './fileWatchBridge';
import { initFsBridge } from './fsBridge';
import { initGeminiConversationBridge } from './geminiConversationBridge';
import { initGeminiBridge } from './geminiBridge';
import { initMcpBridge } from './mcpBridge';
import { initModelBridge } from './modelBridge';
import { initPreviewHistoryBridge } from './previewHistoryBridge';
import { initShellBridge } from './shellBridge';
import { initWindowControlsBridge } from './windowControlsBridge';
import { initPluginBridge } from '@/plugin/bridge/pluginBridge';
import { getPluginManager } from '@/plugin/initPluginSystem';
import { initAssistantBridge } from './assistantBridge';

/**
 * 初始化所有IPC桥接模块（除了插件桥）
 * Plugin bridge must be initialized separately after plugin system is ready
 */
export function initAllBridges(): void {
  initDialogBridge();
  initShellBridge();
  initFsBridge();
  initFileWatchBridge();
  initConversationBridge();
  initApplicationBridge();
  initGeminiConversationBridge();
  // 额外的 Gemini 辅助桥（订阅检测等）需要在对话桥初始化后可用 / extra helpers after core bridges
  initGeminiBridge();
  initAcpConversationBridge();
  initCodexConversationBridge();
  initAuthBridge();
  initModelBridge();
  initMcpBridge();
  initDatabaseBridge();
  initPreviewHistoryBridge();
  initDocumentBridge();
  initWindowControlsBridge();
  initAssistantBridge();
}

/**
 * 初始化插件IPC桥接
 * Must be called after plugin system is initialized (after initPluginSystem)
 */
export function initPluginBridgeIfReady(): void {
  const pluginManager = getPluginManager();
  if (pluginManager) {
    initPluginBridge(pluginManager);
    console.log('[Bridge] Plugin IPC bridge initialized');
  } else {
    console.warn('[Bridge] Plugin manager not initialized, skipping plugin bridge');
  }
}

/**
 * 初始化ACP检测器
 */
export async function initializeAcpDetector(): Promise<void> {
  try {
    await acpDetector.initialize();
  } catch (error) {
    console.error('[ACP] Failed to initialize detector:', error);
  }
}

// 导出初始化函数供单独使用
export { initAcpConversationBridge, initApplicationBridge, initAssistantBridge, initAuthBridge, initCodexConversationBridge, initConversationBridge, initDatabaseBridge, initDialogBridge, initDocumentBridge, initFsBridge, initGeminiBridge, initGeminiConversationBridge, initMcpBridge, initModelBridge, initPreviewHistoryBridge, initShellBridge, initWindowControlsBridge };
// 导出窗口控制相关工具函数
export { registerWindowMaximizeListeners } from './windowControlsBridge';
