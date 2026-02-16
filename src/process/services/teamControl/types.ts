/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Team Control Types
 *
 * Manager-Worker agent team that allows autonomous collaboration.
 * The manager delegates tasks, workers execute, and the manager validates.
 */

import type { AcpBackend } from '@/types/acpTypes';
import type { Mission } from '@process/services/missionControl/types';

// ── Agent roles ──

export type AgentRole = 'manager' | 'worker';

/** Runtime state of a team agent */
export type TeamAgent = {
  id: string;
  role: AgentRole;
  /** Which ACP backend this agent uses (claude, gemini, etc.) */
  backend: AcpBackend;
  status: 'idle' | 'starting' | 'running' | 'finished' | 'error';
  /** Mission currently assigned to this agent */
  currentMissionId?: string;
  /** Accumulated text output from the agent */
  output: string;
  /** Error message if status is 'error' */
  error?: string;
};

// ── Session ──

export type TeamSessionStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

/** Full state of a team session */
export type TeamSession = {
  id: string;
  conversationId: string;
  /** User's original task description */
  objective: string;
  status: TeamSessionStatus;
  agents: TeamAgent[];
  /** Backend used for all agents (v1: same backend for everyone) */
  backend: AcpBackend;
  /** Working directory for agents */
  workingDir: string;
  createdAt: number;
  updatedAt: number;
  /** How many validate→rework cycles have happened */
  iterationCount: number;
  /** Max iterations before force-completing */
  maxIterations: number;
};

// ── Configuration ──

export type TeamConfig = {
  conversationId: string;
  /** The task/objective for the team */
  objective: string;
  /** Which ACP backend to use */
  backend: AcpBackend;
  /** Working directory */
  workingDir: string;
  /** CLI path for the backend (optional) */
  cliPath?: string;
  /** Max manager↔worker iterations (default: 3) */
  maxIterations?: number;
};

// ── Events ──

export type TeamEventType =
  | 'session_started'
  | 'session_completed'
  | 'session_error'
  | 'agent_started'
  | 'agent_output'
  | 'agent_finished'
  | 'agent_error'
  | 'task_created'
  | 'task_assigned'
  | 'task_completed'
  | 'task_rejected'
  | 'validation_started'
  | 'validation_passed'
  | 'validation_failed'
  | 'iteration_started';

export type TeamEvent = {
  type: TeamEventType;
  sessionId: string;
  timestamp: number;
  agentId?: string;
  missionId?: string;
  data?: unknown;
};

// ── Agent result ──

/** Result collected from an agent after it finishes a prompt */
export type AgentRunResult = {
  output: string;
  status: 'completed' | 'error';
  error?: string;
};
