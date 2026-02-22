/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Browser agent command types - mirrors Chrome DevTools MCP tool names
 * 浏览器代理命令类型 - 对应 Chrome DevTools MCP 工具名称
 */
export type BrowserAgentCommandType =
  | 'navigate'
  | 'screenshot'
  | 'click'
  | 'type'
  | 'evaluate'
  | 'get_html'
  | 'get_text'
  | 'scroll'
  | 'hover'
  | 'select_option'
  | 'wait_for_selector'
  | 'go_back'
  | 'go_forward'
  | 'reload';

/**
 * Browser agent command sent from main process to renderer webview
 * 从主进程发送到渲染进程 webview 的浏览器代理命令
 */
export interface BrowserAgentCommand {
  /** Unique request ID for correlating responses */
  requestId: string;
  /** The command type to execute */
  command: BrowserAgentCommandType;
  /** Command-specific parameters */
  params: BrowserAgentCommandParams;
}

/**
 * Union type of all command parameters
 * 所有命令参数的联合类型
 */
export type BrowserAgentCommandParams =
  | NavigateParams
  | ScreenshotParams
  | ClickParams
  | TypeParams
  | EvaluateParams
  | GetHtmlParams
  | GetTextParams
  | ScrollParams
  | HoverParams
  | SelectOptionParams
  | WaitForSelectorParams
  | EmptyParams;

export type NavigateParams = { url: string };
export type ScreenshotParams = { selector?: string; fullPage?: boolean };
export type ClickParams = { selector: string };
export type TypeParams = { selector: string; text: string; clearFirst?: boolean };
export type EvaluateParams = { expression: string };
export type GetHtmlParams = { selector?: string; outer?: boolean };
export type GetTextParams = { selector?: string };
export type ScrollParams = { x?: number; y?: number; selector?: string; direction?: 'up' | 'down' };
export type HoverParams = { selector: string };
export type SelectOptionParams = { selector: string; value: string };
export type WaitForSelectorParams = { selector: string; timeout?: number };
export type EmptyParams = Record<string, never>;

/**
 * Browser agent command result returned from renderer to main process
 * 从渲染进程返回到主进程的浏览器代理命令结果
 */
export interface BrowserAgentResult {
  /** Request ID that this result corresponds to */
  requestId: string;
  /** Whether the command succeeded */
  success: boolean;
  /** Result data (command-specific) */
  data?: unknown;
  /** Error message if failed */
  error?: string;
}

/**
 * Browser agent status info
 * 浏览器代理状态信息
 */
export interface BrowserAgentStatus {
  /** Whether the built-in browser is currently open */
  isOpen: boolean;
  /** Current URL loaded in the browser */
  currentUrl?: string;
  /** Page title */
  title?: string;
}

/**
 * Built-in browser agent tool names recognized by the interceptor
 * 拦截器识别的内置浏览器代理工具名称
 */
export const BROWSER_AGENT_TOOLS = [
  'navigate',
  'navigate_page',
  'new_page',
  'screenshot',
  'take_screenshot',
  'click',
  'click_element',
  'type',
  'type_text',
  'fill',
  'evaluate',
  'execute_javascript',
  'get_html',
  'get_page_html',
  'get_content',
  'get_text',
  'get_page_text',
  'scroll',
  'scroll_page',
  'hover',
  'hover_element',
  'select_option',
  'wait_for_selector',
  'go_back',
  'go_forward',
  'reload',
  'refresh',
] as const;

/**
 * Built-in browser agent server identifiers
 * 内置浏览器代理服务器标识符
 */
export const BUILTIN_BROWSER_IDENTIFIERS = ['aionui-browser', 'aionui_browser', 'builtin-browser', 'builtin_browser'] as const;

/**
 * Map tool name aliases to canonical command types
 * 将工具名称别名映射到规范的命令类型
 */
export function normalizeToolToCommand(toolName: string): BrowserAgentCommandType | null {
  const lower = toolName.toLowerCase().trim();

  switch (lower) {
    case 'navigate':
    case 'navigate_page':
    case 'new_page':
      return 'navigate';
    case 'screenshot':
    case 'take_screenshot':
      return 'screenshot';
    case 'click':
    case 'click_element':
      return 'click';
    case 'type':
    case 'type_text':
    case 'fill':
      return 'type';
    case 'evaluate':
    case 'execute_javascript':
      return 'evaluate';
    case 'get_html':
    case 'get_page_html':
    case 'get_content':
      return 'get_html';
    case 'get_text':
    case 'get_page_text':
      return 'get_text';
    case 'scroll':
    case 'scroll_page':
      return 'scroll';
    case 'hover':
    case 'hover_element':
      return 'hover';
    case 'select_option':
      return 'select_option';
    case 'wait_for_selector':
      return 'wait_for_selector';
    case 'go_back':
      return 'go_back';
    case 'go_forward':
      return 'go_forward';
    case 'reload':
    case 'refresh':
      return 'reload';
    default:
      return null;
  }
}
