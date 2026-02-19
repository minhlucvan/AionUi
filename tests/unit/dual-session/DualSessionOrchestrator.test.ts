/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { DualSessionOrchestrator } from '@/agent/dual-session/DualSessionOrchestrator';
import type { CreateSessionFn } from '@/agent/dual-session/DualSessionOrchestrator';
import { DUAL_SESSION_COMPLETION_SIGNAL } from '@/agent/dual-session/types';
import type { DualSessionConfig, DualSessionStatusCallback } from '@/agent/dual-session/types';

// Mock channelEventBus
const mockListeners: Array<(event: any) => void> = [];
jest.mock('@/channels/agent/ChannelEventBus', () => ({
  channelEventBus: {
    onAgentMessage: jest.fn((handler: (event: any) => void) => {
      mockListeners.push(handler);
      return () => {
        const idx = mockListeners.indexOf(handler);
        if (idx >= 0) mockListeners.splice(idx, 1);
      };
    }),
  },
}));

// Mock uuid
jest.mock('@/common/utils', () => ({
  uuid: jest.fn(() => `mock-uuid-${Math.random().toString(36).slice(2, 8)}`),
}));

function emitAgentEvent(conversationId: string, type: string, data?: unknown) {
  for (const listener of mockListeners) {
    listener({ conversation_id: conversationId, type, data });
  }
}

function createMockSession(conversationId: string) {
  const messages: Array<{ content: string; msg_id?: string }> = [];
  return {
    conversationId,
    messages,
    task: {
      sendMessage: jest.fn(async (msg: { content: string; msg_id: string }) => {
        messages.push(msg);
        return { success: true };
      }),
      enqueueMessages: jest.fn((msgs: Array<{ content: string }>) => {
        for (const msg of msgs) messages.push(msg);
        return msgs.map(() => 'queued-id');
      }),
      ensureYoloMode: jest.fn(async () => true),
    } as any,
  };
}

