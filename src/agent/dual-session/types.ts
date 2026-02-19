/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Dual Session Types
 *
 * Implements the autonomous dual-session pattern where two AI agent sessions
 * communicate with each other through hooks until the task is complete.
 *
 * Inspired by the anthropic/claude-quickstarts autonomous-coding pattern,
 * adapted for bidirectional session communication.
 */

import type { AcpBackend } from '@/types/acpTypes';

/**
 * Role assigned to each session in the dual-session pair.
 *
 * - driver: Plans, reviews, gives instructions. Acts as the "outer loop" thinker.
 * - navigator: Implements, executes, reports back. Acts as the "inner loop" doer.
 */
export type DualSessionRole = 'driver' | 'navigator';

/**
 * Status of the overall dual-session run.
 */
export type DualSessionStatus = 'idle' | 'starting' | 'running' | 'completed' | 'failed' | 'stopped' | 'max_turns_reached';

/**
 * Configuration for a dual-session run.
 */
export type DualSessionConfig = {
  /** The task/goal to accomplish */
  task: string;

  /** Working directory / workspace path */
  workspace: string;

  /** ACP backend for the driver session (e.g. 'claude', 'qwen') */
  driverBackend: AcpBackend;

  /** ACP backend for the navigator session */
  navigatorBackend: AcpBackend;

  /** Custom CLI path for the driver (optional) */
  driverCliPath?: string;

  /** Custom CLI path for the navigator (optional) */
  navigatorCliPath?: string;

  /** Maximum number of relay turns (A→B counts as 1, B→A counts as 1) */
  maxTurns: number;

  /** Whether to auto-approve all tool calls in both sessions */
  yoloMode: boolean;

  /** Custom system context for the driver */
  driverContext?: string;

  /** Custom system context for the navigator */
  navigatorContext?: string;

  /** Skills enabled for the driver */
  driverSkills?: string[];

  /** Skills enabled for the navigator */
  navigatorSkills?: string[];

  /** Assistant hooks path for both sessions */
  assistantHooksPath?: string;

  /** Custom agent ID for driver (when backend is 'custom') */
  driverCustomAgentId?: string;

  /** Custom agent ID for navigator (when backend is 'custom') */
  navigatorCustomAgentId?: string;
};

/**
 * Default configuration values.
 */
export const DUAL_SESSION_DEFAULTS: Omit<DualSessionConfig, 'task' | 'workspace'> = {
  driverBackend: 'claude',
  navigatorBackend: 'claude',
  maxTurns: 20,
  yoloMode: true,
};

/**
 * Signal that either session outputs to indicate the task is complete.
 */
export const DUAL_SESSION_COMPLETION_SIGNAL = '<dual-session>DONE</dual-session>';

/**
 * Signal prefix for the driver to send instructions to the navigator.
 */
export const DUAL_SESSION_INSTRUCTION_PREFIX = '[INSTRUCTION]';

/**
 * Signal prefix for the navigator to report results back to the driver.
 */
export const DUAL_SESSION_REPORT_PREFIX = '[REPORT]';

/**
 * A single turn in the dual-session relay.
 */
export type DualSessionTurn = {
  /** Turn number (1-based) */
  turn: number;

  /** Which session produced this output */
  from: DualSessionRole;

  /** Which session will receive this as input */
  to: DualSessionRole;

  /** The content being relayed */
  content: string;

  /** Timestamp of the relay */
  timestamp: number;
};

/**
 * Progress summary of a dual-session run.
 */
export type DualSessionProgress = {
  /** Current turn number */
  currentTurn: number;

  /** Maximum turns allowed */
  maxTurns: number;

  /** Current status */
  status: DualSessionStatus;

  /** Driver session conversation ID */
  driverConversationId: string;

  /** Navigator session conversation ID */
  navigatorConversationId: string;

  /** History of all relay turns */
  turns: DualSessionTurn[];

  /** Timestamp when the run started */
  startedAt: number;

  /** Timestamp when the run ended (if finished) */
  endedAt?: number;
};

/**
 * Result of a completed dual-session run.
 */
export type DualSessionResult = {
  /** Final status */
  status: DualSessionStatus;

  /** Total turns taken */
  totalTurns: number;

  /** Whether the task was completed (completion signal detected) */
  taskCompleted: boolean;

  /** All relay turns */
  turns: DualSessionTurn[];

  /** Duration in milliseconds */
  duration: number;

  /** Driver conversation ID */
  driverConversationId: string;

  /** Navigator conversation ID */
  navigatorConversationId: string;

  /** Final output (last response content) */
  finalOutput: string;
};

/**
 * Callback for status updates during a dual-session run.
 */
export type DualSessionStatusCallback = (progress: DualSessionProgress) => void;

/**
 * Event emitted through the IPC bridge for dual-session updates.
 */
export type DualSessionEvent = {
  type: 'status' | 'turn' | 'completed' | 'error';
  sessionId: string;
  data: DualSessionProgress | DualSessionTurn | DualSessionResult | string;
};
