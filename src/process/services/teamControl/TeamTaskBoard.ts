/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Mission, MissionState } from '@process/services/missionControl/types';
import { missionStore } from '@process/services/missionControl/MissionStore';
import { teamEventBus } from './TeamEventBus';
import { randomUUID } from 'crypto';

/**
 * TeamTaskBoard — Shared task management for a team session.
 *
 * Thin wrapper over MissionStore that:
 * 1. Creates missions with team-specific metadata
 * 2. Publishes events to TeamEventBus on state changes
 * 3. Provides convenient query methods scoped to a session
 */
export class TeamTaskBoard {
  constructor(
    private readonly sessionId: string,
    private readonly conversationId: string,
    private readonly teamName: string
  ) {}

  /** Create a new task on the board */
  createTask(subject: string, description?: string, assignee?: string): Mission {
    const now = Date.now();
    const mission: Mission = {
      id: randomUUID(),
      externalId: `team-${this.sessionId}-${randomUUID().slice(0, 8)}`,
      conversationId: this.conversationId,
      teamName: this.teamName,
      subject,
      description,
      state: 'pending',
      assignee,
      createdAt: now,
      updatedAt: now,
      stateHistory: [],
      source: 'user',
    };

    missionStore.upsert(mission);
    teamEventBus.publish('task_created', this.sessionId, { missionId: mission.id, data: { subject } });
    return mission;
  }

  /** Assign a task to an agent */
  assignTask(missionId: string, agentId: string): Mission | null {
    const updated = missionStore.updateState(missionId, 'in_progress', agentId);
    if (updated) {
      // Also update assignee
      missionStore.upsert({ ...updated, assignee: agentId });
      teamEventBus.publish('task_assigned', this.sessionId, { agentId, missionId, data: { assignee: agentId } });
    }
    return updated;
  }

  /** Mark a task as completed */
  completeTask(missionId: string, agentId?: string): Mission | null {
    const updated = missionStore.updateState(missionId, 'completed', agentId);
    if (updated) {
      teamEventBus.publish('task_completed', this.sessionId, { agentId, missionId });
    }
    return updated;
  }

  /** Reject a task (validation failed, needs rework) */
  rejectTask(missionId: string, reason: string, agentId?: string): Mission | null {
    // Move back to pending for rework
    const updated = missionStore.updateState(missionId, 'pending', agentId);
    if (updated) {
      teamEventBus.publish('task_rejected', this.sessionId, { agentId, missionId, data: { reason } });
    }
    return updated;
  }

  /** Get all tasks for this session's team */
  listTasks(): Mission[] {
    return missionStore.listByTeam(this.conversationId, this.teamName);
  }

  /** Get a specific task */
  getTask(missionId: string): Mission | null {
    return missionStore.getById(missionId);
  }

  /** Get tasks by state */
  listByState(state: MissionState): Mission[] {
    return this.listTasks().filter((m) => m.state === state);
  }

  /** Check if all tasks are completed */
  allCompleted(): boolean {
    const tasks = this.listTasks();
    return tasks.length > 0 && tasks.every((m) => m.state === 'completed');
  }
}
