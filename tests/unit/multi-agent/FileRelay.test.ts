import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FileRelay } from '../../../src/agent/multi-agent/FileRelay';
import type { FeedEntry } from '../../../src/agent/multi-agent/FileRelay';

describe('FileRelay', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'filerelay-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function readFeed(rootDir: string): FeedEntry[] {
    const raw = fs.readFileSync(path.join(rootDir, 'feed.jsonl'), 'utf-8').trim();
    if (!raw) return [];
    return raw.split('\n').map((line) => JSON.parse(line));
  }

  it('should create directory structure on start', () => {
    const relay = new FileRelay(tmpDir, 'run-1');
    relay.start(['driver', 'navigator']);

    const rootDir = relay.getRootDir();
    expect(fs.existsSync(rootDir)).toBe(true);
    expect(fs.existsSync(path.join(rootDir, 'driver', 'inbox'))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, 'driver', 'outbox'))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, 'navigator', 'inbox'))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, 'navigator', 'outbox'))).toBe(true);

    relay.stop();
  });

  it('should write inbox files with turn and sender info', () => {
    const relay = new FileRelay(tmpDir, 'run-2');
    relay.start(['driver', 'navigator']);

    const filePath = relay.writeInbox('navigator', 1, 'driver', 'Please implement feature X');

    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Please implement feature X');
    expect(content).toContain('from: driver');
    expect(content).toContain('to: navigator');
    expect(content).toContain('turn: 1');

    // Filename should encode turn and sender
    expect(path.basename(filePath)).toBe('001_from_driver.md');

    relay.stop();
  });

  it('should write outbox files with turn number', () => {
    const relay = new FileRelay(tmpDir, 'run-3');
    relay.start(['driver']);

    const filePath = relay.writeOutbox('driver', 2, 'I have completed the task.');

    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toBe('I have completed the task.');
    expect(path.basename(filePath)).toBe('002.md');

    relay.stop();
  });

  it('should write initial prompt files', () => {
    const relay = new FileRelay(tmpDir, 'run-4');
    relay.start(['driver']);

    const filePath = relay.writeInitialPrompt('driver', 'You are the driver agent...');

    expect(fs.existsSync(filePath)).toBe(true);
    expect(path.basename(filePath)).toBe('initial_prompt.md');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toBe('You are the driver agent...');

    relay.stop();
  });

  it('should append entries to feed.jsonl', () => {
    const relay = new FileRelay(tmpDir, 'run-5');
    relay.start(['driver', 'navigator']);

    relay.writeInbox('navigator', 1, 'driver', 'Hello');
    relay.writeOutbox('driver', 1, 'World');
    relay.writeInitialPrompt('driver', 'Init...');

    relay.stop();

    const entries = readFeed(relay.getRootDir());
    // relay:start + inbox + outbox + initial_prompt + relay:stop = 5
    expect(entries.length).toBe(5);

    expect(entries[0].type).toBe('relay:start');
    expect(entries[1].type).toBe('inbox');
    expect(entries[1].nodeId).toBe('navigator');
    expect(entries[1].from).toBe('driver');
    expect(entries[2].type).toBe('outbox');
    expect(entries[2].nodeId).toBe('driver');
    expect(entries[3].type).toBe('initial_prompt');
    expect(entries[4].type).toBe('relay:stop');
  });

  it('should assign monotonic sequence numbers in feed', () => {
    const relay = new FileRelay(tmpDir, 'run-6');
    relay.start(['a', 'b']);

    relay.writeInbox('a', 1, 'b', 'msg1');
    relay.writeOutbox('b', 1, 'msg2');

    relay.stop();

    const entries = readFeed(relay.getRootDir());
    expect(entries.map((e) => e.seq)).toEqual([0, 1, 2, 3]);
  });

  it('should write summary.json', () => {
    const relay = new FileRelay(tmpDir, 'run-7');
    relay.start(['driver']);

    relay.writeSummary({
      status: 'completed',
      totalTurns: 5,
      taskCompleted: true,
      duration: 12345,
    });

    relay.stop();

    const summaryPath = path.join(relay.getRootDir(), 'summary.json');
    expect(fs.existsSync(summaryPath)).toBe(true);
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
    expect(summary.status).toBe('completed');
    expect(summary.totalTurns).toBe(5);
  });

  it('should sanitize runId in directory path', () => {
    const relay = new FileRelay(tmpDir, 'run/with:bad<chars>');
    relay.start([]);
    expect(relay.getRootDir()).not.toContain(':');
    expect(relay.getRootDir()).not.toContain('<');
    relay.stop();
  });

  it('should handle multiple turns correctly', () => {
    const relay = new FileRelay(tmpDir, 'run-8');
    relay.start(['driver', 'navigator']);

    // Turn 1: driver → navigator
    relay.writeOutbox('driver', 1, 'I suggest approach A');
    relay.writeInbox('navigator', 1, 'driver', 'I suggest approach A');

    // Turn 2: navigator → driver
    relay.writeOutbox('navigator', 2, 'I agree, implementing now');
    relay.writeInbox('driver', 2, 'navigator', 'I agree, implementing now');

    // Turn 3: driver → navigator
    relay.writeOutbox('driver', 3, 'Done! <multi-agent>DONE</multi-agent>');
    relay.writeInbox('navigator', 3, 'driver', 'Done!');

    relay.stop();

    // Check file counts
    const driverInbox = fs.readdirSync(path.join(relay.getRootDir(), 'driver', 'inbox'));
    const driverOutbox = fs.readdirSync(path.join(relay.getRootDir(), 'driver', 'outbox'));
    const navInbox = fs.readdirSync(path.join(relay.getRootDir(), 'navigator', 'inbox'));
    const navOutbox = fs.readdirSync(path.join(relay.getRootDir(), 'navigator', 'outbox'));

    expect(driverInbox.length).toBe(1); // turn 2 from navigator
    expect(driverOutbox.length).toBe(2); // turns 1 and 3
    expect(navInbox.length).toBe(2); // turns 1 and 3 from driver
    expect(navOutbox.length).toBe(1); // turn 2
  });

  it('should not throw after stop', () => {
    const relay = new FileRelay(tmpDir, 'run-9');
    relay.start(['driver']);
    relay.stop();

    // Should silently no-op
    expect(() => relay.appendFeed({ type: 'test' })).not.toThrow();
  });
});
