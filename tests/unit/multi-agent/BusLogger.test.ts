import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AgentBus } from '../../../src/agent/multi-agent/AgentBus';
import { BusLogger } from '../../../src/agent/multi-agent/BusLogger';
import type { LogEntry } from '../../../src/agent/multi-agent/BusLogger';
import type { TopologyConfig } from '../../../src/agent/multi-agent/types';

describe('BusLogger', () => {
  let tmpDir: string;
  let bus: AgentBus;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'buslogger-'));
    bus = new AgentBus();
  });

  afterEach(() => {
    bus.reset();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function readLines(filePath: string): LogEntry[] {
    const raw = fs.readFileSync(filePath, 'utf-8').trim();
    if (!raw) return [];
    return raw.split('\n').map((line) => JSON.parse(line));
  }

  it('should create the log file on start', () => {
    const logger = new BusLogger('run-1', bus, tmpDir);
    logger.start();
    expect(fs.existsSync(logger.getFilePath())).toBe(true);
    logger.stop();
  });

  it('should capture bus events as jsonl lines', () => {
    const logger = new BusLogger('run-2', bus, tmpDir);
    logger.start();

    bus.publish({
      id: 'msg-1',
      from: 'driver',
      content: 'Hello navigator',
      timestamp: Date.now(),
    });

    bus.delivered({ id: 'msg-1', from: 'driver', to: 'navigator', content: 'Hello navigator', timestamp: Date.now() }, 'navigator');

    bus.error('navigator', 'Something went wrong');
    bus.complete({ totalTurns: 5 });

    logger.stop();

    const lines = readLines(logger.getFilePath());
    expect(lines.length).toBe(4);

    expect(lines[0].event).toBe('bus:event');
    expect(lines[0].busEventType).toBe('agent:response');
    expect(lines[0].messageFrom).toBe('driver');

    expect(lines[1].event).toBe('bus:event');
    expect(lines[1].busEventType).toBe('agent:delivered');
    expect(lines[1].nodeId).toBe('navigator');

    expect(lines[2].event).toBe('bus:event');
    expect(lines[2].busEventType).toBe('agent:error');
    expect(lines[2].nodeId).toBe('navigator');

    expect(lines[3].event).toBe('bus:event');
    expect(lines[3].busEventType).toBe('bus:complete');
  });

  it('should assign monotonic sequence numbers', () => {
    const logger = new BusLogger('run-3', bus, tmpDir);
    logger.start();

    logger.logEvent('orchestrator:start', { test: true });
    logger.logEvent('orchestrator:stop', { test: true });

    bus.publish({ id: 'msg-1', from: 'a', content: 'x', timestamp: Date.now() });

    logger.stop();

    const lines = readLines(logger.getFilePath());
    expect(lines.map((l) => l.seq)).toEqual([0, 1, 2]);
  });

  it('should log orchestrator lifecycle events', () => {
    const logger = new BusLogger('run-4', bus, tmpDir);
    logger.start();

    const topo: TopologyConfig = {
      type: 'pair',
      nodes: [
        { id: 'driver', role: 'driver', backend: 'claude' as never },
        { id: 'navigator', role: 'navigator', backend: 'claude' as never },
      ],
    };

    logger.logStart(topo, { task: 'build feature', maxTurns: 10 });
    logger.logNodeCreated('driver', 'driver', 'claude', 'conv-1');
    logger.logNodeCreated('navigator', 'navigator', 'claude', 'conv-2');
    logger.logInitialPrompt('driver', 'You are the driver...', true);
    logger.logRoute(1, 'driver', ['navigator'], 100);
    logger.logCompletion(3, 'navigator');
    logger.logFinish({ status: 'completed', totalTurns: 3, duration: 5000 });

    logger.stop();

    const lines = readLines(logger.getFilePath());
    expect(lines.length).toBe(7);

    expect(lines[0].event).toBe('orchestrator:start');
    expect(lines[0].topologyType).toBe('pair');
    expect(lines[0].nodeCount).toBe(2);

    expect(lines[1].event).toBe('orchestrator:node_created');
    expect(lines[1].nodeId).toBe('driver');

    expect(lines[2].event).toBe('orchestrator:node_created');
    expect(lines[2].nodeId).toBe('navigator');

    expect(lines[3].event).toBe('orchestrator:initial_prompt');
    expect(lines[3].isStarter).toBe(true);

    expect(lines[4].event).toBe('orchestrator:route');
    expect(lines[4].turn).toBe(1);
    expect(lines[4].targets).toEqual(['navigator']);

    expect(lines[5].event).toBe('orchestrator:completion');
    expect(lines[5].turn).toBe(3);

    expect(lines[6].event).toBe('orchestrator:finish');
    expect(lines[6].status).toBe('completed');
  });

  it('should truncate long message content', () => {
    const logger = new BusLogger('run-5', bus, tmpDir);
    logger.start();

    const longContent = 'A'.repeat(5000);
    bus.publish({ id: 'msg-1', from: 'driver', content: longContent, timestamp: Date.now() });

    logger.stop();

    const lines = readLines(logger.getFilePath());
    expect(lines[0].messageContent).toContain('... [truncated, 5000 chars total]');
    expect((lines[0].messageContent as string).length).toBeLessThan(2100);
  });

  it('should work without a bus (manual logging only)', () => {
    const logger = new BusLogger('run-6', null, tmpDir);
    logger.start();

    logger.logEvent('orchestrator:start', { test: true });
    logger.logError('something failed', { nodeId: 'driver' });

    logger.stop();

    const lines = readLines(logger.getFilePath());
    expect(lines.length).toBe(2);
    expect(lines[0].event).toBe('orchestrator:start');
    expect(lines[1].event).toBe('orchestrator:error');
    expect(lines[1].error).toBe('something failed');
  });

  it('should include ISO timestamps', () => {
    const logger = new BusLogger('run-7', bus, tmpDir);
    logger.start();

    logger.logEvent('orchestrator:start', {});

    logger.stop();

    const lines = readLines(logger.getFilePath());
    // ISO format: 2026-02-19T12:34:56.789Z
    expect(lines[0].ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('should sanitize runId in filename', () => {
    const logger = new BusLogger('run/with:special<chars>', bus, tmpDir);
    logger.start();
    expect(logger.getFilePath()).not.toContain('/with:');
    expect(logger.getFilePath()).not.toContain('<');
    logger.stop();
  });

  it('should not throw when writing after stop', () => {
    const logger = new BusLogger('run-8', bus, tmpDir);
    logger.start();
    logger.stop();

    // Should silently no-op
    expect(() => logger.logEvent('orchestrator:start', {})).not.toThrow();
  });

  it('should interleave bus events and manual events in correct order', () => {
    const logger = new BusLogger('run-9', bus, tmpDir);
    logger.start();

    logger.logEvent('orchestrator:start', {});
    bus.publish({ id: 'msg-1', from: 'driver', content: 'hi', timestamp: Date.now() });
    logger.logRoute(1, 'driver', ['navigator'], 2);
    bus.delivered({ id: 'msg-1', from: 'driver', to: 'navigator', content: 'hi', timestamp: Date.now() }, 'navigator');
    logger.logCompletion(1, 'navigator');

    logger.stop();

    const lines = readLines(logger.getFilePath());
    const events = lines.map((l) => (l.event === 'bus:event' ? l.busEventType : l.event));
    expect(events).toEqual(['orchestrator:start', 'agent:response', 'orchestrator:route', 'agent:delivered', 'orchestrator:completion']);
  });
});
