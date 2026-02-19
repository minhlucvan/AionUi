/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DualSessionService
 *
 * Convenience service for starting a multi-agent session with pair topology
 * (driver ↔ navigator). Just a thin config wrapper around MultiAgentSession.
 */

import { ipcBridge } from '@/common';
import { uuid } from '@/common/utils';
import type { TProviderWithModel } from '@/common/storage';
import type { MultiAgentProgress, MultiAgentResult } from '@/agent/multi-agent/types';
import { MultiAgentSession } from '@/agent/multi-agent/MultiAgentSession';
import type { CreateSessionFn } from '@/agent/multi-agent/MultiAgentSession';
import { createPairTopology } from '@/agent/multi-agent/topologies';
import type AcpAgentManager from '@/process/task/AcpAgentManager';
import { ConversationService } from './conversationService';
import WorkerManage from '../WorkerManage';

/** Default completion signal for pair topology runs */
const PAIR_COMPLETION_SIGNAL = '<dual-session>DONE</dual-session>';

/** Default config for pair topology runs */
const PAIR_DEFAULTS = {
  driverBackend: 'claude' as const,
  navigatorBackend: 'claude' as const,
  maxTurns: 20,
  yoloMode: true,
};

/**
 * Parameters to start a dual-session (pair topology) run.
 */
export type DualSessionStartParams = {
  task: string;
  workspace: string;
  driverBackend?: string;
  navigatorBackend?: string;
  driverCliPath?: string;
  navigatorCliPath?: string;
  model?: TProviderWithModel;
  maxTurns?: number;
  yoloMode?: boolean;
  driverContext?: string;
  navigatorContext?: string;
  driverSkills?: string[];
  navigatorSkills?: string[];
  driverCustomAgentId?: string;
  navigatorCustomAgentId?: string;
  driverNodeHooksPath?: string;
  navigatorNodeHooksPath?: string;
};

type ActiveRun = {
  id: string;
  session: MultiAgentSession;
  resultPromise: Promise<MultiAgentResult>;
};

const activeRuns = new Map<string, ActiveRun>();

function createSessionFactory(model?: TProviderWithModel): CreateSessionFn {
  return async (params) => {
    const conversationId = uuid();

    const result = await ConversationService.createConversation({
      type: 'acp',
      id: conversationId,
      name: `multi-agent-${params.backend}-${conversationId.slice(0, 8)}`,
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

/** Helper: extract driver/navigator conversation IDs from progress */
function getNodeConversationIds(progress: MultiAgentProgress) {
  const driver = progress.nodes.find((n) => n.id === 'driver');
  const navigator = progress.nodes.find((n) => n.id === 'navigator');
  return {
    driverConversationId: driver?.conversationId || '',
    navigatorConversationId: navigator?.conversationId || '',
  };
}

/**
 * Start a new dual-session run (pair topology).
 */
export async function startDualSession(params: DualSessionStartParams): Promise<{
  runId: string;
  driverConversationId: string;
  navigatorConversationId: string;
}> {
  const runId = uuid();

  const driverBackend = (params.driverBackend as any) || PAIR_DEFAULTS.driverBackend;
  const navigatorBackend = (params.navigatorBackend as any) || PAIR_DEFAULTS.navigatorBackend;
  const maxTurns = params.maxTurns ?? PAIR_DEFAULTS.maxTurns;
  const yoloMode = params.yoloMode ?? PAIR_DEFAULTS.yoloMode;

  const topology = createPairTopology(driverBackend, navigatorBackend, {
    driverContext: params.driverContext,
    navigatorContext: params.navigatorContext,
    driverCliPath: params.driverCliPath,
    navigatorCliPath: params.navigatorCliPath,
  });

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
      completionPattern: PAIR_COMPLETION_SIGNAL,
    },
    (progress) => {
      ipcBridge.dualSession.statusUpdate.emit({ runId, progress });
    }
  );

  const resultPromise = session.run().then((result) => {
    activeRuns.delete(runId);
    ipcBridge.dualSession.completed.emit({ runId, result });
    console.log(`[DualSessionService] Run ${runId} completed: status=${result.status}, turns=${result.totalTurns}, completed=${result.taskCompleted}`);
    return result;
  });

  activeRuns.set(runId, { id: runId, session, resultPromise });

  const progress = session.progress;
  const ids = getNodeConversationIds(progress);
  console.log(`[DualSessionService] Started run ${runId}`);

  return { runId, ...ids };
}

export function stopDualSession(runId: string): boolean {
  const run = activeRuns.get(runId);
  if (!run) return false;
  run.session.stop();
  activeRuns.delete(runId);
  return true;
}

export function getDualSessionProgress(runId: string): MultiAgentProgress | null {
  const run = activeRuns.get(runId);
  if (!run) return null;
  return run.session.progress;
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
    const p = run.session.progress;
    const ids = getNodeConversationIds(p);
    return {
      runId: run.id,
      status: p.status,
      currentTurn: p.currentTurn,
      maxTurns: p.maxTurns,
      ...ids,
    };
  });
}

export async function waitForDualSession(runId: string): Promise<MultiAgentResult | null> {
  const run = activeRuns.get(runId);
  if (!run) return null;
  return run.resultPromise;
}
