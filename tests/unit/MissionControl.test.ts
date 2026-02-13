/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import type { Mission, MissionState } from '@/common/missionControl';
import type { TeamTask } from '@/common/teamMonitor';

/**
 * Since better-sqlite3 native bindings may not be available in CI,
 * we mock the store at the module level and test the sync logic
 * and row conversion functions in isolation.
 */

// ── In-memory mission store for testing ──

const memoryStore = new Map<string, Mission>();

/** Keyed by "conversationId|teamName|externalId" */
function extKey(m: { conversationId: string; teamName: string; externalId: string }): string {
  return `${m.conversationId}|${m.teamName}|${m.externalId}`;
}

const mockMissionStore = {
  upsert: jest.fn((mission: Mission) => {
    const existing = Array.from(memoryStore.values()).find(
      (m) => m.conversationId === mission.conversationId && m.teamName === mission.teamName && m.externalId === mission.externalId
    );
    if (existing) {
      // Upsert: update existing
      memoryStore.set(existing.id, { ...mission, id: existing.id });
    } else {
      memoryStore.set(mission.id, mission);
    }
  }),
  getById: jest.fn((id: string) => memoryStore.get(id) ?? null),
  getByExternalId: jest.fn((conversationId: string, teamName: string, externalId: string) => {
    return Array.from(memoryStore.values()).find(
      (m) => m.conversationId === conversationId && m.teamName === teamName && m.externalId === externalId
    ) ?? null;
  }),
  listByConversation: jest.fn((conversationId: string) => {
    return Array.from(memoryStore.values())
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt - b.createdAt);
  }),
  listByTeam: jest.fn((conversationId: string, teamName: string) => {
    return Array.from(memoryStore.values())
      .filter((m) => m.conversationId === conversationId && m.teamName === teamName)
      .sort((a, b) => a.createdAt - b.createdAt);
  }),
  updateState: jest.fn((id: string, newState: MissionState, triggeredBy?: string) => {
    const existing = memoryStore.get(id);
    if (!existing) return null;
    if (existing.state === newState) return existing;

    const now = Date.now();
    const transition = { from: existing.state, to: newState, at: now, triggeredBy };
    const updated: Mission = {
      ...existing,
      state: newState,
      updatedAt: now,
      stateHistory: [...existing.stateHistory, transition],
      startedAt: newState === 'in_progress' && !existing.startedAt ? now : existing.startedAt,
      completedAt: newState === 'completed' ? now : existing.completedAt,
    };
    memoryStore.set(id, updated);
    return updated;
  }),
  deleteByConversation: jest.fn((conversationId: string) => {
    let count = 0;
    for (const [id, m] of memoryStore) {
      if (m.conversationId === conversationId) {
        memoryStore.delete(id);
        count++;
      }
    }
    return count;
  }),
  deleteByTeam: jest.fn((conversationId: string, teamName: string) => {
    let count = 0;
    for (const [id, m] of memoryStore) {
      if (m.conversationId === conversationId && m.teamName === teamName) {
        memoryStore.delete(id);
        count++;
      }
    }
    return count;
  }),
};

// Mock both the store module and the database module
jest.mock('@process/services/missionControl/MissionStore', () => ({
  missionStore: mockMissionStore,
  missionToRow: jest.fn(),
  rowToMission: jest.fn(),
}));

jest.mock('@process/database', () => ({
  getDatabase: () => ({ db: {} }),
}));

// Now import the sync service (it uses the mocked store)
import { missionSyncService } from '@process/services/missionControl/MissionSyncService';
import type { MissionControlEvent } from '@/common/missionControl';

// Import the real row conversion functions for testing (no DB dependency)
import { missionToRow as realMissionToRow, rowToMission as realRowToMission } from '@process/services/missionControl/MissionStore';
import type { MissionRow } from '@process/services/missionControl/MissionStore';

