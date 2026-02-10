/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { getSkillsDir } from '@/process/initStorage';
import { loadHookModules } from '@/assistant/hooks/ModuleLoader';
import { executeHooks } from '@/assistant/hooks/HookExecutor';
import { createHookUtils } from '@/assistant/hooks/HookRunner';
import type { HookEvent, HookContext, HookResult } from '@/assistant/hooks/types';
import type { AcpBackend } from '@/types/acpTypes';

/**
 * Run agent-level hooks for ACP (Claude Code)
 *
 * Hook modules are loaded from: src/agent/acp/hooks/*.js
 *
 * Each module exports an object with event handlers:
 *   module.exports = {
 *     onWorkspaceInit: { handler: async (ctx) => {...}, priority: 10 },
 *     onSendMessage: (ctx) => {...}  // Shorthand
 *   };
 *
 * @param event - The hook event (e.g., 'onWorkspaceInit')
 * @param context - Hook context object
 * @returns HookResult with transformed content
 */
export async function runAgentHooks(
  event: HookEvent,
  context: {
    workspace: string;
    backend: AcpBackend;
    content?: string;
    enabledSkills?: string[];
    conversationId?: string;
  }
): Promise<HookResult> {
  // Agent hooks are in src/agent/acp/hooks/ (only for Claude Code ACP backend)
  const hooksDir = path.join(__dirname, '..', '..', 'agent', 'acp', 'hooks');

  if (!fs.existsSync(hooksDir)) {
    return { content: context.content };
  }

  const hookModules = loadHookModules(hooksDir);
  if (hookModules.length === 0) {
    return { content: context.content };
  }

  const fullContext: HookContext = {
    event,
    workspace: context.workspace,
    backend: context.backend,
    content: context.content,
    enabledSkills: context.enabledSkills || [],
    conversationId: context.conversationId,
    skillsSourceDir: getSkillsDir(),
    utils: createHookUtils(),
  };

  return await executeHooks(event, fullContext, hookModules);
}
