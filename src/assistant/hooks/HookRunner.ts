/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AssistantHookEvent, AssistantHooksConfig, HookResult } from './types';

/**
 * Run hooks for a given event against message content.
 * Pure function with no side effects - safe to call from any agent manager.
 *
 * 运行指定事件的 hooks 对消息内容进行处理。
 * 纯函数，无副作用 - 可在任何 agent manager 中安全调用。
 *
 * @param event - The hook event type
 * @param content - The message content to process
 * @param hooks - The hooks config (from conversation.extra.assistantHooks)
 * @returns HookResult with transformed content and status
 */
export function runHooks(event: AssistantHookEvent, content: string, hooks?: AssistantHooksConfig): HookResult {
  const result: HookResult = {
    content,
    blocked: false,
    metadata: {},
  };

  if (!hooks) return result;

  const actions = hooks[event];
  if (!actions || actions.length === 0) return result;

  for (const action of actions) {
    if (result.blocked) break;

    switch (action.action) {
      case 'prefixContent':
        result.content = action.value + result.content;
        break;

      case 'suffixContent':
        result.content = result.content + action.value;
        break;

      case 'replaceContent':
        try {
          const regex = new RegExp(action.pattern, action.flags || 'g');
          result.content = result.content.replace(regex, action.replacement);
        } catch (e) {
          console.warn(`[AssistantHooks] Invalid regex pattern in replaceContent: ${action.pattern}`, e);
        }
        break;

      case 'blockMessage':
        try {
          const regex = new RegExp(action.pattern);
          if (regex.test(result.content)) {
            result.blocked = true;
            result.blockReason = action.message || 'Message blocked by assistant hook';
          }
        } catch (e) {
          console.warn(`[AssistantHooks] Invalid regex pattern in blockMessage: ${action.pattern}`, e);
        }
        break;

      case 'addMetadata':
        result.metadata[action.key] = action.value;
        break;

      case 'injectDefaultAgent':
        if (!result.content.includes(`@${action.agentName}`)) {
          result.content = `@${action.agentName} ${result.content}`;
        }
        break;
    }
  }

  return result;
}
