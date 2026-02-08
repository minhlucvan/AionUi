/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import type { HookContext, HookEvent, HookResult } from './types';

/**
 * Run hooks for a given event by executing JS files from the workspace hooks folder.
 *
 * Hook files are loaded from: {workspace}/.claude/hooks/{event}.js
 * Or from a directory: {workspace}/.claude/hooks/{event}/*.js
 *
 * Each hook file should export a function:
 *   module.exports = function(context) { return { content: ... }; };
 *
 * @param event - The hook event name (e.g., 'on-send-message')
 * @param content - The message content to process
 * @param workspace - The workspace directory path
 * @returns HookResult with transformed content
 */
export async function runHooks(event: HookEvent, content: string, workspace?: string): Promise<HookResult> {
  const defaultResult: HookResult = { content };
  if (!workspace) return defaultResult;

  const hooksDir = path.join(workspace, '.claude', 'hooks');
  if (!fs.existsSync(hooksDir)) return defaultResult;

  // Collect hook files: single file or directory of files
  const hookFiles = resolveHookFiles(hooksDir, event);
  if (hookFiles.length === 0) return defaultResult;

  let result: HookResult = { content };

  for (const hookFile of hookFiles) {
    if (result.blocked) break;

    try {
      // Clear require cache to support hot-reload
      delete require.cache[require.resolve(hookFile)];
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const hookModule = require(hookFile);

      const hookFn = typeof hookModule === 'function' ? hookModule : hookModule?.default;
      if (typeof hookFn !== 'function') {
        console.warn(`[AssistantHooks] Hook file does not export a function: ${hookFile}`);
        continue;
      }

      const ctx: HookContext = { event, content: result.content, workspace };
      const output = hookFn(ctx);

      // Support both sync and async hooks
      const resolved: HookResult = output instanceof Promise ? await output : output;

      if (resolved && typeof resolved === 'object') {
        result = {
          content: typeof resolved.content === 'string' ? resolved.content : result.content,
          blocked: resolved.blocked,
          blockReason: resolved.blockReason,
        };
      }
    } catch (error) {
      console.warn(`[AssistantHooks] Error running hook ${hookFile}:`, error);
    }
  }

  return result;
}

/**
 * Resolve hook files for an event.
 * Supports: single file ({event}.js) or directory ({event}/*.js)
 */
function resolveHookFiles(hooksDir: string, event: string): string[] {
  const files: string[] = [];

  // Check for single file: on-send-message.js
  const singleFile = path.join(hooksDir, `${event}.js`);
  if (fs.existsSync(singleFile) && fs.statSync(singleFile).isFile()) {
    files.push(singleFile);
    return files;
  }

  // Check for directory: on-send-message/*.js
  const eventDir = path.join(hooksDir, event);
  if (fs.existsSync(eventDir) && fs.statSync(eventDir).isDirectory()) {
    const entries = fs.readdirSync(eventDir).sort();
    for (const entry of entries) {
      if (entry.endsWith('.js')) {
        files.push(path.join(eventDir, entry));
      }
    }
  }

  return files;
}
