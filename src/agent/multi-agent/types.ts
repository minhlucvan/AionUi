/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Multi-Agent System Types
 *
 * Generic primitives for event-driven multi-agent orchestration.
 * Agents communicate through a shared message bus, wired together
 * by topology definitions — like microservices but for AI agents.
 *
 * Supported topologies:
 *   pair     -  A ↔ B  (dual-session)
 *   pipeline -  A → B → C → ...  (sequential handoff)
 *   star     -  Hub ↔ {A, B, C}  (coordinator pattern)
 *   mesh     -  All ↔ All  (fully connected, broadcast)
 */

import type { AcpBackend } from '@/types/acpTypes';
import type { TProviderWithModel } from '@/common/storage';

// ─── Bus Events ───────────────────────────────────────────────

/**
 * Every message on the bus carries this envelope.
 */
export type BusMessage = {
  /** Unique message ID */
  id: string;
  /** Node that produced this message */
  from: string;
  /** Target node(s).  '*' = broadcast, undefined = determined by topology */
  to?: string | string[];
  /** The payload text content */
  content: string;
  /** Optional structured metadata */
  meta?: Record<string, unknown>;
  /** Timestamp */
  timestamp: number;
};

/**
 * Events emitted on the AgentBus.
 */
export type BusEventType =
  /** An agent finished its turn and published output */
  | 'agent:response'
  /** An agent encountered an error */
  | 'agent:error'
  /** A message was routed/delivered to an agent */
  | 'agent:delivered'
  /** The orchestrator detected completion */
  | 'bus:complete'
  /** Orchestrator-level status change */
  | 'bus:status';

export type BusEvent = {
  type: BusEventType;
  message?: BusMessage;
  nodeId?: string;
  error?: string;
  meta?: Record<string, unknown>;
};

// ─── Node Configuration ───────────────────────────────────────

/**
 * Role hint for display purposes (not enforced by the bus).
 */
export type AgentRole = 'driver' | 'navigator' | 'reviewer' | 'coder' | 'planner' | 'executor' | 'judge' | 'custom';

/**
 * Configuration for a single agent node on the bus.
 */
export type AgentNodeConfig = {
  /** Unique node identifier (e.g. 'driver', 'coder-1', 'reviewer') */
  id: string;
  /** Human-friendly label */
  label?: string;
  /** Semantic role */
  role: AgentRole;
  /** ACP backend to use */
  backend: AcpBackend;
  /** Optional CLI path override */
  cliPath?: string;
  /** Custom agent ID (when backend is 'custom') */
  customAgentId?: string;
  /** System context / preset rules injected into the agent */
  systemContext?: string;
  /** Skills to enable */
  enabledSkills?: string[];
  /** Assistant hooks path */
  assistantHooksPath?: string;
};

// ─── Topology ─────────────────────────────────────────────────

/**
 * Built-in topology types.
 */
export type TopologyType = 'pair' | 'pipeline' | 'star' | 'mesh' | 'custom';

/**
 * A routing edge: when `from` finishes, deliver to `to`.
 */
export type RoutingEdge = {
  from: string;
  to: string;
};

/**
 * Topology definition: nodes + how they are wired.
 */
export type TopologyConfig = {
  type: TopologyType;
  /** All agent nodes */
  nodes: AgentNodeConfig[];
  /** Explicit routing edges (for 'custom' topologies or overrides) */
  edges?: RoutingEdge[];
  /** For 'star' topology: which node is the hub */
  hubNodeId?: string;
  /** For 'pipeline' topology: ordered node IDs */
  pipelineOrder?: string[];
};

// ─── Orchestrator Configuration ───────────────────────────────

/**
 * Configuration for a multi-agent run.
 */
export type MultiAgentConfig = {
  /** The task/goal to accomplish */
  task: string;
  /** Shared workspace directory */
  workspace: string;
  /** Topology wiring */
  topology: TopologyConfig;
  /** Model configuration (shared unless overridden per node) */
  model?: TProviderWithModel;
  /** Maximum total relay turns across all agents */
  maxTurns: number;
  /** Auto-approve tool calls */
  yoloMode: boolean;
  /** Custom completion detector (content -> boolean) */
  completionPattern?: string;
};

/**
 * Default orchestrator settings.
 */
export const MULTI_AGENT_DEFAULTS = {
  maxTurns: 30,
  yoloMode: true,
} as const;

/**
 * Completion signal that any agent can output.
 */
export const MULTI_AGENT_COMPLETION_SIGNAL = '<multi-agent>DONE</multi-agent>';

// ─── Run Status & Progress ────────────────────────────────────

export type MultiAgentStatus = 'idle' | 'starting' | 'running' | 'completed' | 'failed' | 'stopped' | 'max_turns_reached';

export type MultiAgentTurn = {
  turn: number;
  from: string;
  to: string;
  content: string;
  timestamp: number;
};

export type MultiAgentProgress = {
  runId: string;
  currentTurn: number;
  maxTurns: number;
  status: MultiAgentStatus;
  topology: TopologyType;
  nodes: Array<{ id: string; role: AgentRole; conversationId: string }>;
  turns: MultiAgentTurn[];
  startedAt: number;
  endedAt?: number;
};

export type MultiAgentResult = {
  status: MultiAgentStatus;
  totalTurns: number;
  taskCompleted: boolean;
  turns: MultiAgentTurn[];
  duration: number;
  nodes: Array<{ id: string; role: AgentRole; conversationId: string }>;
  finalOutput: string;
  /** Path to the JSONL debug log for this run */
  logFile?: string;
  /** Path to the file-based relay directory for this run */
  relayDir?: string;
};
