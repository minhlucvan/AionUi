/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DualSessionOrchestrator
 *
 * Thin facade over MultiAgentSession configured with a 'pair' topology.
 * Preserves the original DualSession API (Driver/Navigator, DualSessionProgress)
 * while delegating all actual orchestration to the generic multi-agent system.
 *
 * This is the backward-compatible entry point. New code should consider using
 * MultiAgentSession directly with the topology of their choice.
 */

import type AcpAgentManager from '@/process/task/AcpAgentManager';
import { MultiAgentSession } from '@/agent/multi-agent/MultiAgentSession';
import type { CreateSessionFn as MultiAgentCreateSessionFn } from '@/agent/multi-agent/MultiAgentSession';
import { createPairTopology } from '@/agent/multi-agent/topologies';
import type { DualSessionConfig, DualSessionProgress, DualSessionResult, DualSessionStatus, DualSessionStatusCallback } from './types';
import { DUAL_SESSION_COMPLETION_SIGNAL, DUAL_SESSION_DEFAULTS } from './types';

/**
 * Function to create a conversation and return the task manager.
 * Injected by the service layer to avoid circular dependencies.
 */
export type CreateSessionFn = (params: { workspace: string; backend: string; yoloMode: boolean; customAgentId?: string; cliPath?: string; presetContext?: string; enabledSkills?: string[]; assistantHooksPath?: string }) => Promise<{ conversationId: string; task: AcpAgentManager }>;

export class DualSessionOrchestrator {
  private config: DualSessionConfig;
  private inner: MultiAgentSession;
  private onStatus: DualSessionStatusCallback | undefined;

  constructor(createSession: CreateSessionFn, config: Partial<DualSessionConfig> & { task: string; workspace: string }, onStatus?: DualSessionStatusCallback) {
    this.config = { ...DUAL_SESSION_DEFAULTS, ...config } as DualSessionConfig;
    this.onStatus = onStatus;

    // Build pair topology from DualSession config
    const topology = createPairTopology(this.config.driverBackend, this.config.navigatorBackend, {
      driverContext: this.config.driverContext,
      navigatorContext: this.config.navigatorContext,
      driverCliPath: this.config.driverCliPath,
      navigatorCliPath: this.config.navigatorCliPath,
    });

    // Apply skills and assistant hooks to node configs
    if (this.config.driverSkills) {
      topology.nodes[0].enabledSkills = this.config.driverSkills;
    }
    if (this.config.navigatorSkills) {
      topology.nodes[1].enabledSkills = this.config.navigatorSkills;
    }
    if (this.config.driverCustomAgentId) {
      topology.nodes[0].customAgentId = this.config.driverCustomAgentId;
    }
    if (this.config.navigatorCustomAgentId) {
      topology.nodes[1].customAgentId = this.config.navigatorCustomAgentId;
    }
    if (this.config.assistantHooksPath) {
      topology.nodes[0].assistantHooksPath = this.config.assistantHooksPath;
      topology.nodes[1].assistantHooksPath = this.config.assistantHooksPath;
    }

    const createNodeSession: MultiAgentCreateSessionFn = createSession;

    this.inner = new MultiAgentSession(
      createNodeSession,
      {
        task: this.config.task,
        workspace: this.config.workspace,
        topology,
        maxTurns: this.config.maxTurns,
        yoloMode: this.config.yoloMode,
        completionPattern: DUAL_SESSION_COMPLETION_SIGNAL,
      },
      (_multiProgress) => {
        this.onStatus?.(this.progress);
      }
    );
  }

  get status(): DualSessionStatus {
    return this.inner.status as DualSessionStatus;
  }

  get progress(): DualSessionProgress {
    const mp = this.inner.progress;
    const driverNode = mp.nodes.find((n) => n.id === 'driver');
    const navigatorNode = mp.nodes.find((n) => n.id === 'navigator');

    return {
      currentTurn: mp.currentTurn,
      maxTurns: mp.maxTurns,
      status: mp.status as DualSessionStatus,
      driverConversationId: driverNode?.conversationId || '',
      navigatorConversationId: navigatorNode?.conversationId || '',
      turns: mp.turns.map((t) => ({
        turn: t.turn,
        from: t.from as 'driver' | 'navigator',
        to: t.to as 'driver' | 'navigator',
        content: t.content,
        timestamp: t.timestamp,
      })),
      startedAt: mp.startedAt,
      endedAt: mp.endedAt,
    };
  }

  async run(): Promise<DualSessionResult> {
    const result = await this.inner.run();
    const driverNode = result.nodes.find((n) => n.id === 'driver');
    const navigatorNode = result.nodes.find((n) => n.id === 'navigator');

    return {
      status: result.status as DualSessionStatus,
      totalTurns: result.totalTurns,
      taskCompleted: result.taskCompleted,
      turns: result.turns.map((t) => ({
        turn: t.turn,
        from: t.from as 'driver' | 'navigator',
        to: t.to as 'driver' | 'navigator',
        content: t.content,
        timestamp: t.timestamp,
      })),
      duration: result.duration,
      driverConversationId: driverNode?.conversationId || '',
      navigatorConversationId: navigatorNode?.conversationId || '',
      finalOutput: result.finalOutput,
    };
  }

  stop(): void {
    this.inner.stop();
  }
}
