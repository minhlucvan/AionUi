/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
import type { HookModule, HookConfig, HookHandler, HookEvent, NormalizedHook } from './types';

const nodeRequire = createRequire(__filename);

/**
 * Normalize hook config: supports both full object and shorthand function
 */
function normalizeConfig(config: HookConfig | HookHandler): Required<HookConfig> {
  if (typeof config === 'function') {
    return { handler: config, priority: 50, enabled: true };
  }
  return {
    handler: config.handler,
    priority: config.priority ?? 50,
    enabled: config.enabled ?? true,
  };
}

/**
 * Parse a hook module and extract all hooks
 */
function parseModule(moduleExports: HookModule, moduleName: string): NormalizedHook[] {
  const hooks: NormalizedHook[] = [];

  for (const [eventName, hookConfig] of Object.entries(moduleExports)) {
    if (!hookConfig) continue;

    const config = normalizeConfig(hookConfig);

    hooks.push({
      event: eventName as HookEvent,
      handler: config.handler,
      priority: config.priority,
      enabled: config.enabled,
      moduleName,
    });
  }

  return hooks;
}

/**
 * Discover and load all hook modules from directory
 */
export function loadHookModules(hooksDir: string): NormalizedHook[] {
  if (!fs.existsSync(hooksDir)) {
    return [];
  }

  const allHooks: NormalizedHook[] = [];
  const files = fs.readdirSync(hooksDir).filter((f) => f.endsWith('.js'));

  for (const fileName of files) {
    const modulePath = path.join(hooksDir, fileName);

    try {
      delete nodeRequire.cache[modulePath]; // Hot-reload
      const moduleExports: HookModule = nodeRequire(modulePath);

      if (typeof moduleExports === 'object' && moduleExports !== null) {
        const hooks = parseModule(moduleExports, fileName);
        allHooks.push(...hooks);
      } else {
        console.warn(`[Hooks] Invalid module format: ${fileName}`);
      }
    } catch (error) {
      console.error(`[Hooks] Failed to load ${fileName}:`, error);
    }
  }

  return allHooks;
}
