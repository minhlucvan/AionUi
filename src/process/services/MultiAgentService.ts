/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * MultiAgentService
 *
 * Service layer for the generic multi-agent orchestration system.
 * Supports any topology: pair, pipeline, star, mesh, or custom.
 */

import { ipcBridge } from '@/common';
import { uuid } from '@/common/utils';
import type { TProviderWithModel } from '@/common/storage';
import type { AgentNodeConfig, AgentRole, MultiAgentProgress, MultiAgentResult, TopologyConfig, TopologyType } from '@/agent/multi-agent';
import { MULTI_AGENT_DEFAULTS } from '@/agent/multi-agent';
import { MultiAgentSession } from '@/agent/multi-agent/MultiAgentSession';
import type { CreateSessionFn } from '@/agent/multi-agent/MultiAgentSession';
import type AcpAgentManager from '@/process/task/AcpAgentManager';
import { ConversationService } from './conversationService';
import WorkerManage from '../WorkerManage';

/**
 * Parameters to start a multi-agent run.
 */
export type MultiAgentStartParams = {
  task: string;
  workspace: string;
  topologyType: TopologyType;
  nodes: Array<{
    id: string;
    label?: string;
    role: AgentRole;
    backend: string;
    cliPath?: string;
    customAgentId?: string;
    systemContext?: string;
    enabledSkills?: string[];
    nodeHooksPath?: string;
  }>;
  edges?: Array<{ from: string; to: string }>;
  hubNodeId?: string;
  pipelineOrder?: string[];
  model?: TProviderWithModel;
  maxTurns?: number;
  yoloMode?: boolean;
};

type ActiveRun = {
  id: string;
  session: MultiAgentSession;
  resultPromise: Promise<MultiAgentResult>;
};

const activeRuns = new Map<string, ActiveRun>();

function createNodeSessionFactory(model?: TProviderWithModel): CreateSessionFn {
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
      throw new Error(`Failed to create node session: ${result.error}`);
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
 * Start a multi-agent run with any topology.
 */
export async function startMultiAgentRun(params: MultiAgentStartParams): Promise<{
  runId: string;
  nodes: Array<{ id: string; role: AgentRole; conversationId: string }>;
}> {
  const runId = uuid();

  // Build topology config from params
  const topology: TopologyConfig = {
    type: params.topologyType,
    nodes: params.nodes.map(
      (n): AgentNodeConfig => ({
        id: n.id,
        label: n.label,
        role: n.role,
        backend: n.backend as any,
        cliPath: n.cliPath,
        customAgentId: n.customAgentId,
        systemContext: n.systemContext,
        enabledSkills: n.enabledSkills,
        nodeHooksPath: n.nodeHooksPath,
      })
    ),
    edges: params.edges,
    hubNodeId: params.hubNodeId,
    pipelineOrder: params.pipelineOrder,
  };

  const sessionFactory = createNodeSessionFactory(params.model);

  const session = new MultiAgentSession(
    sessionFactory,
    {
      task: params.task,
      workspace: params.workspace,
      topology,
      maxTurns: params.maxTurns ?? MULTI_AGENT_DEFAULTS.maxTurns,
      yoloMode: params.yoloMode ?? MULTI_AGENT_DEFAULTS.yoloMode,
    },
    (progress: MultiAgentProgress) => {
      ipcBridge.multiAgent.statusUpdate.emit({ runId, progress });
    }
  );

  const resultPromise = session.run().then((result) => {
    activeRuns.delete(runId);
    ipcBridge.multiAgent.completed.emit({ runId, result });
    console.log(`[MultiAgentService] Run ${runId} completed: status=${result.status}, turns=${result.totalTurns}`);
    return result;
  });

  activeRuns.set(runId, { id: runId, session, resultPromise });

  // Wait briefly for sessions to start
  const progress = session.progress;
  console.log(`[MultiAgentService] Started run ${runId} with ${params.topologyType} topology (${params.nodes.length} nodes)`);

  return {
    runId,
    nodes: progress.nodes,
  };
}

export function stopMultiAgentRun(runId: string): boolean {
  const run = activeRuns.get(runId);
  if (!run) return false;
  run.session.stop();
  activeRuns.delete(runId);
  return true;
}

export function getMultiAgentProgress(runId: string): MultiAgentProgress | null {
  const run = activeRuns.get(runId);
  if (!run) return null;
  return run.session.progress;
}

export function listMultiAgentRuns(): Array<{
  runId: string;
  status: string;
  topology: string;
  currentTurn: number;
  maxTurns: number;
  nodeCount: number;
}> {
  return Array.from(activeRuns.values()).map((run) => {
    const p = run.session.progress;
    return {
      runId: run.id,
      status: p.status,
      topology: p.topology,
      currentTurn: p.currentTurn,
      maxTurns: p.maxTurns,
      nodeCount: p.nodes.length,
    };
  });
}

export async function waitForMultiAgentRun(runId: string): Promise<MultiAgentResult | null> {
  const run = activeRuns.get(runId);
  if (!run) return null;
  return run.resultPromise;
}
