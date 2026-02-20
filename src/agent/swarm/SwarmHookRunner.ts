/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { runHooks } from '@/assistant/hooks/HookRunner';
import type { SwarmAgentConfig, SwarmFeedEntry, SwarmHookContext, SwarmHookResult, TurnStrategy } from './types';
import type { SwarmFeedManager } from './SwarmFeedManager';

/**
 * Run swarm-specific hooks for a given agent role.
 * Injects SwarmHookContext into the standard HookContext.
 */
export async function runSwarmHooks(
  event: 'onSwarmInit' | 'onSwarmTurnStart' | 'onSwarmTurnEnd' | 'onSwarmFeedMessage',
  options: {
    role: string;
    agentConfig: SwarmAgentConfig;
    feedManager: SwarmFeedManager;
    turnNumber: number;
    maxTurns: number;
    turnStrategy: TurnStrategy;
    peers: string[];
    workspace: string;
    assistantHooksPath: string;
    content?: string;
    agentOutput?: string;
    feedEntries?: SwarmFeedEntry[];
  }
): Promise<SwarmHookResult> {
  const swarmContext: SwarmHookContext = {
    role: options.role,
    name: options.agentConfig.name,
    agentBackend: options.agentConfig.presetAgentType || 'claude',
    peers: options.peers,
    turnNumber: options.turnNumber,
    maxTurns: options.maxTurns,
    turnStrategy: options.turnStrategy,
    feed: {
      append: (entry) =>
        options.feedManager.append({
          ...entry,
          from: options.role,
          backend: options.agentConfig.presetAgentType,
        }),
      readNew: () => options.feedManager.readNewFor(options.role),
      readAll: () => options.feedManager.readAll(),
      isDone: () => options.feedManager.isDone(),
    },
  };

  return (await runHooks(event, {
    assistantPath: options.assistantHooksPath.replace(/\/hooks$/, ''),
    workspace: options.workspace,
    backend: options.agentConfig.presetAgentType,
    content: options.content,
    swarm: swarmContext,
    agentOutput: options.agentOutput,
    feedEntries: options.feedEntries,
  } as any)) as SwarmHookResult;
}