describe('DualSessionOrchestrator', () => {
  let driverSession: ReturnType<typeof createMockSession>;
  let navigatorSession: ReturnType<typeof createMockSession>;
  let createSession: CreateSessionFn;

  beforeEach(() => {
    mockListeners.length = 0;
    driverSession = createMockSession('driver-conv-id');
    navigatorSession = createMockSession('navigator-conv-id');

    let callCount = 0;
    createSession = jest.fn(async () => {
      callCount++;
      return callCount === 1 ? driverSession : navigatorSession;
    }) as any;
  });

  const baseConfig: DualSessionConfig = {
    task: 'Test task',
    workspace: '/tmp/test',
    driverBackend: 'claude',
    navigatorBackend: 'claude',
    maxTurns: 10,
    yoloMode: true,
  };

  describe('constructor', () => {
    it('should initialize with idle status', () => {
      const orchestrator = new DualSessionOrchestrator(createSession, baseConfig);
      expect(orchestrator.status).toBe('idle');
    });
  });

  describe('run', () => {
    it('should create both sessions', async () => {
      const orchestrator = new DualSessionOrchestrator(createSession, baseConfig);

      // Start run (will block until completion)
      const runPromise = orchestrator.run();

      // Wait for sessions to be created
      await new Promise((r) => setTimeout(r, 50));

      expect(createSession).toHaveBeenCalledTimes(2);

      // Simulate driver finishing with completion signal
      emitAgentEvent('driver-conv-id', 'content', `Done! ${DUAL_SESSION_COMPLETION_SIGNAL}`);
      emitAgentEvent('driver-conv-id', 'finish');

      const result = await runPromise;
      expect(result.driverConversationId).toBe('driver-conv-id');
      expect(result.navigatorConversationId).toBe('navigator-conv-id');
    });

    it('should detect completion signal and stop', async () => {
      const orchestrator = new DualSessionOrchestrator(createSession, baseConfig);
      const runPromise = orchestrator.run();
      await new Promise((r) => setTimeout(r, 50));

      // Simulate driver finishing with completion signal
      emitAgentEvent('driver-conv-id', 'content', `All tasks complete. ${DUAL_SESSION_COMPLETION_SIGNAL}`);
      emitAgentEvent('driver-conv-id', 'finish');

      const result = await runPromise;
      expect(result.taskCompleted).toBe(true);
      expect(result.status).toBe('completed');
    });

    it('should relay driver response to navigator', async () => {
      const orchestrator = new DualSessionOrchestrator(createSession, baseConfig);
      const runPromise = orchestrator.run();
      await new Promise((r) => setTimeout(r, 50));

      // Simulate driver finishing WITHOUT completion signal
      emitAgentEvent('driver-conv-id', 'content', 'Please implement the login feature');
      emitAgentEvent('driver-conv-id', 'finish');

      // Wait for relay
      await new Promise((r) => setTimeout(r, 50));

      // Navigator should have received the relay message via enqueueMessages
      expect(navigatorSession.task.enqueueMessages).toHaveBeenCalled();
      const lastCall = navigatorSession.task.enqueueMessages.mock.calls[navigatorSession.task.enqueueMessages.mock.calls.length - 1][0];
      expect(lastCall[0].content).toContain('Please implement the login feature');

      // Now simulate navigator responding and driver completing
      emitAgentEvent('navigator-conv-id', 'content', `Done. ${DUAL_SESSION_COMPLETION_SIGNAL}`);
      emitAgentEvent('navigator-conv-id', 'finish');

      const result = await runPromise;
      expect(result.totalTurns).toBe(2);
      expect(result.taskCompleted).toBe(true);
    });

    it('should stop at max turns', async () => {
      const config = { ...baseConfig, maxTurns: 2 };
      const orchestrator = new DualSessionOrchestrator(createSession, config);
      const runPromise = orchestrator.run();
      await new Promise((r) => setTimeout(r, 50));

      // Turn 1: driver responds
      emitAgentEvent('driver-conv-id', 'content', 'Step 1');
      emitAgentEvent('driver-conv-id', 'finish');
      await new Promise((r) => setTimeout(r, 50));

      // Turn 2: navigator responds (hits max)
      emitAgentEvent('navigator-conv-id', 'content', 'Step 1 done');
      emitAgentEvent('navigator-conv-id', 'finish');

      const result = await runPromise;
      expect(result.status).toBe('max_turns_reached');
      expect(result.totalTurns).toBe(2);
      expect(result.taskCompleted).toBe(false);
    });

    it('should emit status callbacks', async () => {
      const statusUpdates: any[] = [];
      const onStatus: DualSessionStatusCallback = (progress) => {
        statusUpdates.push({ ...progress });
      };

      const orchestrator = new DualSessionOrchestrator(createSession, baseConfig, onStatus);
      const runPromise = orchestrator.run();
      await new Promise((r) => setTimeout(r, 50));

      // Complete immediately
      emitAgentEvent('driver-conv-id', 'content', DUAL_SESSION_COMPLETION_SIGNAL);
      emitAgentEvent('driver-conv-id', 'finish');

      await runPromise;

      // Should have received status updates (starting, running, turn, completed)
      expect(statusUpdates.length).toBeGreaterThan(0);
      expect(statusUpdates[0].status).toBe('starting');
    });

    it('should accumulate streaming content', async () => {
      const orchestrator = new DualSessionOrchestrator(createSession, baseConfig);
      const runPromise = orchestrator.run();
      await new Promise((r) => setTimeout(r, 50));

      // Simulate streamed content (multiple chunks)
      emitAgentEvent('driver-conv-id', 'content', 'Hello ');
      emitAgentEvent('driver-conv-id', 'content', 'World');
      emitAgentEvent('driver-conv-id', 'content', `! ${DUAL_SESSION_COMPLETION_SIGNAL}`);
      emitAgentEvent('driver-conv-id', 'finish');

      const result = await runPromise;
      expect(result.turns[0].content).toBe(`Hello World! ${DUAL_SESSION_COMPLETION_SIGNAL}`);
    });
  });

  describe('stop', () => {
    it('should stop a running session', async () => {
      const orchestrator = new DualSessionOrchestrator(createSession, baseConfig);
      const runPromise = orchestrator.run();
      await new Promise((r) => setTimeout(r, 50));

      orchestrator.stop();

      const result = await runPromise;
      expect(result.status).toBe('stopped');
      expect(result.taskCompleted).toBe(false);
    });
  });

  describe('progress', () => {
    it('should track turns in progress', async () => {
      const orchestrator = new DualSessionOrchestrator(createSession, baseConfig);
      const runPromise = orchestrator.run();
      await new Promise((r) => setTimeout(r, 50));

      // Initial progress
      expect(orchestrator.progress.currentTurn).toBe(0);

      // After driver responds
      emitAgentEvent('driver-conv-id', 'content', `Done ${DUAL_SESSION_COMPLETION_SIGNAL}`);
      emitAgentEvent('driver-conv-id', 'finish');

      const result = await runPromise;
      expect(result.turns.length).toBe(1);
      expect(result.turns[0].from).toBe('driver');
      expect(result.turns[0].to).toBe('navigator');
    });
  });
});
