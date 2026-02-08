/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Assistant Hooks - Simple JS file-based hooks
 *
 * Hooks are JS files defined at the assistant level (assistant/{id}/hooks/)
 * and copied into the workspace at runtime:
 *   hooks/on-send-message.js
 *
 * Each JS file exports a function that receives a context and returns a result:
 *   module.exports = function(context) {
 *     return { content: context.content };
 *   };
 */

/** Supported hook events */
export type HookEvent = 'on-conversation-init' | 'on-send-message';

/** Context passed to hook JS files */
export type HookContext = {
  /** The hook event name */
  event: HookEvent;
  /** The message content */
  content: string;
  /** The workspace directory path */
  workspace: string;
};

/** Result returned by hook JS files */
export type HookResult = {
  /** The (possibly transformed) content */
  content: string;
  /** Whether the message should be blocked */
  blocked?: boolean;
  /** Reason for blocking */
  blockReason?: string;
};
