/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Sprint Team Types
 *
 * Planner-Worker-Judge pattern with a structured sprint loop.
 *
 * Flow:
 * 1. Planner decomposes the objective into sprint tasks
 * 2. Workers execute tasks from the sprint backlog (concurrently)
 * 3. Judge reviews completed work and provides a verdict
 * 4. If rejected → Planner re-plans with feedback
 * 5. Repeat until approved or max sprints reached
 */

import type { AcpBackend } from '@/types/acpTypes';

// ── Agent roles ──

export type SprintAgentRole = 'planner' | 'worker' | 'judge';

/** Runtime state of a sprint agent */
export type SprintAgent = {
  id: string;
  role: SprintAgentRole;
  /** Which ACP backend this agent uses */
  backend: AcpBackend;
  status: 'idle' | 'starting' | 'running' | 'finished' | 'error';
  /** Current task description */
  currentTask?: string;
  /** Accumulated text output from the agent */
  output: string;
  /** Error message if status is 'error' */
  error?: string;
  startedAt?: number;
  finishedAt?: number;
};

// ── Sprint task ──

export type SprintTaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked' | 'rejected';

export type SprintTaskPriority = 'critical' | 'high' | 'medium' | 'low';

/** A single task in the sprint backlog */
export type SprintTask = {
  id: string;
  /** Short task title */
  title: string;
  /** Detailed description of what to do */
  description: string;
  /** Current status */
  status: SprintTaskStatus;
  /** Priority level */
  priority: SprintTaskPriority;
  /** Assigned worker agent ID */
  assigneeId?: string;
  /** IDs of tasks this depends on (must be 'done' before starting) */
  dependencies: string[];
  /** Worker output/result after execution */
  result?: string;
  /** Judge feedback if rejected */
  feedback?: string;
  /** Which sprint this belongs to */
  sprintNumber: number;
  /** Timestamps */
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
};

/** The full sprint plan produced by the Planner */
export type SprintPlan = {
  /** Sprint number (1-based) */
  sprintNumber: number;
  /** High-level summary of the sprint goal */
  goal: string;
  /** Tasks to execute in this sprint */
  tasks: SprintTask[];
  /** Planner's analysis / reasoning */
  reasoning: string;
  /** Created timestamp */
  createdAt: number;
};

// ── Session ──

export type SprintSessionStatus = 'idle' | 'planning' | 'executing' | 'judging' | 'replanning' | 'completed' | 'error';

/** Full state of a sprint session */
export type SprintSession = {
  id: string;
  conversationId: string;
  /** User's original objective */
  objective: string;
  status: SprintSessionStatus;
  agents: SprintAgent[];
  /** Backend used for agents */
  backend: AcpBackend;
  /** Working directory for agents */
  workingDir: string;
  /** All sprint plans (history) */
  plans: SprintPlan[];
  /** Current sprint number */
  currentSprint: number;
  /** Max sprints before force-completing */
  maxSprints: number;
  /** Max concurrent workers per sprint */
  maxWorkers: number;
  /** Timestamps */
  createdAt: number;
  updatedAt: number;
};

// ── Configuration ──

export type SprintConfig = {
  conversationId: string;
  /** The objective for the sprint team */
  objective: string;
  /** Which ACP backend to use */
  backend: AcpBackend;
  /** Working directory */
  workingDir: string;
  /** CLI path for the backend (optional) */
  cliPath?: string;
  /** Max sprints before force-completing (default: 5) */
  maxSprints?: number;
  /** Max concurrent workers per sprint (default: 3) */
  maxWorkers?: number;
};

// ── Events ──

export type SprintEventType =
  // Session lifecycle
  | 'session_started'
  | 'session_completed'
  | 'session_error'
  // Sprint lifecycle
  | 'sprint_started'
  | 'sprint_completed'
  // Planning phase
  | 'planning_started'
  | 'planning_completed'
  | 'replanning_started'
  // Execution phase
  | 'task_assigned'
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  // Judging phase
  | 'judging_started'
  | 'judging_completed'
  | 'judge_approved'
  | 'judge_rejected'
  // Agent lifecycle
  | 'agent_started'
  | 'agent_output'
  | 'agent_finished'
  | 'agent_error';

export type SprintEvent = {
  type: SprintEventType;
  sessionId: string;
  timestamp: number;
  agentId?: string;
  taskId?: string;
  sprintNumber?: number;
  data?: unknown;
};

// ── Agent results ──

/** Result collected from an agent after it finishes a prompt */
export type AgentRunResult = {
  output: string;
  status: 'completed' | 'error';
  error?: string;
};

/** Verdict from the Judge agent */
export type JudgeVerdict = {
  approved: boolean;
  /** Overall quality assessment */
  summary: string;
  /** Per-task feedback (taskId → feedback) */
  taskFeedback: Record<string, { approved: boolean; feedback: string }>;
  /** Suggestions for the next sprint (if rejected) */
  suggestions?: string;
};
