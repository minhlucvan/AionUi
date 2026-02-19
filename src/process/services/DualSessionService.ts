/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DualSessionService
 *
 * Service layer that integrates the DualSessionOrchestrator with
 * AionUi's conversation and worker management systems.
 *
 * Provides methods to start, stop, and monitor dual-session runs.
 */

import { ipcBridge } from '@/common';
import { uuid } from '@/common/utils';
import type { TProviderWithModel } from '@/common/storage';
import type { DualSessionConfig, DualSessionProgress, DualSessionResult } from '@/agent/dual-session';
import { DualSessionOrchestrator, DUAL_SESSION_DEFAULTS } from '@/agent/dual-session';
import type { CreateSessionFn } from '@/agent/dual-session';
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
};

/**
 * Active dual-session run entry.
 */
type ActiveRun = {
  id: string;
  orchestrator: DualSessionOrchestrator;
  config: DualSessionConfig;
  resultPromise: Promise<DualSessionResult>;
};

/** Active dual-session runs, keyed by run ID */
const activeRuns = new Map<string, ActiveRun>();

/**
 * Create the session factory function that the orchestrator uses
 * to spawn ACP conversations.
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

    // Get the task manager (it was registered by ConversationService.createConversation)
    const task = WorkerManage.getTaskById(result.conversation.id);
    if (!task) {
      throw new Error(`Task manager not found for conversation ${result.conversation.id}`);
    }

    // Enable yoloMode if requested
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
 * Start a new dual-session run.
 *
 * @returns The run ID and the conversation IDs for both sessions.
 */
export async function startDualSession(params: DualSessionStartParams): Promise<{
  runId: string;
  driverConversationId: string;
  navigatorConversationId: string;
}> {
  const runId = uuid();

  const config: DualSessionConfig = {
    task: params.task,
    workspace: params.workspace,
    driverBackend: (params.driverBackend as any) || DUAL_SESSION_DEFAULTS.driverBackend,
    navigatorBackend: (params.navigatorBackend as any) || DUAL_SESSION_DEFAULTS.navigatorBackend,
    driverCliPath: params.driverCliPath,
    navigatorCliPath: params.navigatorCliPath,
    maxTurns: params.maxTurns ?? DUAL_SESSION_DEFAULTS.maxTurns,
    yoloMode: params.yoloMode ?? DUAL_SESSION_DEFAULTS.yoloMode,
    driverContext: params.driverContext,
    navigatorContext: params.navigatorContext,
    driverSkills: params.driverSkills,
    navigatorSkills: params.navigatorSkills,
    driverCustomAgentId: params.driverCustomAgentId,
    navigatorCustomAgentId: params.navigatorCustomAgentId,
  };

  const sessionFactory = createSessionFactory(params.model);

  const orchestrator = new DualSessionOrchestrator(sessionFactory, config, (progress: DualSessionProgress) => {
    // Emit progress events to the renderer via IPC
    ipcBridge.dualSession.statusUpdate.emit({
      runId,
      progress,
    });
  });

  // Start the run in the background (it resolves when done)
  const resultPromise = orchestrator.run().then((result) => {
    // Clean up when done
    activeRuns.delete(runId);

    // Emit completion event
    ipcBridge.dualSession.completed.emit({
      runId,
      result,
    });

    console.log(`[DualSessionService] Run ${runId} completed: status=${result.status}, turns=${result.totalTurns}, completed=${result.taskCompleted}`);

    return result;
  });

  activeRuns.set(runId, {
    id: runId,
    orchestrator,
    config,
    resultPromise,
  });

  // Wait for the orchestrator to create both sessions and return their IDs
  // We need to wait a bit for the sessions to be created
  const progress = orchestrator.progress;

  console.log(`[DualSessionService] Started run ${runId}`);

  return {
    runId,
    driverConversationId: progress.driverConversationId,
    navigatorConversationId: progress.navigatorConversationId,
  };
}

/**
 * Stop a running dual-session.
 */
export function stopDualSession(runId: string): boolean {
  const run = activeRuns.get(runId);
  if (!run) return false;

  run.orchestrator.stop();
  activeRuns.delete(runId);
  return true;
}

/**
 * Get the progress of a running dual-session.
 */
export function getDualSessionProgress(runId: string): DualSessionProgress | null {
  const run = activeRuns.get(runId);
  if (!run) return null;
  return run.orchestrator.progress;
}

/**
 * List all active dual-session runs.
 */
export function listDualSessions(): Array<{
  runId: string;
  status: string;
  currentTurn: number;
  maxTurns: number;
  driverConversationId: string;
  navigatorConversationId: string;
}> {
  return Array.from(activeRuns.values()).map((run) => {
    const progress = run.orchestrator.progress;
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

/**
 * Wait for a dual-session to complete and return the result.
 */
export async function waitForDualSession(runId: string): Promise<DualSessionResult | null> {
  const run = activeRuns.get(runId);
  if (!run) return null;
  return run.resultPromise;
}
