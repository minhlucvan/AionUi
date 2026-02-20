/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SwarmFeedEntry } from '../../../src/agent/swarm/types';

/** Helper: create a mock SwarmHookContext for testing */
function createMockSwarmContext(role: string, overrides: Record<string, any> = {}) {
  const feedEntries: SwarmFeedEntry[] = [];
  return {
    role,
    name: role.charAt(0).toUpperCase() + role.slice(1),
    agentBackend: 'claude',
    peers: role === 'driver' ? ['navigator'] : ['driver'],
    turnNumber: 1,
    maxTurns: 30,
    turnStrategy: 'round-robin' as const,
    feed: {
      append: (entry: any) => {
        const full: SwarmFeedEntry = {
          id: `f-${Date.now()}-${feedEntries.length}`,
          seq: feedEntries.length + 1,
          from: role,
          ts: new Date().toISOString(),
          ...entry,
        };
        feedEntries.push(full);
        return full;
      },
      readNew: () => [] as SwarmFeedEntry[],
      readAll: () => feedEntries,
      isDone: () => feedEntries.some((e) => e.type === 'done'),
    },
    _feedEntries: feedEntries, // test inspection
    ...overrides,
  };
}

describe('Driver hooks (swarm events)', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const hooks = require('../../../assistant/dual-claude/swarm/driver/hooks/driver-hooks.js');

  test('onSwarmInit returns seed message with role context', async () => {
    const swarm = createMockSwarmContext('driver');
    const result = await hooks.onSwarmInit.handler({
      swarm,
      content: 'Build a REST API',
    });
    expect(result.queueMessages).toHaveLength(1);
    expect(result.queueMessages[0].content).toContain('Driver');
    expect(result.queueMessages[0].content).toContain('Build a REST API');
  });

  test('onSwarmTurnEnd writes action to feed via context.swarm.feed', async () => {
    const swarm = createMockSwarmContext('driver');
    const result = await hooks.onSwarmTurnEnd.handler({
      swarm,
      agentOutput: 'Created server.ts with Express setup.',
    });

    expect(swarm._feedEntries).toHaveLength(1);
    expect(swarm._feedEntries[0].from).toBe('driver');
    expect(swarm._feedEntries[0].to).toBe('navigator');
    expect(swarm._feedEntries[0].type).toBe('action');
    expect(result.done).toBeUndefined();
  });

  test('onSwarmTurnEnd detects <done/> signal and writes done entry', async () => {
    const swarm = createMockSwarmContext('driver');
    const result = await hooks.onSwarmTurnEnd.handler({
      swarm,
      agentOutput: 'All tasks complete! <done/>',
    });

    expect(swarm._feedEntries).toHaveLength(1);
    expect(swarm._feedEntries[0].type).toBe('done');
    expect(result.done).toBe(true);
  });

  test('onSwarmFeedMessage queues navigator directive for driver', async () => {
    const swarm = createMockSwarmContext('driver');
    const result = await hooks.onSwarmFeedMessage.handler({
      swarm,
      feedEntries: [
        {
          id: 'f-1',
          seq: 2,
          from: 'navigator',
          to: 'driver',
          type: 'directive',
          content: 'Create auth middleware',
          ts: new Date().toISOString(),
        },
      ],
    });

    expect(result.queueMessages).toHaveLength(1);
    expect(result.queueMessages[0].content).toContain('Navigator says');
    expect(result.queueMessages[0].content).toContain('Create auth middleware');
  });

  test('onSwarmFeedMessage returns empty when no entries', async () => {
    const swarm = createMockSwarmContext('driver');
    const result = await hooks.onSwarmFeedMessage.handler({
      swarm,
      feedEntries: [],
    });

    expect(result.queueMessages).toBeUndefined();
  });
});

describe('Navigator hooks (swarm events)', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const hooks = require('../../../assistant/dual-claude/swarm/navigator/hooks/navigator-hooks.js');

  test('onSwarmInit writes user task to feed and returns seed message', async () => {
    const swarm = createMockSwarmContext('navigator');
    const result = await hooks.onSwarmInit.handler({
      swarm,
      content: 'Build a REST API',
    });

    expect(result.queueMessages).toHaveLength(1);
    expect(result.queueMessages[0].content).toContain('Navigator');

    // Navigator's onSwarmInit writes the user task to feed
    expect(swarm._feedEntries).toHaveLength(1);
    expect(swarm._feedEntries[0].type).toBe('directive');
    expect(swarm._feedEntries[0].content).toBe('Build a REST API');
  });

  test('onSwarmTurnEnd writes directive to feed', async () => {
    const swarm = createMockSwarmContext('navigator');
    await hooks.onSwarmTurnEnd.handler({
      swarm,
      agentOutput: 'Create Express scaffold in src/server.ts with health check.',
    });

    expect(swarm._feedEntries).toHaveLength(1);
    expect(swarm._feedEntries[0].to).toBe('driver');
    expect(swarm._feedEntries[0].type).toBe('directive');
  });

  test('onSwarmTurnEnd detects <done/> signal', async () => {
    const swarm = createMockSwarmContext('navigator');
    const result = await hooks.onSwarmTurnEnd.handler({
      swarm,
      agentOutput: 'All work is verified. <done />',
    });

    expect(swarm._feedEntries).toHaveLength(1);
    expect(swarm._feedEntries[0].type).toBe('done');
    expect(result.done).toBe(true);
  });

  test('onSwarmFeedMessage queues driver report for navigator', async () => {
    const swarm = createMockSwarmContext('navigator');
    const result = await hooks.onSwarmFeedMessage.handler({
      swarm,
      feedEntries: [
        {
          id: 'f-3',
          seq: 3,
          from: 'driver',
          to: 'navigator',
          type: 'action',
          content: 'Created server.ts',
          ts: new Date().toISOString(),
        },
      ],
    });

    expect(result.queueMessages).toHaveLength(1);
    expect(result.queueMessages[0].content).toContain('Driver reports');
  });
});

describe('Cross-backend swarm hooks', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const driverHooks = require('../../../assistant/dual-claude/swarm/driver/hooks/driver-hooks.js');

  test('hooks work with different agentBackend values', async () => {
    const codexSwarm = createMockSwarmContext('driver', { agentBackend: 'codex' });
    const result = await driverHooks.onSwarmInit.handler({
      swarm: codexSwarm,
      content: 'Build REST API',
    });

    expect(result.queueMessages[0].content).toContain('codex');
  });
});
