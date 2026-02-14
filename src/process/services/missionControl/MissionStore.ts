/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Mission, MissionState, StateTransition } from './types';
import { getDatabase } from '@process/database';

/**
 * Database row structure for missions table
 */
export interface MissionRow {
  id: string;
  external_id: string;
  conversation_id: string;
  team_name: string;
  subject: string;
  description: string | null;
  state: string;
  assignee: string | null;
  dependencies: string | null;
  source: string;
  state_history: string | null;
  created_at: number;
  updated_at: number;
  started_at: number | null;
  completed_at: number | null;
}

/** Convert a Mission to a database row */
export function missionToRow(mission: Mission): MissionRow {
  return {
    id: mission.id,
    external_id: mission.externalId,
    conversation_id: mission.conversationId,
    team_name: mission.teamName,
    subject: mission.subject,
    description: mission.description ?? null,
    state: mission.state,
    assignee: mission.assignee ?? null,
    dependencies: mission.dependencies ? JSON.stringify(mission.dependencies) : null,
    source: mission.source,
    state_history: mission.stateHistory.length > 0 ? JSON.stringify(mission.stateHistory) : null,
    created_at: mission.createdAt,
    updated_at: mission.updatedAt,
    started_at: mission.startedAt ?? null,
    completed_at: mission.completedAt ?? null,
  };
}

/** Convert a database row to a Mission */
export function rowToMission(row: MissionRow): Mission {
  let stateHistory: StateTransition[] = [];
  if (row.state_history) {
    try {
      stateHistory = JSON.parse(row.state_history);
    } catch {
      stateHistory = [];
    }
  }

  let dependencies: string[] | undefined;
  if (row.dependencies) {
    try {
      dependencies = JSON.parse(row.dependencies);
    } catch {
      dependencies = undefined;
    }
  }

  return {
    id: row.id,
    externalId: row.external_id,
    conversationId: row.conversation_id,
    teamName: row.team_name,
    subject: row.subject,
    description: row.description ?? undefined,
    state: row.state as MissionState,
    assignee: row.assignee ?? undefined,
    dependencies,
    source: row.source as 'claude_file' | 'user',
    stateHistory,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
  };
}

/**
 * MissionStore — Persistence layer for missions
 *
 * Follows the same pattern as CronStore.
 */
class MissionStore {
  private getDb() {
    const db = getDatabase();
    // @ts-expect-error - db is private but we need direct access
    return db.db;
  }

  /** Insert or update a mission (upsert by conversation_id + team_name + external_id) */
  upsert(mission: Mission): void {
    const row = missionToRow(mission);
    this.getDb()
      .prepare(
        `
      INSERT INTO missions (
        id, external_id, conversation_id, team_name,
        subject, description, state, assignee, dependencies,
        source, state_history, created_at, updated_at,
        started_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(conversation_id, team_name, external_id) DO UPDATE SET
        subject = excluded.subject,
        description = excluded.description,
        state = excluded.state,
        assignee = excluded.assignee,
        dependencies = excluded.dependencies,
        state_history = excluded.state_history,
        updated_at = excluded.updated_at,
        started_at = excluded.started_at,
        completed_at = excluded.completed_at
    `
      )
      .run(row.id, row.external_id, row.conversation_id, row.team_name, row.subject, row.description, row.state, row.assignee, row.dependencies, row.source, row.state_history, row.created_at, row.updated_at, row.started_at, row.completed_at);
  }

  /** Get a mission by internal ID */
  getById(id: string): Mission | null {
    const row = this.getDb().prepare('SELECT * FROM missions WHERE id = ?').get(id) as MissionRow | undefined;
    return row ? rowToMission(row) : null;
  }

  /** Find a mission by its external key (conversation + team + external_id) */
  getByExternalId(conversationId: string, teamName: string, externalId: string): Mission | null {
    const row = this.getDb().prepare('SELECT * FROM missions WHERE conversation_id = ? AND team_name = ? AND external_id = ?').get(conversationId, teamName, externalId) as MissionRow | undefined;
    return row ? rowToMission(row) : null;
  }

  /** List all missions for a conversation */
  listByConversation(conversationId: string): Mission[] {
    const rows = this.getDb().prepare('SELECT * FROM missions WHERE conversation_id = ? ORDER BY created_at ASC').all(conversationId) as MissionRow[];
    return rows.map(rowToMission);
  }

  /** List all missions for a team */
  listByTeam(conversationId: string, teamName: string): Mission[] {
    const rows = this.getDb().prepare('SELECT * FROM missions WHERE conversation_id = ? AND team_name = ? ORDER BY created_at ASC').all(conversationId, teamName) as MissionRow[];
    return rows.map(rowToMission);
  }

  /** Update a mission's state, appending to stateHistory and setting timestamps */
  updateState(id: string, newState: MissionState, triggeredBy?: string): Mission | null {
    const existing = this.getById(id);
    if (!existing) return null;
    if (existing.state === newState) return existing;

    const now = Date.now();
    const transition: StateTransition = {
      from: existing.state,
      to: newState,
      at: now,
      triggeredBy,
    };

    const updatedHistory = [...existing.stateHistory, transition];
    const updated: Mission = {
      ...existing,
      state: newState,
      updatedAt: now,
      stateHistory: updatedHistory,
      startedAt: newState === 'in_progress' && !existing.startedAt ? now : existing.startedAt,
      completedAt: newState === 'completed' ? now : existing.completedAt,
    };

    this.upsert(updated);
    return updated;
  }

  /** Delete all missions for a conversation */
  deleteByConversation(conversationId: string): number {
    const result = this.getDb().prepare('DELETE FROM missions WHERE conversation_id = ?').run(conversationId);
    return result.changes;
  }

  /** Delete all missions for a team */
  deleteByTeam(conversationId: string, teamName: string): number {
    const result = this.getDb().prepare('DELETE FROM missions WHERE conversation_id = ? AND team_name = ?').run(conversationId, teamName);
    return result.changes;
  }
}

/** Singleton instance */
export const missionStore = new MissionStore();
