/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Topology Factories — Convenience functions for common multi-agent setups.
 *
 * Usage:
 *   const topology = createPairTopology('claude', 'claude');
 *   const orchestrator = new MultiAgentOrchestrator(factory, { task, workspace, topology });
 */

import type { AcpBackend } from '@/types/acpTypes';
import type { AgentNodeConfig, TopologyConfig } from './types';

/**
 * Pair topology: Driver ↔ Navigator (the classic dual-session).
 */
export function createPairTopology(driverBackend: AcpBackend, navigatorBackend: AcpBackend, options?: { driverContext?: string; navigatorContext?: string; driverCliPath?: string; navigatorCliPath?: string }): TopologyConfig {
  return {
    type: 'pair',
    nodes: [
      {
        id: 'driver',
        label: 'Driver',
        role: 'driver',
        backend: driverBackend,
        cliPath: options?.driverCliPath,
        systemContext: options?.driverContext,
      },
      {
        id: 'navigator',
        label: 'Navigator',
        role: 'navigator',
        backend: navigatorBackend,
        cliPath: options?.navigatorCliPath,
        systemContext: options?.navigatorContext,
      },
    ],
  };
}

/**
 * Pipeline topology: Planner → Coder → Reviewer → Planner (circular).
 *
 * Classic code review loop:
 *   Planner decides what to build
 *   Coder implements
 *   Reviewer checks and sends feedback back to Planner
 */
export function createReviewPipelineTopology(plannerBackend: AcpBackend, coderBackend: AcpBackend, reviewerBackend: AcpBackend): TopologyConfig {
  return {
    type: 'pipeline',
    pipelineOrder: ['planner', 'coder', 'reviewer'],
    nodes: [
      { id: 'planner', label: 'Planner', role: 'planner', backend: plannerBackend },
      { id: 'coder', label: 'Coder', role: 'coder', backend: coderBackend },
      { id: 'reviewer', label: 'Reviewer', role: 'reviewer', backend: reviewerBackend },
    ],
  };
}

/**
 * Star topology: Coordinator (hub) ↔ Workers (spokes).
 *
 * The coordinator distributes work and collects results.
 * Workers report back to the coordinator.
 */
export function createStarTopology(hubBackend: AcpBackend, workerBackends: AcpBackend[], options?: { workerLabels?: string[] }): TopologyConfig {
  const workers: AgentNodeConfig[] = workerBackends.map((backend, i) => ({
    id: `worker-${i + 1}`,
    label: options?.workerLabels?.[i] || `Worker ${i + 1}`,
    role: 'executor' as const,
    backend,
  }));

  return {
    type: 'star',
    hubNodeId: 'coordinator',
    nodes: [{ id: 'coordinator', label: 'Coordinator', role: 'planner', backend: hubBackend }, ...workers],
  };
}

/**
 * Debate topology: Two agents argue, a judge decides.
 * Implemented as star with judge as hub.
 */
export function createDebateTopology(agentABackend: AcpBackend, agentBBackend: AcpBackend, judgeBackend: AcpBackend): TopologyConfig {
  return {
    type: 'star',
    hubNodeId: 'judge',
    nodes: [
      { id: 'judge', label: 'Judge', role: 'judge', backend: judgeBackend },
      { id: 'agent-a', label: 'Agent A', role: 'custom', backend: agentABackend },
      { id: 'agent-b', label: 'Agent B', role: 'custom', backend: agentBBackend },
    ],
  };
}

/**
 * Custom topology from an explicit node + edge definition.
 */
export function createCustomTopology(nodes: AgentNodeConfig[], edges: Array<{ from: string; to: string }>): TopologyConfig {
  return {
    type: 'custom',
    nodes,
    edges,
  };
}
