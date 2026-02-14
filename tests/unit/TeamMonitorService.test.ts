/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// We need to test TeamMonitorService which reads from the filesystem.
// We'll create a real temp directory structure to test against.

import { TeamMonitorService } from '@/process/services/teamMonitor/TeamMonitorService';
import type { TeamMonitorEvent } from '@/common/teamMonitor';

describe('TeamMonitorService', () => {
  let service: TeamMonitorService;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'team-monitor-test-'));
    // Override CLAUDE_CONFIG_DIR so the service reads from our temp dir
    process.env.CLAUDE_CONFIG_DIR = tmpDir;
    service = new TeamMonitorService();
  });

  afterEach(() => {
    service.stop();
    delete process.env.CLAUDE_CONFIG_DIR;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ── Basic lifecycle ──

  describe('lifecycle', () => {
    it('should start and report active', () => {
      service.start('conv-1', 'my-team');
      expect(service.isActive()).toBe(true);
      expect(service.getTeamName()).toBe('my-team');
    });

    it('should stop and reset state', () => {
      service.start('conv-1', 'my-team');
      service.stop();
      expect(service.isActive()).toBe(false);
      expect(service.getTeamName()).toBeNull();
    });

    it('should stop previous session when start is called again', () => {
      service.start('conv-1', 'team-a');
      service.start('conv-2', 'team-b');
      expect(service.isActive()).toBe(true);
      expect(service.getTeamName()).toBe('team-b');
    });
  });

  // ── Team config parsing ──

  describe('readTeamConfig', () => {
    it('should parse team config with members', () => {
      const teamDir = path.join(tmpDir, 'teams', 'my-team');
      fs.mkdirSync(teamDir, { recursive: true });
      fs.writeFileSync(
        path.join(teamDir, 'config.json'),
        JSON.stringify({
          members: [
            { name: 'Lead', role: 'lead', agentId: 'a1' },
            { name: 'Dev', role: 'member', agentId: 'a2' },
          ],
        })
      );

      const members = service.readTeamConfig('my-team');
      expect(members).toHaveLength(2);
      expect(members[0]).toMatchObject({ name: 'Lead', role: 'lead', agentId: 'a1', status: 'active' });
      expect(members[1]).toMatchObject({ name: 'Dev', role: 'member', agentId: 'a2', status: 'active' });
    });

    it('should handle snake_case fields (agent_id, agent_type)', () => {
      const teamDir = path.join(tmpDir, 'teams', 'my-team');
      fs.mkdirSync(teamDir, { recursive: true });
      fs.writeFileSync(
        path.join(teamDir, 'config.json'),
        JSON.stringify({
          members: [{ name: 'Agent', agent_id: 'x1', agent_type: 'claude' }],
        })
      );

      const members = service.readTeamConfig('my-team');
      expect(members[0].agentId).toBe('x1');
      expect(members[0].agentType).toBe('claude');
    });

    it('should return empty array for missing config', () => {
      const members = service.readTeamConfig('nonexistent');
      expect(members).toEqual([]);
    });

    it('should return empty array for invalid JSON', () => {
      const teamDir = path.join(tmpDir, 'teams', 'bad-team');
      fs.mkdirSync(teamDir, { recursive: true });
      fs.writeFileSync(path.join(teamDir, 'config.json'), 'not json');

      const members = service.readTeamConfig('bad-team');
      expect(members).toEqual([]);
    });

    it('should return empty array when members field is missing', () => {
      const teamDir = path.join(tmpDir, 'teams', 'empty-team');
      fs.mkdirSync(teamDir, { recursive: true });
      fs.writeFileSync(path.join(teamDir, 'config.json'), JSON.stringify({ name: 'team' }));

      const members = service.readTeamConfig('empty-team');
      expect(members).toEqual([]);
    });

    it('should default missing name to "unknown"', () => {
      const teamDir = path.join(tmpDir, 'teams', 'my-team');
      fs.mkdirSync(teamDir, { recursive: true });
      fs.writeFileSync(path.join(teamDir, 'config.json'), JSON.stringify({ members: [{ role: 'member' }] }));

      const members = service.readTeamConfig('my-team');
      expect(members[0].name).toBe('unknown');
    });
  });

  // ── Task reading ──

  describe('readTasks', () => {
    it('should read tasks from a JSON array file', () => {
      const tasksDir = path.join(tmpDir, 'tasks', 'my-team');
      fs.mkdirSync(tasksDir, { recursive: true });
      fs.writeFileSync(
        path.join(tasksDir, 'tasks.json'),
        JSON.stringify([
          { id: 't1', subject: 'Build UI', state: 'in_progress', assignee: 'frontend' },
          { id: 't2', subject: 'Build API', state: 'pending' },
        ])
      );

      const tasks = service.readTasks('my-team');
      expect(tasks).toHaveLength(2);
      expect(tasks[0]).toMatchObject({ id: 't1', subject: 'Build UI', state: 'in_progress', assignee: 'frontend' });
      expect(tasks[1]).toMatchObject({ id: 't2', subject: 'Build API', state: 'pending' });
    });

    it('should read a single task JSON file', () => {
      const tasksDir = path.join(tmpDir, 'tasks', 'my-team');
      fs.mkdirSync(tasksDir, { recursive: true });
      fs.writeFileSync(path.join(tasksDir, 'task-1.json'), JSON.stringify({ id: 't1', subject: 'Fix bug', state: 'completed' }));

      const tasks = service.readTasks('my-team');
      expect(tasks).toHaveLength(1);
      expect(tasks[0]).toMatchObject({ id: 't1', subject: 'Fix bug', state: 'completed' });
    });

    it('should read tasks from wrapper object with tasks array', () => {
      const tasksDir = path.join(tmpDir, 'tasks', 'my-team');
      fs.mkdirSync(tasksDir, { recursive: true });
      fs.writeFileSync(
        path.join(tasksDir, 'data.json'),
        JSON.stringify({
          tasks: [
            { id: 't1', subject: 'Task A', state: 'pending' },
            { id: 't2', subject: 'Task B', state: 'done' },
          ],
        })
      );

      const tasks = service.readTasks('my-team');
      expect(tasks).toHaveLength(2);
      expect(tasks[1].state).toBe('completed'); // 'done' normalized to 'completed'
    });

    it('should read tasks from JSONL file', () => {
      const tasksDir = path.join(tmpDir, 'tasks', 'my-team');
      fs.mkdirSync(tasksDir, { recursive: true });
      const lines = [JSON.stringify({ id: 't1', subject: 'Task 1', state: 'pending' }), JSON.stringify({ id: 't2', subject: 'Task 2', state: 'in_progress' })].join('\n');
      fs.writeFileSync(path.join(tasksDir, 'tasks.jsonl'), lines);

      const tasks = service.readTasks('my-team');
      expect(tasks).toHaveLength(2);
    });

    it('should skip invalid lines in JSONL', () => {
      const tasksDir = path.join(tmpDir, 'tasks', 'my-team');
      fs.mkdirSync(tasksDir, { recursive: true });
      const lines = [JSON.stringify({ id: 't1', subject: 'Valid', state: 'pending' }), 'not json', JSON.stringify({ id: 't2', subject: 'Also valid', state: 'done' })].join('\n');
      fs.writeFileSync(path.join(tasksDir, 'tasks.jsonl'), lines);

      const tasks = service.readTasks('my-team');
      expect(tasks).toHaveLength(2);
    });

    it('should return empty array for missing tasks dir', () => {
      const tasks = service.readTasks('nonexistent');
      expect(tasks).toEqual([]);
    });

    it('should skip non-file entries (directories)', () => {
      const tasksDir = path.join(tmpDir, 'tasks', 'my-team');
      fs.mkdirSync(path.join(tasksDir, 'subdir'), { recursive: true });

      const tasks = service.readTasks('my-team');
      expect(tasks).toEqual([]);
    });
  });

  // ── Task state normalization ──

  describe('task state normalization', () => {
    function makeTask(state: string) {
      const tasksDir = path.join(tmpDir, 'tasks', 'norm-team');
      fs.mkdirSync(tasksDir, { recursive: true });
      fs.writeFileSync(path.join(tasksDir, 'task.json'), JSON.stringify({ id: 't1', subject: 'Test', state }));
      return service.readTasks('norm-team')[0];
    }

    afterEach(() => {
      const tasksDir = path.join(tmpDir, 'tasks', 'norm-team');
      if (fs.existsSync(tasksDir)) fs.rmSync(tasksDir, { recursive: true, force: true });
    });

    it('should normalize "in_progress" state', () => {
      expect(makeTask('in_progress').state).toBe('in_progress');
    });

    it('should normalize "active" to "in_progress"', () => {
      expect(makeTask('active').state).toBe('in_progress');
    });

    it('should normalize "working" to "in_progress"', () => {
      expect(makeTask('working').state).toBe('in_progress');
    });

    it('should normalize "claimed" to "in_progress"', () => {
      expect(makeTask('claimed').state).toBe('in_progress');
    });

    it('should normalize "completed" state', () => {
      expect(makeTask('completed').state).toBe('completed');
    });

    it('should normalize "done" to "completed"', () => {
      expect(makeTask('done').state).toBe('completed');
    });

    it('should normalize "finished" to "completed"', () => {
      expect(makeTask('finished').state).toBe('completed');
    });

    it('should default unknown states to "pending"', () => {
      expect(makeTask('unknown').state).toBe('pending');
    });

    it('should default empty state to "pending"', () => {
      expect(makeTask('').state).toBe('pending');
    });
  });

  // ── Task field normalization ──

  describe('task field normalization', () => {
    function makeTaskWithFields(fields: Record<string, unknown>) {
      const tasksDir = path.join(tmpDir, 'tasks', 'field-team');
      fs.mkdirSync(tasksDir, { recursive: true });
      fs.writeFileSync(path.join(tasksDir, 'task.json'), JSON.stringify(fields));
      return service.readTasks('field-team')[0];
    }

    afterEach(() => {
      const dir = path.join(tmpDir, 'tasks', 'field-team');
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    });

    it('should use task_id as fallback for id', () => {
      const task = makeTaskWithFields({ task_id: 'x1', subject: 'Test', state: 'pending' });
      expect(task.id).toBe('x1');
    });

    it('should use title as fallback for subject', () => {
      const task = makeTaskWithFields({ id: 't1', title: 'My Title', state: 'pending' });
      expect(task.subject).toBe('My Title');
    });

    it('should use name as fallback for subject', () => {
      const task = makeTaskWithFields({ id: 't1', name: 'My Name', state: 'pending' });
      expect(task.subject).toBe('My Name');
    });

    it('should default subject to "Untitled"', () => {
      const task = makeTaskWithFields({ id: 't1', state: 'pending' });
      expect(task.subject).toBe('Untitled');
    });

    it('should parse dependencies as string array', () => {
      const task = makeTaskWithFields({ id: 't1', subject: 'T', state: 'pending', dependencies: ['t0', 123] });
      expect(task.dependencies).toEqual(['t0', '123']);
    });

    it('should use status as fallback for state', () => {
      const tasksDir = path.join(tmpDir, 'tasks', 'field-team');
      fs.mkdirSync(tasksDir, { recursive: true });
      fs.writeFileSync(path.join(tasksDir, 'task.json'), JSON.stringify({ id: 't1', subject: 'Test', status: 'done' }));
      const task = service.readTasks('field-team')[0];
      expect(task.state).toBe('completed');
    });
  });

  // ── Event system ──

  describe('event system', () => {
    it('should emit team_config event when config changes', (done) => {
      const teamDir = path.join(tmpDir, 'teams', 'ev-team');
      fs.mkdirSync(teamDir, { recursive: true });
      fs.writeFileSync(path.join(teamDir, 'config.json'), JSON.stringify({ members: [{ name: 'Agent', role: 'lead' }] }));

      service.on((event: TeamMonitorEvent) => {
        if (event.type === 'team_config') {
          expect(event.data.teamName).toBe('ev-team');
          expect(event.data.members).toHaveLength(1);
          expect(event.data.members[0].name).toBe('Agent');
          done();
        }
      });

      service.start('conv-1', 'ev-team');
    });

    it('should emit task_update event when tasks exist', (done) => {
      const teamDir = path.join(tmpDir, 'teams', 'ev-team');
      fs.mkdirSync(teamDir, { recursive: true });
      fs.writeFileSync(path.join(teamDir, 'config.json'), JSON.stringify({ members: [] }));

      const tasksDir = path.join(tmpDir, 'tasks', 'ev-team');
      fs.mkdirSync(tasksDir, { recursive: true });
      fs.writeFileSync(path.join(tasksDir, 'tasks.json'), JSON.stringify([{ id: 't1', subject: 'Do it', state: 'pending' }]));

      service.on((event: TeamMonitorEvent) => {
        if (event.type === 'task_update') {
          expect(event.data.tasks).toHaveLength(1);
          expect(event.data.tasks[0].subject).toBe('Do it');
          done();
        }
      });

      service.start('conv-1', 'ev-team');
    });

    it('should allow unsubscribing listeners', () => {
      const events: TeamMonitorEvent[] = [];
      const unsub = service.on((event) => events.push(event));

      const teamDir = path.join(tmpDir, 'teams', 'unsub-team');
      fs.mkdirSync(teamDir, { recursive: true });
      fs.writeFileSync(path.join(teamDir, 'config.json'), JSON.stringify({ members: [{ name: 'A' }] }));

      unsub(); // Unsubscribe before starting
      service.start('conv-1', 'unsub-team');

      // Give it a tick to process
      setTimeout(() => {
        // Should not have received events since we unsubscribed
        expect(events.filter((e) => e.type === 'team_config')).toHaveLength(0);
      }, 100);
    });

    it('should not crash if a listener throws', (done) => {
      const teamDir = path.join(tmpDir, 'teams', 'err-team');
      fs.mkdirSync(teamDir, { recursive: true });
      fs.writeFileSync(path.join(teamDir, 'config.json'), JSON.stringify({ members: [{ name: 'A' }] }));

      // First listener throws
      service.on(() => {
        throw new Error('listener boom');
      });

      // Second listener should still receive events
      service.on((event: TeamMonitorEvent) => {
        if (event.type === 'team_config') {
          expect(event.data.members).toHaveLength(1);
          done();
        }
      });

      service.start('conv-1', 'err-team');
    });
  });

  // ── getTeamState ──

  describe('getTeamState', () => {
    it('should return null when no team is being monitored', () => {
      expect(service.getTeamState()).toBeNull();
    });

    it('should return combined state when monitoring', () => {
      const teamDir = path.join(tmpDir, 'teams', 'state-team');
      fs.mkdirSync(teamDir, { recursive: true });
      fs.writeFileSync(path.join(teamDir, 'config.json'), JSON.stringify({ members: [{ name: 'Dev', role: 'member' }] }));

      const tasksDir = path.join(tmpDir, 'tasks', 'state-team');
      fs.mkdirSync(tasksDir, { recursive: true });
      fs.writeFileSync(path.join(tasksDir, 'tasks.json'), JSON.stringify([{ id: 't1', subject: 'Ship it', state: 'in_progress' }]));

      service.start('conv-1', 'state-team');
      const state = service.getTeamState();

      expect(state).not.toBeNull();
      expect(state!.teamName).toBe('state-team');
      expect(state!.members).toHaveLength(1);
      expect(state!.tasks).toHaveLength(1);
    });
  });

  // ── getAgentOutputs (cached) ──

  describe('getAgentOutputs', () => {
    it('should return empty array when no team is being monitored', () => {
      expect(service.getAgentOutputs()).toEqual([]);
    });

    it('should return cached outputs after polling reads transcripts', (done) => {
      // Set up team config so we can start monitoring
      const teamDir = path.join(tmpDir, 'teams', 'cache-team');
      fs.mkdirSync(teamDir, { recursive: true });
      fs.writeFileSync(path.join(teamDir, 'config.json'), JSON.stringify({ members: [{ name: 'worker', role: 'member' }] }));

      // Set up subagent transcript
      const projectDir = path.join(tmpDir, 'projects', 'test-proj', 'subagents');
      fs.mkdirSync(projectDir, { recursive: true });

      const transcript = [JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'Hello from agent' }] } })].join('\n');
      fs.writeFileSync(path.join(projectDir, 'agent-worker.jsonl'), transcript);

      // Listen for the agent_output event which signals polling has completed
      service.on((event) => {
        if (event.type === 'agent_output') {
          // After polling reads the transcript, getAgentOutputs should return cached data
          const outputs = service.getAgentOutputs();
          expect(outputs.length).toBeGreaterThanOrEqual(1);

          const workerOutput = outputs.find((o) => o.agentName === 'worker');
          expect(workerOutput).toBeDefined();
          expect(workerOutput!.entries).toHaveLength(1);
          expect(workerOutput!.entries[0].text).toBe('Hello from agent');
          done();
        }
      });

      service.start('conv-1', 'cache-team');
    });

    it('should still return cached outputs even when transcript file has not grown', (done) => {
      const teamDir = path.join(tmpDir, 'teams', 'cache-team2');
      fs.mkdirSync(teamDir, { recursive: true });
      fs.writeFileSync(path.join(teamDir, 'config.json'), JSON.stringify({ members: [{ name: 'agent-a', role: 'member' }] }));

      const projectDir = path.join(tmpDir, 'projects', 'test-proj2', 'subagents');
      fs.mkdirSync(projectDir, { recursive: true });

      const transcript = JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Cached output' }] },
      });
      fs.writeFileSync(path.join(projectDir, 'agent-test.jsonl'), transcript);

      let pollCount = 0;
      service.on((event) => {
        if (event.type === 'agent_output') {
          pollCount++;
          if (pollCount === 1) {
            // First poll reads the transcript.
            // Calling getAgentOutputs again (simulating context 5s poll)
            // should return cached data, not empty.
            const outputs = service.getAgentOutputs();
            expect(outputs.length).toBeGreaterThanOrEqual(1);
            done();
          }
        }
      });

      service.start('conv-1', 'cache-team2');
    });

    it('should clear cached outputs on stop', () => {
      service.start('conv-1', 'some-team');
      // Manually verify cache is cleared after stop
      service.stop();
      expect(service.getAgentOutputs()).toEqual([]);
    });
  });

  // ── Transcript parsing ──

  describe('transcript parsing', () => {
    it('should parse text content blocks', (done) => {
      const teamDir = path.join(tmpDir, 'teams', 'parse-team');
      fs.mkdirSync(teamDir, { recursive: true });
      fs.writeFileSync(path.join(teamDir, 'config.json'), JSON.stringify({ members: [] }));

      const projectDir = path.join(tmpDir, 'projects', 'parse-proj', 'subagents');
      fs.mkdirSync(projectDir, { recursive: true });

      const lines = [JSON.stringify({ type: 'human', message: { content: 'User says hi' } }), JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'Bot responds' }] } })];
      fs.writeFileSync(path.join(projectDir, 'agent-bot.jsonl'), lines.join('\n'));

      service.on((event) => {
        if (event.type === 'agent_output' && event.data.agentName === 'bot') {
          expect(event.data.entries).toHaveLength(2);
          expect(event.data.entries[0]).toMatchObject({ role: 'user', text: 'User says hi' });
          expect(event.data.entries[1]).toMatchObject({ role: 'assistant', text: 'Bot responds' });
          done();
        }
      });

      service.start('conv-1', 'parse-team');
    });

    it('should parse tool_use and tool_result blocks', (done) => {
      const teamDir = path.join(tmpDir, 'teams', 'tool-team');
      fs.mkdirSync(teamDir, { recursive: true });
      fs.writeFileSync(path.join(teamDir, 'config.json'), JSON.stringify({ members: [] }));

      const projectDir = path.join(tmpDir, 'projects', 'tool-proj', 'subagents');
      fs.mkdirSync(projectDir, { recursive: true });

      const lines = [
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [{ type: 'tool_use', name: 'read_file', input: { path: '/tmp/test.txt' } }],
          },
        }),
        JSON.stringify({
          type: 'human',
          message: {
            content: [{ type: 'tool_result', content: 'file contents here' }],
          },
        }),
      ];
      fs.writeFileSync(path.join(projectDir, 'agent-toolbot.jsonl'), lines.join('\n'));

      service.on((event) => {
        if (event.type === 'agent_output' && event.data.agentName === 'toolbot') {
          expect(event.data.entries).toHaveLength(2);
          expect(event.data.entries[0].toolName).toBe('read_file');
          expect(event.data.entries[0].toolInput).toContain('/tmp/test.txt');
          expect(event.data.entries[1].text).toContain('file contents here');
          done();
        }
      });

      service.start('conv-1', 'tool-team');
    });
  });
});
