/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Assistant Hooks Type Definitions
 *
 * Declarative hooks that intercept the message pipeline for all agent types.
 * Configured in assistant.json and stored in conversation.extra.assistantHooks.
 */

/** Hook event types / Hook 事件类型 */
export type AssistantHookEvent = 'onSendMessage' | 'onReceiveMessage' | 'onConversationStart' | 'onConversationEnd';

/** Hook action definitions (declarative, JSON-safe) / Hook 动作定义（声明式，JSON 安全） */
export type AssistantHookAction =
  | { action: 'prefixContent'; value: string }
  | { action: 'suffixContent'; value: string }
  | { action: 'replaceContent'; pattern: string; replacement: string; flags?: string }
  | { action: 'blockMessage'; pattern: string; message?: string }
  | { action: 'addMetadata'; key: string; value: string }
  | { action: 'injectDefaultAgent'; agentName: string };

/** Hook configuration as stored in assistant.json / assistant.json 中的 hooks 配置 */
export type AssistantHooksConfig = {
  [K in AssistantHookEvent]?: AssistantHookAction[];
};

/** Result of running a hook chain / 运行 hook 链的结果 */
export type HookResult = {
  /** The (possibly transformed) content / 转换后的内容 */
  content: string;
  /** Whether the message was blocked / 消息是否被阻止 */
  blocked: boolean;
  /** Reason for blocking, if blocked / 阻止原因 */
  blockReason?: string;
  /** Additional metadata added by hooks / hooks 添加的额外元数据 */
  metadata: Record<string, string>;
};
