/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Mission Control Types
 *
 * Types for the persistent mission tracking system.
 * Missions are synced from Claude Code's native task files
 * (~/.claude/tasks/) into SQLite for enrichment and history.
 */

/** Mission lifecycle states */
export type MissionState = 'pending' | 'in_progress' | 'completed' | 'blocked';

/** A state transition record for audit trail */
export type StateTransition = {
  from: MissionState;
  to: MissionState;
  at: number;
  triggeredBy?: string;
};

/** A persistent mission synced from Claude task files */
export type Mission = {
  /** Internal primary key (uuid) */
  id: string;
  /** Original task id from Claude file */
  externalId: string;
  /** Conversation that owns this mission */
  conversationId: string;
  /** Team name from ~/.claude/tasks/{teamName}/ */
  teamName: string;
  /** Task title */
  subject: string;
  /** Optional description */
  description?: string;
  /** Current lifecycle state */
  state: MissionState;
  /** Assigned agent name */
  assignee?: string;
  /** IDs of missions this depends on */
  dependencies?: string[];
  /** First-seen timestamp */
  createdAt: number;
  /** Last state change timestamp */
  updatedAt: number;
  /** When moved to in_progress */
  startedAt?: number;
  /** When moved to completed */
  completedAt?: number;
  /** Full audit trail of state changes */
  stateHistory: StateTransition[];
  /** Who created this mission */
  source: 'claude_file' | 'user';
};

/** Events emitted by MissionSyncService */
export type MissionControlEvent = { type: 'missions_synced'; data: { teamName: string; missions: Mission[] } } | { type: 'mission_updated'; data: Mission };
