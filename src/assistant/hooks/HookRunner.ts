/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
import { copyDirectoryRecursively } from '@/process/utils';
import type { HookContext, HookEvent, HookResult, HookUtils } from './types';

// Create a native Node.js require function that works outside webpack
const nodeRequire = createRequire(__filename);

/**
 * Create utility functions for hooks
 */
function createHookUtils(): HookUtils {
  return {
    copyDirectory: async (source: string, target: string, options?: { overwrite?: boolean }) => {
      await copyDirectoryRecursively(source, target, options);
    },
    readFile: async (filePath: string, encoding: BufferEncoding = 'utf-8') => {
      return await fs.promises.readFile(filePath, encoding);
    },
    writeFile: async (filePath: string, content: string, encoding: BufferEncoding = 'utf-8') => {
      await fs.promises.writeFile(filePath, content, encoding);
    },
    exists: async (filePath: string) => {
      try {
        await fs.promises.access(filePath);
        return true;
      } catch {
        return false;
      }
    },
    ensureDir: async (dirPath: string) => {
      await fs.promises.mkdir(dirPath, { recursive: true });
    },
    join: (...paths: string[]) => path.join(...paths),
  };
}

/**
 * Run hooks for a given event by executing JS files from the assistant hooks folder.
 *
 * Hook files are loaded from: {assistantPath}/hooks/{event}.js
 * Or from a directory: {assistantPath}/hooks/{event}/*.js
 *
 * Hooks are defined at the assistant level (assistant/{id}/hooks/) and executed
 * directly from there. This keeps hooks as part of the assistant definition,
 * not copied to each workspace.
 *
 * Each hook file should export a function:
 *   module.exports = function(context) { return { content: ... }; };
 *
 * @param event - The hook event name (e.g., 'on-send-message')
 * @param content - The message content to process
 * @param workspace - The workspace directory path
 * @param context - Additional context (assistantPath, conversationId, etc.)
 * @returns HookResult with transformed content
 */
export async function runHooks(event: HookEvent, content: string, workspace?: string, context?: Partial<HookContext>): Promise<HookResult> {
  const defaultResult: HookResult = { content };

  // Determine where to look for hooks
  // Priority: 1. assistantPath (assistant-level hooks)
  //           2. workspace/hooks (legacy/workspace-specific hooks)
  let hooksDir: string | undefined;

  if (context?.assistantPath) {
    // Look for hooks in assistant directory
    hooksDir = path.join(context.assistantPath, 'hooks');
  } else if (workspace) {
    // Fallback: look for hooks in workspace (legacy behavior)
    hooksDir = path.join(workspace, 'hooks');
  }

  if (!hooksDir || !fs.existsSync(hooksDir)) return defaultResult;

  // Collect hook files: single file or directory of files
  const hookFiles = resolveHookFiles(hooksDir, event);
  if (hookFiles.length === 0) return defaultResult;

  let result: HookResult = { content };
  const utils = createHookUtils();

  for (const hookFile of hookFiles) {
    if (result.blocked) break;

    try {
      // Use native Node.js require to load external hook files
      // Clear require cache to support hot-reload
      delete nodeRequire.cache[hookFile];
      const hookModule = nodeRequire(hookFile);

      const hookFn = typeof hookModule === 'function' ? hookModule : hookModule?.default;
      if (typeof hookFn !== 'function') {
        console.warn(`[AssistantHooks] Hook file does not export a function: ${hookFile}`);
        continue;
      }

      const ctx: HookContext = {
        event,
        content: result.content,
        workspace,
        utils,
        ...context,
      };
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
