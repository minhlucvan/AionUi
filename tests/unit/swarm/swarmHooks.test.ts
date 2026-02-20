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

describe('Driver hooks — output parsing', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const hooks = require('../../../assistant/dual-claude/swarm/driver/hooks/driver-hooks.js');

  test('onSwarmInit returns clean task seed (no feed/workflow details)', async () => {
    const swarm = createMockSwarmContext('driver');
    const result = await hooks.onSwarmInit.handler({
      swarm,
      content: 'Build a REST API',
    });
    expect(result.queueMessages).toHaveLength(1);
    const msg = result.queueMessages[0].content;
    expect(msg).toContain('Build a REST API');
    // Should NOT mention feed internals
    expect(msg).not.toContain('feed.jsonl');
    expect(msg).not.toContain('.swarm');
  });

  test('onSwarmTurnEnd parses <report> tag and writes to feed', async () => {
    const swarm = createMockSwarmContext('driver');
    const result = await hooks.onSwarmTurnEnd.handler({
      swarm,
      agentOutput: 'Some thinking...\n\n<report>\nCreated src/server.ts with Express setup and health endpoint.\nRan tests — all passing.\n</report>',
    });

    expect(swarm._feedEntries).toHaveLength(1);
    expect(swarm._feedEntries[0].to).toBe('navigator');
    expect(swarm._feedEntries[0].type).toBe('action');
    expect(swarm._feedEntries[0].content).toContain('Created src/server.ts');
    expect(swarm._feedEntries[0].content).not.toContain('Some thinking');
    expect(result.done).toBeUndefined();
  });

  test('onSwarmTurnEnd parses <files> tag into feed entry', async () => {
    const swarm = createMockSwarmContext('driver');
    await hooks.onSwarmTurnEnd.handler({
      swarm,
      agentOutput: '<report>\nAdded auth middleware.\n</report>\n<files>\nsrc/middleware/auth.ts\nsrc/server.ts\n</files>',
    });

    expect(swarm._feedEntries[0].files).toEqual(['src/middleware/auth.ts', 'src/server.ts']);
  });

  test('onSwarmTurnEnd parses <blocker> tag and sets blocker type', async () => {
    const swarm = createMockSwarmContext('driver');
    await hooks.onSwarmTurnEnd.handler({
      swarm,
      agentOutput: '<report>\nTried to run tests.\n</report>\n<blocker>\nCannot find the test config file. Need Navigator to clarify test setup.\n</blocker>',
    });

    expect(swarm._feedEntries[0].type).toBe('blocker');
    expect(swarm._feedEntries[0].content).toContain('Blocker');
    expect(swarm._feedEntries[0].content).toContain('Cannot find the test config');
  });

  test('onSwarmTurnEnd detects <done> with content', async () => {
    const swarm = createMockSwarmContext('driver');
    const result = await hooks.onSwarmTurnEnd.handler({
      swarm,
      agentOutput: '<done>\nREST API implemented with auth, tests passing, all endpoints verified.\n</done>',
    });

    expect(swarm._feedEntries).toHaveLength(1);
    expect(swarm._feedEntries[0].type).toBe('done');
    expect(swarm._feedEntries[0].content).toContain('REST API implemented');
    expect(result.done).toBe(true);
  });

  test('onSwarmTurnEnd detects self-closing <done/>', async () => {
    const swarm = createMockSwarmContext('driver');
    const result = await hooks.onSwarmTurnEnd.handler({
      swarm,
      agentOutput: 'All complete! <done/>',
    });

    expect(result.done).toBe(true);
    expect(swarm._feedEntries[0].type).toBe('done');
  });

  test('onSwarmTurnEnd falls back to raw output when no tags found', async () => {
    const swarm = createMockSwarmContext('driver');
    await hooks.onSwarmTurnEnd.handler({
      swarm,
      agentOutput: 'I created the file and ran the tests. Everything works.',
    });

    expect(swarm._feedEntries[0].type).toBe('action');
    expect(swarm._feedEntries[0].content).toBe('I created the file and ran the tests. Everything works.');
  });

  test('onSwarmFeedMessage builds directive message from feed entry', async () => {
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
          content: 'Create auth middleware in src/middleware/auth.ts',
          ts: new Date().toISOString(),
        },
      ],
    });

    expect(result.queueMessages).toHaveLength(1);
    expect(result.queueMessages[0].content).toContain('Navigator directive');
    expect(result.queueMessages[0].content).toContain('Create auth middleware');
  });

  test('onSwarmFeedMessage builds review message from feed entry', async () => {
    const swarm = createMockSwarmContext('driver');
    const result = await hooks.onSwarmFeedMessage.handler({
      swarm,
      feedEntries: [
        {
          id: 'f-1',
          seq: 2,
          from: 'navigator',
          to: 'driver',
          type: 'review',
          content: 'Looks good but missing error handling on the /login endpoint.',
          ts: new Date().toISOString(),
        },
      ],
    });

    expect(result.queueMessages[0].content).toContain('Navigator review');
    expect(result.queueMessages[0].content).toContain('missing error handling');
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

describe('Navigator hooks — output parsing', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const hooks = require('../../../assistant/dual-claude/swarm/navigator/hooks/navigator-hooks.js');

  test('onSwarmInit seeds feed and returns clean task message', async () => {
    const swarm = createMockSwarmContext('navigator');
    const result = await hooks.onSwarmInit.handler({
      swarm,
      content: 'Build a REST API',
    });

    expect(result.queueMessages).toHaveLength(1);
    const msg = result.queueMessages[0].content;
    expect(msg).toContain('Build a REST API');
    expect(msg).not.toContain('feed.jsonl');

    // Navigator seeds the feed with the user task
    expect(swarm._feedEntries).toHaveLength(1);
    expect(swarm._feedEntries[0].type).toBe('directive');
    expect(swarm._feedEntries[0].content).toBe('Build a REST API');
  });

  test('onSwarmTurnEnd parses <directive> tag and writes to feed', async () => {
    const swarm = createMockSwarmContext('navigator');
    await hooks.onSwarmTurnEnd.handler({
      swarm,
      agentOutput: 'Let me think about the approach...\n\n<directive>\nCreate src/server.ts with Express scaffold, health endpoint on GET /health, listen on port 3000.\n</directive>',
    });

    expect(swarm._feedEntries).toHaveLength(1);
    expect(swarm._feedEntries[0].to).toBe('driver');
    expect(swarm._feedEntries[0].type).toBe('directive');
    expect(swarm._feedEntries[0].content).toContain('Create src/server.ts');
    expect(swarm._feedEntries[0].content).not.toContain('Let me think');
  });

  test('onSwarmTurnEnd parses <review> + <directive> combo', async () => {
    const swarm = createMockSwarmContext('navigator');
    await hooks.onSwarmTurnEnd.handler({
      swarm,
      agentOutput: '<review>\nThe server scaffold looks good. Health endpoint returns 200.\n</review>\n\n<directive>\nNow add JWT auth middleware in src/middleware/auth.ts.\n</directive>',
    });

    expect(swarm._feedEntries).toHaveLength(2);
    expect(swarm._feedEntries[0].type).toBe('review');
    expect(swarm._feedEntries[0].content).toContain('scaffold looks good');
    expect(swarm._feedEntries[1].type).toBe('directive');
    expect(swarm._feedEntries[1].content).toContain('JWT auth middleware');
  });

  test('onSwarmTurnEnd falls back to raw output as directive when no tags', async () => {
    const swarm = createMockSwarmContext('navigator');
    await hooks.onSwarmTurnEnd.handler({
      swarm,
      agentOutput: 'Please create the database schema in src/db/schema.ts with users and sessions tables.',
    });

    expect(swarm._feedEntries).toHaveLength(1);
    expect(swarm._feedEntries[0].type).toBe('directive');
    expect(swarm._feedEntries[0].content).toContain('database schema');
  });

  test('onSwarmTurnEnd detects <done> signal', async () => {
    const swarm = createMockSwarmContext('navigator');
    const result = await hooks.onSwarmTurnEnd.handler({
      swarm,
      agentOutput: '<done>\nAll endpoints implemented and tested. Code quality is good.\n</done>',
    });

    expect(result.done).toBe(true);
    expect(swarm._feedEntries[0].type).toBe('done');
    expect(swarm._feedEntries[0].content).toContain('All endpoints implemented');
  });

  test('onSwarmFeedMessage builds report message with file list', async () => {
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
          content: 'Created Express server with health endpoint.',
          files: ['src/server.ts', 'package.json'],
          ts: new Date().toISOString(),
        },
      ],
    });

    expect(result.queueMessages).toHaveLength(1);
    const msg = result.queueMessages[0].content;
    expect(msg).toContain('Driver report');
    expect(msg).toContain('Created Express server');
    expect(msg).toContain('src/server.ts');
    expect(msg).toContain('package.json');
  });

  test('onSwarmFeedMessage shows blocker header for blocker type', async () => {
    const swarm = createMockSwarmContext('navigator');
    const result = await hooks.onSwarmFeedMessage.handler({
      swarm,
      feedEntries: [
        {
          id: 'f-4',
          seq: 4,
          from: 'driver',
          to: 'navigator',
          type: 'blocker',
          content: 'Cannot find test config. Need help.',
          ts: new Date().toISOString(),
        },
      ],
    });

    expect(result.queueMessages[0].content).toContain('Driver is blocked');
  });
});

describe('Cross-backend output parsing', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const driverHooks = require('../../../assistant/dual-claude/swarm/driver/hooks/driver-hooks.js');

  test('init seed does not leak backend-specific internals', async () => {
    const codexSwarm = createMockSwarmContext('driver', { agentBackend: 'codex' });
    const result = await driverHooks.onSwarmInit.handler({
      swarm: codexSwarm,
      content: 'Build REST API',
    });

    const msg = result.queueMessages[0].content;
    // Seed message is agent-agnostic — no backend mention
    expect(msg).toContain('Build REST API');
    expect(msg).not.toContain('.swarm');
  });
});
