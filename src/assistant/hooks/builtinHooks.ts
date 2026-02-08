/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AssistantMetadata } from '../types';
import type { AssistantHooksConfig } from './types';

/**
 * Build default hooks from legacy assistant.json fields.
 * Ensures backward compatibility: if an assistant has `defaultAgent` but no explicit `hooks`,
 * we auto-generate the equivalent hook actions.
 *
 * 从 assistant.json 的旧字段构建默认 hooks。
 * 确保向后兼容：如果助手有 `defaultAgent` 但没有显式 `hooks`，
 * 自动生成等效的 hook 动作。
 *
 * @param metadata - The assistant metadata from assistant.json
 * @returns Resolved hooks config, or undefined if no hooks needed
 */
export function buildDefaultHooks(metadata: AssistantMetadata): AssistantHooksConfig | undefined {
  // If hooks are explicitly defined, use them as-is
  if (metadata.hooks) return metadata.hooks;

  // Generate hooks from legacy fields
  const hooks: AssistantHooksConfig = {};

  if (metadata.defaultAgent) {
    hooks.onSendMessage = [{ action: 'injectDefaultAgent', agentName: metadata.defaultAgent }];
  }

  // Return undefined if no hooks were generated
  const keys = Object.keys(hooks);
  return keys.length > 0 ? hooks : undefined;
}
