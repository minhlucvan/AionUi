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

/** Utility functions provided to hooks */
export type HookUtils = {
  /** Copy a directory recursively */
  copyDirectory: (source: string, target: string, options?: { overwrite?: boolean }) => Promise<void>;
  /** Read a file */
  readFile: (filePath: string, encoding?: BufferEncoding) => Promise<string>;
  /** Write a file */
  writeFile: (filePath: string, content: string, encoding?: BufferEncoding) => Promise<void>;
  /** Check if path exists */
  exists: (filePath: string) => Promise<boolean>;
  /** Ensure directory exists */
  ensureDir: (dirPath: string) => Promise<void>;
  /** Join paths */
  join: (...paths: string[]) => string;
};

/** Context passed to hook JS files */
export type HookContext = {
  /** The hook event name */
  event: HookEvent;
  /** The message content (for on-send-message) */
  content: string;
  /** The workspace directory path */
  workspace: string;
  /** The assistant directory path (for on-conversation-init) */
  assistantPath?: string;
  /** The conversation ID (for on-conversation-init) */
  conversationId?: string;
  /** Utility functions */
  utils?: HookUtils;
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