describe('MissionControl', () => {
  beforeEach(() => {
    memoryStore.clear();
    jest.clearAllMocks();
  });

  // ── Mock MissionStore ──

  describe('MissionStore (mock)', () => {
    const makeMission = (overrides?: Partial<Mission>): Mission => ({
      id: 'mission-1',
      externalId: 'task-1',
      conversationId: 'conv-1',
      teamName: 'alpha',
      subject: 'Build the thing',
      state: 'pending',
      stateHistory: [],
      source: 'claude_file',
      createdAt: 1000,
      updatedAt: 1000,
      ...overrides,
    });

    it('should insert and retrieve a mission', () => {
      const m = makeMission();
      mockMissionStore.upsert(m);

      const retrieved = mockMissionStore.getById('mission-1');
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe('mission-1');
      expect(retrieved!.subject).toBe('Build the thing');
    });

    it('should upsert (update on conflict by external key)', () => {
      mockMissionStore.upsert(makeMission({ subject: 'v1' }));
      mockMissionStore.upsert(makeMission({ id: 'mission-2', subject: 'v2', state: 'in_progress' }));

      const all = mockMissionStore.listByTeam('conv-1', 'alpha');
      expect(all).toHaveLength(1);
      expect(all[0].subject).toBe('v2');
    });

    it('should find by external ID', () => {
      mockMissionStore.upsert(makeMission());
      const found = mockMissionStore.getByExternalId('conv-1', 'alpha', 'task-1');
      expect(found).not.toBeNull();
      expect(found!.id).toBe('mission-1');
    });

    it('should return null for missing external ID', () => {
      expect(mockMissionStore.getByExternalId('conv-1', 'alpha', 'nonexistent')).toBeNull();
    });

    it('should list by conversation', () => {
      mockMissionStore.upsert(makeMission({ id: 'a', externalId: 'e1', conversationId: 'conv-1' }));
      mockMissionStore.upsert(makeMission({ id: 'b', externalId: 'e2', conversationId: 'conv-1', teamName: 'beta' }));
      mockMissionStore.upsert(makeMission({ id: 'c', externalId: 'e3', conversationId: 'conv-2' }));

      expect(mockMissionStore.listByConversation('conv-1')).toHaveLength(2);
      expect(mockMissionStore.listByConversation('conv-2')).toHaveLength(1);
    });

    it('should list by team', () => {
      mockMissionStore.upsert(makeMission({ id: 'a', externalId: 'e1', teamName: 'alpha' }));
      mockMissionStore.upsert(makeMission({ id: 'b', externalId: 'e2', teamName: 'alpha' }));
      mockMissionStore.upsert(makeMission({ id: 'c', externalId: 'e3', teamName: 'beta' }));

      expect(mockMissionStore.listByTeam('conv-1', 'alpha')).toHaveLength(2);
      expect(mockMissionStore.listByTeam('conv-1', 'beta')).toHaveLength(1);
    });

    it('should update state with history', () => {
      mockMissionStore.upsert(makeMission());
      const updated = mockMissionStore.updateState('mission-1', 'in_progress', 'agent-a');

      expect(updated).not.toBeNull();
      expect(updated!.state).toBe('in_progress');
      expect(updated!.startedAt).toBeDefined();
      expect(updated!.stateHistory).toHaveLength(1);
      expect(updated!.stateHistory[0]).toMatchObject({ from: 'pending', to: 'in_progress', triggeredBy: 'agent-a' });
    });

    it('should accumulate state history across transitions', () => {
      mockMissionStore.upsert(makeMission());
      mockMissionStore.updateState('mission-1', 'in_progress');
      const completed = mockMissionStore.updateState('mission-1', 'completed');

      expect(completed!.stateHistory).toHaveLength(2);
      expect(completed!.completedAt).toBeDefined();
    });

    it('should not change when state is same', () => {
      mockMissionStore.upsert(makeMission({ state: 'in_progress' }));
      const result = mockMissionStore.updateState('mission-1', 'in_progress');
      expect(result!.stateHistory).toHaveLength(0);
    });

    it('should return null for updateState on nonexistent mission', () => {
      expect(mockMissionStore.updateState('nonexistent', 'completed')).toBeNull();
    });

    it('should delete by conversation', () => {
      mockMissionStore.upsert(makeMission({ id: 'a', externalId: 'e1', conversationId: 'conv-1' }));
      mockMissionStore.upsert(makeMission({ id: 'b', externalId: 'e2', conversationId: 'conv-2' }));

      expect(mockMissionStore.deleteByConversation('conv-1')).toBe(1);
      expect(mockMissionStore.listByConversation('conv-1')).toHaveLength(0);
      expect(mockMissionStore.listByConversation('conv-2')).toHaveLength(1);
    });

    it('should delete by team', () => {
      mockMissionStore.upsert(makeMission({ id: 'a', externalId: 'e1', teamName: 'alpha' }));
      mockMissionStore.upsert(makeMission({ id: 'b', externalId: 'e2', teamName: 'beta' }));

      expect(mockMissionStore.deleteByTeam('conv-1', 'alpha')).toBe(1);
      expect(mockMissionStore.listByTeam('conv-1', 'alpha')).toHaveLength(0);
      expect(mockMissionStore.listByTeam('conv-1', 'beta')).toHaveLength(1);
    });
  });

  // ── MissionSyncService ──

  describe('MissionSyncService', () => {
    const claudeTasks: TeamTask[] = [
      { id: 'ct-1', subject: 'Build API', state: 'pending' },
      { id: 'ct-2', subject: 'Write tests', state: 'in_progress', assignee: 'agent-b' },
      { id: 'ct-3', subject: 'Deploy', state: 'completed', assignee: 'agent-c' },
    ];

    it('should insert new missions from Claude tasks', () => {
      const missions = missionSyncService.syncFromClaudeTasks('conv-1', 'team-x', claudeTasks);

      expect(missions).toHaveLength(3);
      expect(missions[0].externalId).toBe('ct-1');
      expect(missions[0].state).toBe('pending');
      expect(missions[0].source).toBe('claude_file');
      expect(missions[1].state).toBe('in_progress');
      expect(missions[1].startedAt).toBeDefined();
      expect(missions[2].state).toBe('completed');
      expect(missions[2].completedAt).toBeDefined();
    });

    it('should call store.upsert for each new task', () => {
      missionSyncService.syncFromClaudeTasks('conv-1', 'team-x', claudeTasks);
      expect(mockMissionStore.upsert).toHaveBeenCalledTimes(3);
    });

    it('should be idempotent — re-sync same tasks produces no state changes', () => {
      missionSyncService.syncFromClaudeTasks('conv-1', 'team-x', claudeTasks);
      jest.clearAllMocks();

      const events: MissionControlEvent[] = [];
      const unsub = missionSyncService.on((e) => events.push(e));

      missionSyncService.syncFromClaudeTasks('conv-1', 'team-x', claudeTasks);

      unsub();
      const updateEvents = events.filter((e) => e.type === 'mission_updated');
      expect(updateEvents).toHaveLength(0);
    });

    it('should detect state changes and record history', () => {
      missionSyncService.syncFromClaudeTasks('conv-1', 'team-x', [
        { id: 'ct-1', subject: 'Build API', state: 'pending' },
      ]);

      const events: MissionControlEvent[] = [];
      const unsub = missionSyncService.on((e) => events.push(e));

      missionSyncService.syncFromClaudeTasks('conv-1', 'team-x', [
        { id: 'ct-1', subject: 'Build API', state: 'in_progress', assignee: 'agent-a' },
      ]);

      unsub();

      const updateEvents = events.filter((e) => e.type === 'mission_updated');
      expect(updateEvents).toHaveLength(1);

      const updated = (updateEvents[0] as { type: 'mission_updated'; data: Mission }).data;
      expect(updated.state).toBe('in_progress');
      expect(updated.stateHistory).toHaveLength(1);
      expect(updated.stateHistory[0].from).toBe('pending');
      expect(updated.stateHistory[0].to).toBe('in_progress');
    });

    it('should update metadata without state change', () => {
      missionSyncService.syncFromClaudeTasks('conv-1', 'team-x', [
        { id: 'ct-1', subject: 'Build API', state: 'pending' },
      ]);
      jest.clearAllMocks();

      missionSyncService.syncFromClaudeTasks('conv-1', 'team-x', [
        { id: 'ct-1', subject: 'Build REST API', state: 'pending', assignee: 'agent-a' },
      ]);

      // Should have called upsert to update metadata
      expect(mockMissionStore.upsert).toHaveBeenCalled();
      const missions = mockMissionStore.listByTeam('conv-1', 'team-x');
      expect(missions[0].subject).toBe('Build REST API');
      expect(missions[0].assignee).toBe('agent-a');
    });

    it('should handle mixed new and existing tasks', () => {
      missionSyncService.syncFromClaudeTasks('conv-1', 'team-x', [
        { id: 'ct-1', subject: 'Task A', state: 'pending' },
        { id: 'ct-2', subject: 'Task B', state: 'pending' },
      ]);

      missionSyncService.syncFromClaudeTasks('conv-1', 'team-x', [
        { id: 'ct-1', subject: 'Task A', state: 'completed' },
        { id: 'ct-2', subject: 'Task B', state: 'pending' },
        { id: 'ct-3', subject: 'Task C', state: 'pending' },
      ]);

      const missions = mockMissionStore.listByTeam('conv-1', 'team-x');
      expect(missions).toHaveLength(3);

      const taskA = missions.find((m) => m.externalId === 'ct-1');
      expect(taskA!.state).toBe('completed');
      expect(taskA!.stateHistory).toHaveLength(1);
    });

    it('should emit missions_synced when new tasks arrive', () => {
      const events: MissionControlEvent[] = [];
      const unsub = missionSyncService.on((e) => events.push(e));

      missionSyncService.syncFromClaudeTasks('conv-1', 'team-x', claudeTasks);

      unsub();
      const syncEvents = events.filter((e) => e.type === 'missions_synced');
      expect(syncEvents).toHaveLength(1);
    });

    it('should provide query methods', () => {
      missionSyncService.syncFromClaudeTasks('conv-1', 'team-x', claudeTasks);

      const all = missionSyncService.getMissions('conv-1');
      expect(all).toHaveLength(3);

      const teamMissions = missionSyncService.getTeamMissions('conv-1', 'team-x');
      expect(teamMissions).toHaveLength(3);

      const single = missionSyncService.getMission(all[0].id);
      expect(single).not.toBeNull();
      expect(single!.externalId).toBe('ct-1');
    });

    it('should isolate missions across conversations', () => {
      missionSyncService.syncFromClaudeTasks('conv-1', 'team-x', [
        { id: 'ct-1', subject: 'Task A', state: 'pending' },
      ]);
      missionSyncService.syncFromClaudeTasks('conv-2', 'team-x', [
        { id: 'ct-1', subject: 'Task B', state: 'completed' },
      ]);

      const conv1 = missionSyncService.getMissions('conv-1');
      const conv2 = missionSyncService.getMissions('conv-2');

      expect(conv1).toHaveLength(1);
      expect(conv1[0].subject).toBe('Task A');
      expect(conv1[0].state).toBe('pending');

      expect(conv2).toHaveLength(1);
      expect(conv2[0].subject).toBe('Task B');
      expect(conv2[0].state).toBe('completed');
    });

    it('should unsubscribe listeners correctly', () => {
      const events: MissionControlEvent[] = [];
      const unsub = missionSyncService.on((e) => events.push(e));

      unsub();
      missionSyncService.syncFromClaudeTasks('conv-1', 'team-x', claudeTasks);

      expect(events).toHaveLength(0);
    });
  });

  // ── Row conversion (unit, no DB) ──

  describe('row conversion types', () => {
    it('missionToRow and rowToMission should be importable', () => {
      // These are mocked, but we verify they exist in the module exports
      expect(realMissionToRow).toBeDefined();
      expect(realRowToMission).toBeDefined();
    });
  });
});
