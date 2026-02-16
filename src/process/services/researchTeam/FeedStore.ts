/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDatabase } from '@process/database';
import type { FeedEntry, FeedEntryKind } from './types';

/**
 * Database row for the research_feed table
 */
type FeedRow = {
  id: string;
  session_id: string;
  kind: string;
  type: string;
  source_agent_id: string | null;
  target_agent_id: string | null;
  data: string | null;
  summary: string | null;
  timestamp: number;
};

function feedEntryToRow(entry: FeedEntry): FeedRow {
  return {
    id: entry.id,
    session_id: entry.sessionId,
    kind: entry.kind,
    type: entry.type,
    source_agent_id: entry.sourceAgentId,
    target_agent_id: entry.targetAgentId ?? null,
    data: entry.data != null ? JSON.stringify(entry.data) : null,
    summary: entry.summary ?? null,
    timestamp: entry.timestamp,
  };
}

function rowToFeedEntry(row: FeedRow): FeedEntry {
  let data: unknown;
  if (row.data) {
    try {
      data = JSON.parse(row.data);
    } catch {
      data = row.data;
    }
  }

  return {
    id: row.id,
    sessionId: row.session_id,
    kind: row.kind as FeedEntryKind,
    type: row.type as FeedEntry['type'],
    sourceAgentId: row.source_agent_id,
    targetAgentId: row.target_agent_id,
    data,
    summary: row.summary ?? undefined,
    timestamp: row.timestamp,
  };
}

/**
 * FeedStore — Persistence layer for research team feed entries.
 *
 * Stores the chronological feed of all events and commands
 * produced during research sessions.
 */
class FeedStore {
  private getDb() {
    const db = getDatabase();
    // @ts-expect-error - db is private but we need direct access
    return db.db;
  }

  /** Insert a feed entry */
  insert(entry: FeedEntry): void {
    const row = feedEntryToRow(entry);
    this.getDb()
      .prepare(
        `INSERT INTO research_feed (
          id, session_id, kind, type, source_agent_id,
          target_agent_id, data, summary, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(row.id, row.session_id, row.kind, row.type, row.source_agent_id, row.target_agent_id, row.data, row.summary, row.timestamp);
  }

  /** Insert multiple entries in a transaction */
  insertBatch(entries: FeedEntry[]): void {
    const db = this.getDb();
    const stmt = db.prepare(
      `INSERT INTO research_feed (
        id, session_id, kind, type, source_agent_id,
        target_agent_id, data, summary, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const insertAll = db.transaction((items: FeedEntry[]) => {
      for (const entry of items) {
        const row = feedEntryToRow(entry);
        stmt.run(row.id, row.session_id, row.kind, row.type, row.source_agent_id, row.target_agent_id, row.data, row.summary, row.timestamp);
      }
    });

    insertAll(entries);
  }

  /** Get all feed entries for a session, ordered by time */
  listBySession(sessionId: string): FeedEntry[] {
    const rows = this.getDb().prepare('SELECT * FROM research_feed WHERE session_id = ? ORDER BY timestamp ASC').all(sessionId) as FeedRow[];
    return rows.map(rowToFeedEntry);
  }

  /** Query feed entries with filters */
  query(
    sessionId: string,
    filters?: {
      kind?: FeedEntryKind;
      agentId?: string;
      limit?: number;
      offset?: number;
    }
  ): FeedEntry[] {
    let sql = 'SELECT * FROM research_feed WHERE session_id = ?';
    const params: unknown[] = [sessionId];

    if (filters?.kind) {
      sql += ' AND kind = ?';
      params.push(filters.kind);
    }

    if (filters?.agentId) {
      sql += ' AND (source_agent_id = ? OR target_agent_id = ?)';
      params.push(filters.agentId, filters.agentId);
    }

    sql += ' ORDER BY timestamp ASC';

    if (filters?.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters?.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }

    const rows = this.getDb()
      .prepare(sql)
      .all(...params) as FeedRow[];
    return rows.map(rowToFeedEntry);
  }

  /** Get feed entry count for a session */
  count(sessionId: string): number {
    const result = this.getDb().prepare('SELECT COUNT(*) as count FROM research_feed WHERE session_id = ?').get(sessionId) as { count: number };
    return result.count;
  }

  /** Delete all feed entries for a session */
  deleteBySession(sessionId: string): number {
    const result = this.getDb().prepare('DELETE FROM research_feed WHERE session_id = ?').run(sessionId);
    return result.changes;
  }
}

/** Singleton instance */
export const feedStore = new FeedStore();
