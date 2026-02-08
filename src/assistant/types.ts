/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Assistant Workspace Integration Types
 *
 * Minimal types for assistant workspace template copying
 */

import type { AssistantHooksConfig } from './hooks/types';

/**
 * Assistant metadata (assistant.json)
 * Defines an assistant with an associated workspace template
 */
export interface AssistantMetadata {
  /** Assistant unique identifier */
  id: string;
  /** Assistant display name */
  name: string;
  /** Assistant version */
  version: string;
  /** Assistant description */
  description: string;
  /** Assistant author */
  author?: string;
  /** Path to workspace directory relative to assistant root */
  workspacePath: string;
  /** Assistant tags for categorization */
  tags?: string[];
  /** Preset agent type (claude, gemini, codex) */
  presetAgentType?: 'claude' | 'gemini' | 'codex';
  /** Default agent to auto-invoke for every message (e.g., "game-developer") / 每条消息自动调用的默认 agent */
  defaultAgent?: string;
  /** Pipeline hooks for intercepting messages (works with all agent types) / 拦截消息的管道 hooks（支持所有 agent 类型）*/
  hooks?: AssistantHooksConfig;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}
