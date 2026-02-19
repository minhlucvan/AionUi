/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DualSessionService
 *
 * Service layer for dual-session (driver/navigator) runs.
 * Uses MultiAgentSession directly with pair topology instead of
 * the DualSessionOrchestrator facade.
 */

import { ipcBridge } from '@/common';
import { uuid } from '@/common/utils';
import type { TProviderWithModel } from '@/common/storage';
import type { DualSessionProgress, DualSessionResult, DualSessionStatus } from '@/agent/dual-session/types';
import { DUAL_SESSION_DEFAULTS, DUAL_SESSION_COMPLETION_SIGNAL } from '@/agent/dual-session/types';
import { MultiAgentSession } from '@/agent/multi-agent/MultiAgentSession';
import type { CreateSessionFn } from '@/agent/multi-agent/MultiAgentSession';
import { createPairTopology } from '@/agent/multi-agent/topologies';
import type AcpAgentManager from '@/process/task/AcpAgentManager';
import { ConversationService } from './conversationService';
import WorkerManage from '../WorkerManage';

/**
 * Parameters to start a dual-session run.
 */
export type DualSessionStartParams = {
  /** The task/goal to accomplish */
  task: string;

  /** Working directory (both sessions share the same workspace) */
  workspace: string;

  /** ACP backend for the driver (default: 'claude') */
  driverBackend?: string;

  /** ACP backend for the navigator (default: 'claude') */
  navigatorBackend?: string;

  /** CLI path override for the driver */
  driverCliPath?: string;

  /** CLI path override for the navigator */
  navigatorCliPath?: string;

  /** Model configuration */
  model?: TProviderWithModel;

  /** Max relay turns (default: 20) */
  maxTurns?: number;

  /** Auto-approve tool calls (default: true) */
  yoloMode?: boolean;

  /** Custom context for the driver session */
  driverContext?: string;

  /** Custom context for the navigator session */
  navigatorContext?: string;

  /** Skills to enable for the driver */
  driverSkills?: string[];

  /** Skills to enable for the navigator */
  navigatorSkills?: string[];

  /** Custom agent ID for the driver */
  driverCustomAgentId?: string;

  /** Custom agent ID for the navigator */
  navigatorCustomAgentId?: string;

  /** Node hooks path for driver */
  driverNodeHooksPath?: string;

  /** Node hooks path for navigator */
  navigatorNodeHooksPath?: string;
};

type ActiveRun = {
  id: string;
  session: MultiAgentSession;
  resultPromise: Promise<DualSessionResult>;
};

/** Active dual-session runs, keyed by run ID */
const activeRuns = new Map<string, ActiveRun>();

/**
 * Create the session factory for spawning ACP conversations.
 */
function createSessionFactory(model?: TProviderWithModel): CreateSessionFn {
  return async (params) => {
    const conversationId = uuid();

    const result = await ConversationService.createConversation({
      type: 'acp',
      id: conversationId,
      name: `dual-session-${params.backend}-${conversationId.slice(0, 8)}`,
      model: model || { provider: 'default', model: '' },
      extra: {
        workspace: params.workspace,
        backend: params.backend as any,
        cliPath: params.cliPath,
        customWorkspace: true,
        presetContext: params.presetContext,
        enabledSkills: params.enabledSkills,
        customAgentId: params.customAgentId,
      },
      source: 'aionui',
    });

    if (!result.success || !result.conversation) {
      throw new Error(`Failed to create session: ${result.error}`);
    }

    const task = WorkerManage.getTaskById(result.conversation.id);
    if (!task) {
      throw new Error(`Task manager not found for conversation ${result.conversation.id}`);
    }

    if (params.yoloMode) {
      await task.ensureYoloMode();
    }

    return {
      conversationId: result.conversation.id,
      task: task as AcpAgentManager,
    };
  };
}

/**
 * Map MultiAgentResult → DualSessionResult.
 */
