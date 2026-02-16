/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Research Team Types
 *
 * Independent agents that run in the background and communicate
 * through events (broadcasts) and commands (directed messages).
 * All activity flows into a unified feed for observability.
 */

import type { AcpBackend } from '@/types/acpTypes';

// ── Agent ──

export type ResearchAgentRole = 'researcher' | 'analyst' | 'reviewer' | 'custom';

export type ResearchAgentStatus = 'idle' | 'starting' | 'running' | 'paused' | 'finished' | 'error';

export type ResearchAgentConfig = {
  /** Unique agent ID (auto-generated if omitted) */
  id?: string;
  /** Human-readable name for this agent */
  name: string;
  /** Role that determines default prompts/behavior */
  role: ResearchAgentRole;
  /** Which ACP backend this agent uses */
  backend: AcpBackend;
  /** Initial objective/instructions for this agent */
  objective: string;
  /** CLI path for the backend (optional) */
  cliPath?: string;
};

export type ResearchAgent = {
  id: string;
  name: string;
  role: ResearchAgentRole;
  backend: AcpBackend;
  status: ResearchAgentStatus;
  objective: string;
  /** Accumulated text output */
  output: string;
  /** Error message if status is 'error' */
  error?: string;
  startedAt?: number;
  finishedAt?: number;
};

// ── Session ──

export type ResearchSessionStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

export type ResearchSessionConfig = {
  conversationId: string;
  /** Overall research objective */
  objective: string;
  /** Working directory for all agents */
  workingDir: string;
  /** Agents to spawn */
  agents: ResearchAgentConfig[];
};

export type ResearchSession = {
  id: string;
  conversationId: string;
  objective: string;
  status: ResearchSessionStatus;
  agents: ResearchAgent[];
  workingDir: string;
  createdAt: number;
  updatedAt: number;
};

// ── Events & Commands ──

/**
 * Events are broadcasts — any agent or the system can emit them,
 * and all subscribers receive them.
 */
export type ResearchEventType =
  // Session lifecycle
  | 'session_started'
  | 'session_completed'
  | 'session_error'
  // Agent lifecycle
  | 'agent_started'
  | 'agent_output'
  | 'agent_finished'
  | 'agent_error'
  | 'agent_paused'
  | 'agent_resumed'
  // Agent findings
  | 'finding_reported'
  | 'progress_updated';

/**
 * Commands are directed messages — sent from one agent (or the user)
 * to a specific agent or broadcast to all.
 */
export type ResearchCommandType = 'send_message' | 'assign_task' | 'request_review' | 'share_context' | 'pause' | 'resume' | 'stop';

export type FeedEntryKind = 'event' | 'command';

/** A single entry in the unified feed */
export type FeedEntry = {
  id: string;
  sessionId: string;
  kind: FeedEntryKind;
  /** Event type or command type */
  type: ResearchEventType | ResearchCommandType;
  /** Agent that produced this entry (null = system) */
  sourceAgentId: string | null;
  /** For commands: the target agent (null = broadcast) */
  targetAgentId?: string | null;
  /** Payload data */
  data?: unknown;
  /** Human-readable summary */
  summary?: string;
  timestamp: number;
};

/** Event published on the research event bus */
export type ResearchEvent = {
  type: ResearchEventType;
  sessionId: string;
  agentId?: string;
  timestamp: number;
  data?: unknown;
  summary?: string;
};

/** Command sent between agents */
export type ResearchCommand = {
  type: ResearchCommandType;
  sessionId: string;
  sourceAgentId: string | null;
  targetAgentId: string | null;
  timestamp: number;
  data?: unknown;
  summary?: string;
};
