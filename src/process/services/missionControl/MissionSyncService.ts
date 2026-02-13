/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Mission, MissionControlEvent, MissionState } from '@/common/missionControl';
import type { TeamTask, TeamTaskState } from '@/common/teamMonitor';
import { missionStore } from './MissionStore';
import { randomUUID } from 'crypto';

type EventCallback = (event: MissionControlEvent) => void;

/** Map Claude's task state to Mission state */
function mapTaskState(taskState: TeamTaskState): MissionState {
  switch (taskState) {
    case 'pending':
      return 'pending';
    case 'in_progress':
      return 'in_progress';
    case 'completed':
      return 'completed';
    default:
      return 'pending';
  }
}

/**
 * MissionSyncService — Syncs Claude Code task files into the missions DB.
 *
 * Called by TeamMonitorService after each task poll cycle.
 * Compares incoming Claude tasks against stored missions and
 * inserts new ones / updates changed states with audit trail.
 */
class MissionSyncService {
  private listeners: EventCallback[] = [];

  on(callback: EventCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private emit(event: MissionControlEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[MissionSync] Listener error:', err);
      }
    }
  }

  /**
   * Sync Claude task files into the missions table.
   *
   * - New tasks are inserted with source='claude_file'
   * - Changed states trigger updateState() which records history
   * - Subject/description/assignee updates are applied directly
   *
   * Returns the full list of missions for this team after sync.
   */
  syncFromClaudeTasks(conversationId: string, teamName: string, claudeTasks: TeamTask[]): Mission[] {
    let changed = false;

    for (const task of claudeTasks) {
      const existing = missionStore.getByExternalId(conversationId, teamName, task.id);
      const newState = mapTaskState(task.state);

      if (!existing) {
        // New task — insert
        const now = Date.now();
        const mission: Mission = {
          id: randomUUID(),
          externalId: task.id,
          conversationId,
          teamName,
          subject: task.subject,
          description: task.description,
          state: newState,
          assignee: task.assignee,
          dependencies: task.dependencies,
          createdAt: now,
          updatedAt: now,
          startedAt: newState === 'in_progress' ? now : undefined,
          completedAt: newState === 'completed' ? now : undefined,
          stateHistory: [],
          source: 'claude_file',
        };
        missionStore.upsert(mission);
        changed = true;
      } else {
        let updated = false;

        // Check state change
        if (existing.state !== newState) {
          const result = missionStore.updateState(existing.id, newState, task.assignee);
          if (result) {
            this.emit({ type: 'mission_updated', data: result });
          }
          updated = true;
        }

        // Check metadata changes (subject, description, assignee)
        if (
          existing.subject !== task.subject ||
          existing.description !== task.description ||
          existing.assignee !== task.assignee
        ) {
          const refreshed = missionStore.getById(existing.id);
          if (refreshed) {
            const patched: Mission = {
              ...refreshed,
              subject: task.subject,
              description: task.description,
              assignee: task.assignee,
              dependencies: task.dependencies,
              updatedAt: updated ? refreshed.updatedAt : Date.now(),
            };
            missionStore.upsert(patched);
            if (!updated) changed = true;
          }
        } else if (updated) {
          changed = true;
        }
      }
    }

    const missions = missionStore.listByTeam(conversationId, teamName);

    if (changed) {
      this.emit({ type: 'missions_synced', data: { teamName, missions } });
    }

    return missions;
  }

  /** Get all missions for a conversation */
  getMissions(conversationId: string): Mission[] {
    return missionStore.listByConversation(conversationId);
  }

  /** Get all missions for a specific team */
  getTeamMissions(conversationId: string, teamName: string): Mission[] {
    return missionStore.listByTeam(conversationId, teamName);
  }

  /** Get a single mission by ID */
  getMission(id: string): Mission | null {
    return missionStore.getById(id);
  }
}

/** Singleton instance */
export const missionSyncService = new MissionSyncService();
