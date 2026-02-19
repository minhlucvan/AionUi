import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { NodeHookRunner } from '../../../src/agent/multi-agent/NodeHookRunner';
import type { NodeHookRunnerConfig } from '../../../src/agent/multi-agent/NodeHookRunner';

describe('NodeHookRunner', () => {
  let tmpDir: string;
  let hooksDir: string;
  let relayDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodehooks-'));
    hooksDir = path.join(tmpDir, 'hooks');
    relayDir = path.join(tmpDir, 'relay');
    fs.mkdirSync(hooksDir, { recursive: true });
    fs.mkdirSync(path.join(relayDir, 'driver', 'inbox'), { recursive: true });
    fs.mkdirSync(path.join(relayDir, 'driver', 'outbox'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function makeConfig(overrides?: Partial<NodeHookRunnerConfig>): NodeHookRunnerConfig {
    return {
      hooksPath: hooksDir,
      nodeId: 'driver',
      role: 'driver',
      workspace: tmpDir,
      relayDir,
      topologyType: 'pair',
      maxTurns: 10,
      ...overrides,
    };
  }

  function writeHook(filename: string, code: string): void {
    fs.writeFileSync(path.join(hooksDir, filename), code);
  }

  it('should report no hooks when directory is empty', () => {
    const runner = new NodeHookRunner(makeConfig());
    expect(runner.hasHooks()).toBe(false);
  });

  it('should load hooks from .js files', () => {
    writeHook(
      'test.js',
      `
      module.exports = {
        onNodeInit: (ctx) => ({ content: 'initialized' }),
      };
    `
    );

    const runner = new NodeHookRunner(makeConfig());
    expect(runner.hasHooks()).toBe(true);
  });

  it('should run onNodeInit hooks', async () => {
    writeHook(
      'init.js',
      `
      module.exports = {
        onNodeInit: async (ctx) => ({
          queueMessages: [{ content: '/setup workspace', priority: 'high' }],
        }),
      };
    `
    );

    const runner = new NodeHookRunner(makeConfig());
    const result = await runner.run('onNodeInit');

    expect(result.queueMessages).toHaveLength(1);
    expect(result.queueMessages![0].content).toBe('/setup workspace');
    expect(result.queueMessages![0].priority).toBe('high');
  });

  it('should run onNodeResponse hooks with content', async () => {
    writeHook(
      'response.js',
      `
      module.exports = {
        onNodeResponse: async (ctx) => {
          if (ctx.content && ctx.content.includes('DONE')) {
            return { complete: true };
          }
          return {
            queueMessages: [{ content: '/continue' }],
          };
        },
      };
    `
    );

    const runner = new NodeHookRunner(makeConfig());

    // Not done yet
    const result1 = await runner.run('onNodeResponse', { turn: 1, content: 'Still working...' });
    expect(result1.complete).toBeUndefined();
    expect(result1.queueMessages).toHaveLength(1);

    // Now done
    const result2 = await runner.run('onNodeResponse', { turn: 2, content: 'All DONE!' });
    expect(result2.complete).toBe(true);
  });

  it('should run onNodeReceive hooks and allow blocking', async () => {
    writeHook(
      'filter.js',
      `
      module.exports = {
        onNodeReceive: (ctx) => {
          // Block messages from 'spammer'
          if (ctx.from === 'spammer') {
            return { blocked: true };
          }
          // Prepend context for other messages
          return {
            content: '[Context: you are a reviewer]\\n' + ctx.content,
          };
        },
      };
    `
    );

    const runner = new NodeHookRunner(makeConfig());

    // Blocked
    const blocked = await runner.run('onNodeReceive', { turn: 1, content: 'spam', from: 'spammer' });
    expect(blocked.blocked).toBe(true);

    // Transformed
    const ok = await runner.run('onNodeReceive', { turn: 1, content: 'Please review', from: 'coder' });
    expect(ok.blocked).toBeUndefined();
    expect(ok.content).toContain('[Context: you are a reviewer]');
    expect(ok.content).toContain('Please review');
  });

  it('should run onNodeComplete hooks', async () => {
    writeHook(
      'complete.js',
      `
      module.exports = {
        onNodeComplete: async (ctx) => {
          return {
            busMessages: [{ to: 'navigator', content: 'I am done' }],
          };
        },
      };
    `
    );

    const runner = new NodeHookRunner(makeConfig());
    const result = await runner.run('onNodeComplete', { turn: 5 });

    expect(result.busMessages).toHaveLength(1);
    expect(result.busMessages![0].to).toBe('navigator');
    expect(result.busMessages![0].content).toBe('I am done');
  });

  it('should provide correct context to hooks', async () => {
    let capturedContext: any = null;

    writeHook(
      'context.js',
      `
      module.exports = {
        onNodeResponse: (ctx) => {
          // Write context to a temp file so we can verify
          const fs = require('fs');
          const path = require('path');
          fs.writeFileSync(
            path.join(ctx.workspace, 'captured-context.json'),
            JSON.stringify({
              event: ctx.event,
              nodeId: ctx.nodeId,
              role: ctx.role,
              turn: ctx.turn,
              maxTurns: ctx.maxTurns,
              topologyType: ctx.topologyType,
              workspace: ctx.workspace,
              relayDir: ctx.relayDir,
              feedPath: ctx.feedPath,
              inboxDir: ctx.inboxDir,
              outboxDir: ctx.outboxDir,
              hasUtils: !!ctx.utils,
              hasReadFile: typeof ctx.utils.readFile === 'function',
              hasWriteFile: typeof ctx.utils.writeFile === 'function',
              hasExists: typeof ctx.utils.exists === 'function',
              hasEnsureDir: typeof ctx.utils.ensureDir === 'function',
              hasJoin: typeof ctx.utils.join === 'function',
              hasReadFeed: typeof ctx.utils.readFeed === 'function',
            })
          );
          return {};
        },
      };
    `
    );

    const config = makeConfig();
    const runner = new NodeHookRunner(config);
    await runner.run('onNodeResponse', { turn: 3, content: 'test' });

    const contextPath = path.join(tmpDir, 'captured-context.json');
    expect(fs.existsSync(contextPath)).toBe(true);
    capturedContext = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));

    expect(capturedContext.event).toBe('onNodeResponse');
    expect(capturedContext.nodeId).toBe('driver');
    expect(capturedContext.role).toBe('driver');
    expect(capturedContext.turn).toBe(3);
    expect(capturedContext.maxTurns).toBe(10);
    expect(capturedContext.topologyType).toBe('pair');
    expect(capturedContext.workspace).toBe(tmpDir);
    expect(capturedContext.relayDir).toBe(relayDir);
    expect(capturedContext.feedPath).toBe(path.join(relayDir, 'feed.jsonl'));
    expect(capturedContext.inboxDir).toBe(path.join(relayDir, 'driver', 'inbox'));
    expect(capturedContext.outboxDir).toBe(path.join(relayDir, 'driver', 'outbox'));
    expect(capturedContext.hasUtils).toBe(true);
    expect(capturedContext.hasReadFile).toBe(true);
    expect(capturedContext.hasWriteFile).toBe(true);
    expect(capturedContext.hasExists).toBe(true);
    expect(capturedContext.hasEnsureDir).toBe(true);
    expect(capturedContext.hasJoin).toBe(true);
    expect(capturedContext.hasReadFeed).toBe(true);
  });

  it('should accumulate queue and bus messages from multiple hooks', async () => {
    writeHook(
      'a-hook.js',
      `
      module.exports = {
        onNodeResponse: () => ({
          queueMessages: [{ content: 'msg-a' }],
          busMessages: [{ to: 'navigator', content: 'bus-a' }],
        }),
      };
    `
    );
    writeHook(
      'b-hook.js',
      `
      module.exports = {
        onNodeResponse: () => ({
          queueMessages: [{ content: 'msg-b' }],
          busMessages: [{ to: 'reviewer', content: 'bus-b' }],
        }),
      };
    `
    );

    const runner = new NodeHookRunner(makeConfig());
    const result = await runner.run('onNodeResponse', { turn: 1, content: 'test' });

    expect(result.queueMessages).toHaveLength(2);
    expect(result.queueMessages!.map((m) => m.content).sort()).toEqual(['msg-a', 'msg-b']);
    expect(result.busMessages).toHaveLength(2);
    expect(result.busMessages!.map((m) => m.to).sort()).toEqual(['navigator', 'reviewer']);
  });

  it('should execute hooks in priority order', async () => {
    writeHook(
      'hooks.js',
      `
      module.exports = {
        onNodeResponse: {
          handler: (ctx) => ({
            content: (ctx.content || '') + ' [low]',
          }),
          priority: 90,
        },
      };
    `
    );
    writeHook(
      'high.js',
      `
      module.exports = {
        onNodeResponse: {
          handler: (ctx) => ({
            content: (ctx.content || '') + ' [high]',
          }),
          priority: 10,
        },
      };
    `
    );

    const runner = new NodeHookRunner(makeConfig());
    const result = await runner.run('onNodeResponse', { turn: 1, content: 'start' });

    // High priority runs first, then low
    expect(result.content).toBe('start [high] [low]');
  });

  it('should provide readFeed utility that reads feed.jsonl', async () => {
    // Write some feed entries
    const feedPath = path.join(relayDir, 'feed.jsonl');
    fs.writeFileSync(feedPath, '{"type":"relay:start","seq":0}\n{"type":"outbox","nodeId":"driver","seq":1}\n');

    writeHook(
      'feed-reader.js',
      `
      module.exports = {
        onNodeResponse: async (ctx) => {
          const feed = await ctx.utils.readFeed();
          const fs = require('fs');
          const path = require('path');
          fs.writeFileSync(path.join(ctx.workspace, 'feed-count.txt'), String(feed.length));
          return {};
        },
      };
    `
    );

    const runner = new NodeHookRunner(makeConfig());
    await runner.run('onNodeResponse', { turn: 1, content: 'test' });

    const count = fs.readFileSync(path.join(tmpDir, 'feed-count.txt'), 'utf-8');
    expect(count).toBe('2');
  });

  it('should handle hook errors gracefully without crashing', async () => {
    writeHook(
      'bad.js',
      `
      module.exports = {
        onNodeResponse: () => {
          throw new Error('hook crashed!');
        },
      };
    `
    );
    writeHook(
      'good.js',
      `
      module.exports = {
        onNodeResponse: () => ({
          queueMessages: [{ content: 'still works' }],
        }),
      };
    `
    );

    const runner = new NodeHookRunner(makeConfig());
    const result = await runner.run('onNodeResponse', { turn: 1, content: 'test' });

    // Good hook still ran
    expect(result.queueMessages).toHaveLength(1);
    expect(result.queueMessages![0].content).toBe('still works');
  });

  it('should return empty result when hooks directory does not exist', async () => {
    const runner = new NodeHookRunner(makeConfig({ hooksPath: '/nonexistent/path' }));
    expect(runner.hasHooks()).toBe(false);

    const result = await runner.run('onNodeResponse', { turn: 1, content: 'test' });
    expect(result).toEqual({});
  });

  it('should support file-based state machine pattern (like Ralph)', async () => {
    // Simulate the ralph pattern: check for state files and queue next actions
    writeHook(
      'state-machine.js',
      `
      const fs = require('fs');
      const path = require('path');

      module.exports = {
        onNodeResponse: async (ctx) => {
          const stateDir = path.join(ctx.workspace, '.state');
          const phase1 = path.join(stateDir, 'phase1.done');
          const phase2 = path.join(stateDir, 'phase2.done');

          if (!fs.existsSync(stateDir)) {
            fs.mkdirSync(stateDir, { recursive: true });
          }

          // Phase 1: first response triggers phase2
          if (!fs.existsSync(phase1)) {
            fs.writeFileSync(phase1, 'done');
            return {
              queueMessages: [{ content: '/run-phase2' }],
            };
          }

          // Phase 2: second response triggers completion
          if (!fs.existsSync(phase2)) {
            fs.writeFileSync(phase2, 'done');
            return { complete: true };
          }

          return {};
        },
      };
    `
    );

    const runner = new NodeHookRunner(makeConfig());

    // First call — phase1
    const r1 = await runner.run('onNodeResponse', { turn: 1, content: 'phase 1 output' });
    expect(r1.queueMessages).toHaveLength(1);
    expect(r1.queueMessages![0].content).toBe('/run-phase2');
    expect(r1.complete).toBeUndefined();

    // Second call — phase2
    const r2 = await runner.run('onNodeResponse', { turn: 2, content: 'phase 2 output' });
    expect(r2.complete).toBe(true);
    expect(r2.queueMessages).toBeUndefined();
  });
});