function toProgress(session: MultiAgentSession): DualSessionProgress {
  const mp = session.progress;
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

/**
 * Start a new dual-session run.
 */
export async function startDualSession(params: DualSessionStartParams): Promise<{
  runId: string;
  driverConversationId: string;
  navigatorConversationId: string;
}> {
  const runId = uuid();

  const driverBackend = (params.driverBackend as any) || DUAL_SESSION_DEFAULTS.driverBackend;
  const navigatorBackend = (params.navigatorBackend as any) || DUAL_SESSION_DEFAULTS.navigatorBackend;
  const maxTurns = params.maxTurns ?? DUAL_SESSION_DEFAULTS.maxTurns;
  const yoloMode = params.yoloMode ?? DUAL_SESSION_DEFAULTS.yoloMode;

  // Build pair topology
  const topology = createPairTopology(driverBackend, navigatorBackend, {
    driverContext: params.driverContext,
    navigatorContext: params.navigatorContext,
    driverCliPath: params.driverCliPath,
    navigatorCliPath: params.navigatorCliPath,
  });

  // Apply skills, custom agent IDs, and hooks to node configs
  if (params.driverSkills) topology.nodes[0].enabledSkills = params.driverSkills;
  if (params.navigatorSkills) topology.nodes[1].enabledSkills = params.navigatorSkills;
  if (params.driverCustomAgentId) topology.nodes[0].customAgentId = params.driverCustomAgentId;
  if (params.navigatorCustomAgentId) topology.nodes[1].customAgentId = params.navigatorCustomAgentId;
  if (params.driverNodeHooksPath) topology.nodes[0].nodeHooksPath = params.driverNodeHooksPath;
  if (params.navigatorNodeHooksPath) topology.nodes[1].nodeHooksPath = params.navigatorNodeHooksPath;

  const sessionFactory = createSessionFactory(params.model);

  const session = new MultiAgentSession(
    sessionFactory,
    {
      task: params.task,
      workspace: params.workspace,
      topology,
      maxTurns,
      yoloMode,
      completionPattern: DUAL_SESSION_COMPLETION_SIGNAL,
    },
    () => {
      ipcBridge.dualSession.statusUpdate.emit({ runId, progress: toProgress(session) });
    }
  );

  const resultPromise = session.run().then((result) => {
    activeRuns.delete(runId);

    const driverNode = result.nodes.find((n) => n.id === 'driver');
    const navigatorNode = result.nodes.find((n) => n.id === 'navigator');

    const dualResult: DualSessionResult = {
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

    ipcBridge.dualSession.completed.emit({ runId, result: dualResult });
    console.log(`[DualSessionService] Run ${runId} completed: status=${result.status}, turns=${result.totalTurns}, completed=${result.taskCompleted}`);

    return dualResult;
  });

  activeRuns.set(runId, { id: runId, session, resultPromise });

  const progress = toProgress(session);
  console.log(`[DualSessionService] Started run ${runId}`);

  return {
    runId,
    driverConversationId: progress.driverConversationId,
    navigatorConversationId: progress.navigatorConversationId,
  };
}

export function stopDualSession(runId: string): boolean {
  const run = activeRuns.get(runId);
  if (!run) return false;
  run.session.stop();
  activeRuns.delete(runId);
  return true;
}

export function getDualSessionProgress(runId: string): DualSessionProgress | null {
  const run = activeRuns.get(runId);
  if (!run) return null;
  return toProgress(run.session);
}

export function listDualSessions(): Array<{
  runId: string;
  status: string;
  currentTurn: number;
  maxTurns: number;
  driverConversationId: string;
  navigatorConversationId: string;
}> {
  return Array.from(activeRuns.values()).map((run) => {
    const progress = toProgress(run.session);
    return {
      runId: run.id,
      status: progress.status,
      currentTurn: progress.currentTurn,
      maxTurns: progress.maxTurns,
      driverConversationId: progress.driverConversationId,
      navigatorConversationId: progress.navigatorConversationId,
    };
  });
}

export async function waitForDualSession(runId: string): Promise<DualSessionResult | null> {
  const run = activeRuns.get(runId);
  if (!run) return null;
  return run.resultPromise;
}
