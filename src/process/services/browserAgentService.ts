/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserWindow } from 'electron';
import { uuid } from '@/common/utils';
import type { BrowserAgentCommand, BrowserAgentCommandType, BrowserAgentCommandParams, BrowserAgentResult, BrowserAgentStatus } from '@/common/types/browserAgent';
import { normalizeToolToCommand } from '@/common/types/browserAgent';

/**
 * Default timeout for browser commands (ms)
 * 浏览器命令默认超时时间（毫秒）
 */
const COMMAND_TIMEOUT = 30000;

/**
 * BrowserAgentService - Bridges AI agents to the built-in browser webview.
 * Provides Chrome DevTools MCP-like functionality using the Electron webview.
 *
 * 浏览器代理服务 - 将 AI 代理连接到内置浏览器 webview。
 * 使用 Electron webview 提供类似 Chrome DevTools MCP 的功能。
 *
 * Flow:
 * 1. Agent calls executeCommand() with a tool name and parameters
 * 2. Service normalizes the tool name to a canonical command type
 * 3. Command is sent to renderer via IPC (browser-agent.command)
 * 4. Renderer's useBrowserAgent hook executes command on webview
 * 5. Result is sent back via IPC (browser-agent.result)
 * 6. Promise resolves with the result
 */
export class BrowserAgentService {
  private static instance: BrowserAgentService | null = null;
  private pendingRequests = new Map<string, { resolve: (result: BrowserAgentResult) => void; timer: NodeJS.Timeout }>();
  private resultHandler: (() => void) | null = null;

  private constructor() {
    // Listen for results from renderer
    this.startListening();
  }

  static getInstance(): BrowserAgentService {
    if (!BrowserAgentService.instance) {
      BrowserAgentService.instance = new BrowserAgentService();
    }
    return BrowserAgentService.instance;
  }

  /**
   * Start listening for results from the renderer process
   * 开始监听渲染进程的结果
   */
  private startListening(): void {
    // Import dynamically to avoid circular dependency
    const { ipcMain } = require('electron');

    // Listen for browser-agent.result events from renderer
    ipcMain.on('browser-agent.result', (_event: Electron.IpcMainEvent, result: BrowserAgentResult) => {
      this.handleResult(result);
    });
  }

  /**
   * Handle a result from the renderer
   * 处理来自渲染进程的结果
   */
  private handleResult(result: BrowserAgentResult): void {
    const pending = this.pendingRequests.get(result.requestId);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingRequests.delete(result.requestId);
      pending.resolve(result);
    }
  }

  /**
   * Send a command to the renderer's webview and wait for the result.
   * 发送命令到渲染进程的 webview 并等待结果。
   *
   * @param command The canonical command type
   * @param params Command parameters
   * @param timeout Optional timeout in ms (default 30s)
   */
  async sendCommand(command: BrowserAgentCommandType, params: BrowserAgentCommandParams, timeout: number = COMMAND_TIMEOUT): Promise<BrowserAgentResult> {
    const requestId = uuid();

    // Send command to renderer via focused BrowserWindow
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    if (!win) {
      return { requestId, success: false, error: 'No browser window available' };
    }

    return new Promise<BrowserAgentResult>((resolve) => {
      // Set up timeout
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        resolve({ requestId, success: false, error: `Command '${command}' timed out after ${timeout}ms` });
      }, timeout);

      // Store pending request
      this.pendingRequests.set(requestId, { resolve, timer });

      // Send command to renderer
      const cmd: BrowserAgentCommand = { requestId, command, params };
      win.webContents.send('browser-agent.command', cmd);
    });
  }

  /**
   * Execute a browser tool by name (handles tool name normalization).
   * This is the main entry point for agents to control the built-in browser.
   *
   * 通过工具名称执行浏览器工具（处理工具名称规范化）。
   * 这是代理控制内置浏览器的主要入口点。
   *
   * @param toolName The MCP tool name (e.g., 'navigate_page', 'screenshot')
   * @param params The tool parameters
   * @returns The command result
   */
  async executeCommand(toolName: string, params: Record<string, unknown>): Promise<BrowserAgentResult> {
    const command = normalizeToolToCommand(toolName);
    if (!command) {
      return { requestId: '', success: false, error: `Unknown browser tool: ${toolName}` };
    }

    return this.sendCommand(command, params as BrowserAgentCommandParams);
  }

  /**
   * Get current browser status
   * 获取当前浏览器状态
   */
  async getStatus(): Promise<BrowserAgentStatus> {
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    if (!win) {
      return { isOpen: false };
    }

    try {
      // Use a quick command to check status
      const result = await this.sendCommand('get_text' as BrowserAgentCommandType, { selector: 'title' } as BrowserAgentCommandParams, 5000);
      return {
        isOpen: result.success,
        title: result.data ? String((result.data as { text?: string }).text || '') : undefined,
      };
    } catch {
      return { isOpen: false };
    }
  }

  /**
   * Check if a tool name is a browser agent tool
   * 检查工具名称是否为浏览器代理工具
   */
  static isBuiltinBrowserTool(toolName: string): boolean {
    return normalizeToolToCommand(toolName) !== null;
  }

  /**
   * Destroy the singleton instance (for cleanup)
   * 销毁单例实例（用于清理）
   */
  static destroy(): void {
    if (BrowserAgentService.instance) {
      // Clear all pending requests
      for (const [, pending] of BrowserAgentService.instance.pendingRequests) {
        clearTimeout(pending.timer);
      }
      BrowserAgentService.instance.pendingRequests.clear();
      BrowserAgentService.instance = null;
    }
  }
}
