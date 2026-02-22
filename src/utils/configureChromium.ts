/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { app } from 'electron';

// Configure Chromium command-line flags for WebUI and CLI modes
// 为 WebUI 和 CLI 模式配置 Chromium 命令行参数

const isWebUI = process.argv.some((arg) => arg === '--webui');
const isResetPassword = process.argv.includes('--resetpass');

// Enable remote debugging port for CDP access (agent-browser, chrome-devtools-mcp)
// 启用远程调试端口，以支持 CDP 访问（agent-browser、chrome-devtools-mcp）
// Port 0 means the OS will assign a random free port
// 端口 0 表示操作系统会分配一个随机空闲端口
const cdpPortArg = process.argv.find((arg) => arg.startsWith('--remote-debugging-port='));
if (!cdpPortArg) {
  app.commandLine.appendSwitch('remote-debugging-port', '0');
}

// Only configure flags for WebUI and --resetpass modes
// 仅为 WebUI 和重置密码模式配置参数
if (isWebUI || isResetPassword) {
  // For Linux without DISPLAY, enable headless mode
  // 对于无显示服务器的 Linux，启用 headless 模式
  if (process.platform === 'linux' && !process.env.DISPLAY) {
    app.commandLine.appendSwitch('headless');
    app.commandLine.appendSwitch('disable-gpu');
    app.commandLine.appendSwitch('disable-software-rasterizer');
  }

  // For root user, disable sandbox to prevent crash
  // 对于 root 用户，禁用沙箱以防止崩溃
  if (typeof process.getuid === 'function' && process.getuid() === 0) {
    app.commandLine.appendSwitch('no-sandbox');
  }
}
