/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it, beforeEach, jest } from '@jest/globals';

// ── Mock dependencies ──

// Mock MissionStore (same pattern as MissionControl tests)
import type { Mission, MissionState } from '@process/services/missionControl/types';

const memoryStore = new Map<string, Mission>();

const mockMissionStore = {
  upsert: jest.fn((mission: Mission) => {
    const existing = Array.from(memoryStore.values()).find(
      (m) => m.conversationId === mission.conversationId && m.teamName === mission.teamName && m.externalId === mission.externalId
    );
    if (existing) {
      memoryStore.set(existing.id, { ...mission, id: existing.id });
    } else {
      memoryStore.set(mission.id, mission);
    }
  }),
  getById: jest.fn((id: string) => memoryStore.get(id) ?? null),
  getByExternalId: jest.fn((conversationId: string, teamName: string, externalId: string) => {
    return (
      Array.from(memoryStore.values()).find(
        (m) => m.conversationId === conversationId && m.teamName === teamName && m.externalId === externalId
      ) ?? null
    );
  }),
  listByTeam: jest.fn((conversationId: string, teamName: string) => {
    return Array.from(memoryStore.values())
      .filter((m) => m.conversationId === conversationId && m.teamName === teamName)
      .sort((a, b) => a.createdAt - b.createdAt);
  }),
  listByConversation: jest.fn((conversationId: string) => {
    return Array.from(memoryStore.values())
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt - b.createdAt);
  }),
  updateState: jest.fn((id: string, newState: MissionState, triggeredBy?: string) => {
    const existing = memoryStore.get(id);
    if (!existing) return null;
    if (existing.state === newState) return existing;
    const now = Date.now();
    const updated: Mission = {
      ...existing,
      state: newState,
      updatedAt: now,
      stateHistory: [...existing.stateHistory, { from: existing.state, to: newState, at: now, triggeredBy }],
      startedAt: newState === 'in_progress' && !existing.startedAt ? now : existing.startedAt,
      completedAt: newState === 'completed' ? now : existing.completedAt,
    };
    memoryStore.set(id, updated);
    return updated;
  }),
  deleteByConversation: jest.fn(),
  deleteByTeam: jest.fn(),
};

jest.mock('@process/services/missionControl/MissionStore', () => ({
  missionStore: mockMissionStore,
}));

jest.mock('@process/database', () => ({
  getDatabase: () => ({ db: {} }),
}));

// ── Import modules under test ──

import { teamEventBus } from '@process/services/teamControl/TeamEventBus';
import { TeamTaskBoard } from '@process/services/teamControl/TeamTaskBoard';
import { buildWorkerPrompt, buildValidatorPrompt, parseValidatorVerdict } from '@process/services/teamControl/prompts';
import type { TeamEvent } from '@process/services/teamControl/types';

describe('TeamControl', () => {
  beforeEach(() => {
    memoryStore.clear();
    jest.clearAllMocks();
    teamEventBus.removeAllListeners();
  });

  // ── Prompts ──

  describe('prompts', () => {
    describe('buildWorkerPrompt', () => {
      it('should build a basic worker prompt', () => {
        const prompt = buildWorkerPrompt('Fix the login bug');
        expect(prompt).toContain('Worker Agent');
        expect(prompt).toContain('Fix the login bug');
        expect(prompt).not.toContain('Feedback');
      });

      it('should include description when provided', () => {
        const prompt = buildWorkerPrompt('Fix bug', 'The login form crashes on submit');
        expect(prompt).toContain('The login form crashes on submit');
      });

      it('should include feedback when provided', () => {
        const prompt = buildWorkerPrompt('Fix bug', undefined, 'You missed the edge case');
        expect(prompt).toContain('Feedback from Reviewer');
        expect(prompt).toContain('You missed the edge case');
      });
    });

    describe('buildValidatorPrompt', () => {
      it('should build a validator prompt with worker output', () => {
        const prompt = buildValidatorPrompt('Fix bug', 'I fixed the null check in auth.ts');
        expect(prompt).toContain('Validator Agent');
        expect(prompt).toContain('Fix bug');
        expect(prompt).toContain('I fixed the null check in auth.ts');
        expect(prompt).toContain('VERDICT: APPROVED');
        expect(prompt).toContain('VERDICT: REJECTED');
      });
    });

    describe('parseValidatorVerdict', () => {
      it('should detect APPROVED verdict', () => {
        const result = parseValidatorVerdict('Everything looks good.\n\n**VERDICT: APPROVED**');
        expect(result.approved).toBe(true);
      });

      it('should detect REJECTED verdict', () => {
        const result = parseValidatorVerdict('Missing tests.\n\n**VERDICT: REJECTED**');
        expect(result.approved).toBe(false);
      });

      it('should handle verdict anywhere in output', () => {
        const result = parseValidatorVerdict('VERDICT: APPROVED\nSome extra text after');
        expect(result.approved).toBe(true);
      });

      it('should handle implicit approval (APPROVED keyword)', () => {
        const result = parseValidatorVerdict('The code looks correct and is approved.');
        expect(result.approved).toBe(true);
      });

      it('should handle implicit rejection (REJECTED keyword)', () => {
        const result = parseValidatorVerdict('This should be rejected due to missing tests.');
        expect(result.approved).toBe(false);
      });

      it('should default to approved when no clear signal', () => {
        const result = parseValidatorVerdict('The code looks fine.');
        expect(result.approved).toBe(true);
      });

      it('should always include full output as feedback', () => {
        const output = 'Detailed review feedback here.\n\n**VERDICT: APPROVED**';
        const result = parseValidatorVerdict(output);
        expect(result.feedback).toBe(output);
      });
    });
  });

  // ── TeamEventBus ──

  describe('TeamEventBus', () => {
    it('should emit and receive team events', () => {
      const events: TeamEvent[] = [];
      teamEventBus.onTeamEvent((e) => events.push(e));

      teamEventBus.publish('session_started', 'sess-1', { data: { test: true } });

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('session_started');
      expect(events[0].sessionId).toBe('sess-1');
      expect(events[0].timestamp).toBeDefined();
    });

    it('should support type-specific subscriptions', () => {
      const events: TeamEvent[] = [];
      teamEventBus.onEventType('agent_output', (e) => events.push(e));

      teamEventBus.publish('session_started', 'sess-1');
      teamEventBus.publish('agent_output', 'sess-1', { agentId: 'w-1' });

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('agent_output');
    });

    it('should support unsubscription', () => {
      const events: TeamEvent[] = [];
      const unsub = teamEventBus.onTeamEvent((e) => events.push(e));

      teamEventBus.publish('session_started', 'sess-1');
      unsub();
      teamEventBus.publish('session_completed', 'sess-1');

      expect(events).toHaveLength(1);
    });

    it('should include optional fields', () => {
      const events: TeamEvent[] = [];
      teamEventBus.onTeamEvent((e) => events.push(e));

      teamEventBus.publish('task_assigned', 'sess-1', {
        agentId: 'worker-1',
        missionId: 'mission-1',
        data: { assignee: 'worker-1' },
      });

      expect(events[0].agentId).toBe('worker-1');
      expect(events[0].missionId).toBe('mission-1');
      expect(events[0].data).toEqual({ assignee: 'worker-1' });
    });
  });

  // ── TeamTaskBoard ──

  describe('TeamTaskBoard', () => {
    let board: TeamTaskBoard;

    beforeEach(() => {
      board = new TeamTaskBoard('sess-1', 'conv-1', 'team-abc');
    });

    it('should create a task and emit event', () => {
      const events: TeamEvent[] = [];
      teamEventBus.onTeamEvent((e) => events.push(e));

      const mission = board.createTask('Build API', 'REST endpoints');

      expect(mission.subject).toBe('Build API');
      expect(mission.description).toBe('REST endpoints');
      expect(mission.state).toBe('pending');
      expect(mission.source).toBe('user');
      expect(mockMissionStore.upsert).toHaveBeenCalledTimes(1);

      const taskEvent = events.find((e) => e.type === 'task_created');
      expect(taskEvent).toBeDefined();
    });

    it('should assign a task', () => {
      const mission = board.createTask('Build API');
      board.assignTask(mission.id, 'worker-1');

      const updated = mockMissionStore.getById(mission.id);
      expect(updated!.state).toBe('in_progress');
    });

    it('should complete a task and emit event', () => {
      const events: TeamEvent[] = [];
      teamEventBus.onTeamEvent((e) => events.push(e));

      const mission = board.createTask('Build API');
      board.assignTask(mission.id, 'worker-1');
      board.completeTask(mission.id, 'validator-1');

      const updated = mockMissionStore.getById(mission.id);
      expect(updated!.state).toBe('completed');
      expect(events.some((e) => e.type === 'task_completed')).toBe(true);
    });

    it('should reject a task (move back to pending)', () => {
      const events: TeamEvent[] = [];
      teamEventBus.onTeamEvent((e) => events.push(e));

      const mission = board.createTask('Build API');
      board.assignTask(mission.id, 'worker-1');
      board.rejectTask(mission.id, 'Missing tests');

      const updated = mockMissionStore.getById(mission.id);
      expect(updated!.state).toBe('pending');
      expect(events.some((e) => e.type === 'task_rejected')).toBe(true);
    });

    it('should list tasks', () => {
      board.createTask('Task A');
      board.createTask('Task B');

      const tasks = board.listTasks();
      expect(tasks).toHaveLength(2);
    });

    it('should check allCompleted', () => {
      const m1 = board.createTask('Task A');
      const m2 = board.createTask('Task B');

      expect(board.allCompleted()).toBe(false);

      board.assignTask(m1.id, 'w');
      board.completeTask(m1.id);
      expect(board.allCompleted()).toBe(false);

      board.assignTask(m2.id, 'w');
      board.completeTask(m2.id);
      expect(board.allCompleted()).toBe(true);
    });

    it('should filter by state', () => {
      const m1 = board.createTask('Task A');
      board.createTask('Task B');
      board.assignTask(m1.id, 'w');

      expect(board.listByState('pending')).toHaveLength(1);
      expect(board.listByState('in_progress')).toHaveLength(1);
    });
  });
});
