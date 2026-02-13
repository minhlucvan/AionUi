/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AgentOutput, TeamMember, TeamMonitorEvent, TeamTask, TranscriptEntry } from '@/common/teamMonitor';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

type EventCallback = (event: TeamMonitorEvent) => void;

/**
 * TeamMonitorService monitors Claude's native agent team state
 * by watching the filesystem:
 * - ~/.claude/teams/{team-name}/config.json → team member config
 * - ~/.claude/tasks/{team-name}/ → shared task list
 * - transcript subagents/ → individual agent output
 */
export class TeamMonitorService {
  private claudeDir: string;
  private watchers: fs.FSWatcher[] = [];
  private pollTimers: ReturnType<typeof setInterval>[] = [];
  private listeners: EventCallback[] = [];
  private teamName: string | null = null;
  private conversationId: string | null = null;
  private lastTeamConfig: string = '';
  private lastTasksHash: string = '';
  private lastTranscriptSizes: Map<string, number> = new Map();
  private cachedAgentOutputs: Map<string, AgentOutput> = new Map();
  private isRunning = false;

  constructor() {
    this.claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  }

  on(callback: EventCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private emit(event: TeamMonitorEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[TeamMonitor] Listener error:', err);
      }
    }
  }

  /**
   * Start monitoring for a conversation.
   * If teamName is provided, monitors that team directly.
   * Otherwise, watches for new team directories.
   */
  start(conversationId: string, teamName?: string): void {
    if (this.isRunning) {
      this.stop();
    }
    this.conversationId = conversationId;
    this.isRunning = true;

    if (teamName) {
      this.teamName = teamName;
      this.startTeamMonitoring(teamName);
    } else {
      this.startTeamDiscovery();
    }
  }

  stop(): void {
    this.isRunning = false;
    this.teamName = null;
    this.conversationId = null;
    this.lastTeamConfig = '';
    this.lastTasksHash = '';
    this.lastTranscriptSizes.clear();
    this.cachedAgentOutputs.clear();

    for (const watcher of this.watchers) {
      try {
        watcher.close();
      } catch {
        // ignore
      }
    }
    this.watchers = [];

    for (const timer of this.pollTimers) {
      clearInterval(timer);
    }
    this.pollTimers = [];
  }

  getTeamName(): string | null {
    return this.teamName;
  }

  isActive(): boolean {
    return this.isRunning;
  }

  /** Manually read and return current team state */
  getTeamState(): { teamName: string; members: TeamMember[]; tasks: TeamTask[] } | null {
    if (!this.teamName) return null;
    const members = this.readTeamConfig(this.teamName);
    const tasks = this.readTasks(this.teamName);
    return { teamName: this.teamName, members, tasks };
  }

  /** Return cached agent outputs (updated by polling) */
  getAgentOutputs(): AgentOutput[] {
    if (!this.teamName) return [];
    return Array.from(this.cachedAgentOutputs.values());
  }

  // ── Team Discovery ──

  private startTeamDiscovery(): void {
    const teamsDir = path.join(this.claudeDir, 'teams');

    // Poll for new team directories since they may not exist yet
    const timer = setInterval(() => {
      if (!this.isRunning) return;
      this.discoverTeam(teamsDir);
    }, 2000);
    this.pollTimers.push(timer);

    // Also try immediately
    this.discoverTeam(teamsDir);
  }

  private discoverTeam(teamsDir: string): void {
    try {
      if (!fs.existsSync(teamsDir)) return;

      const entries = fs.readdirSync(teamsDir, { withFileTypes: true });
      // Find the most recently created team
      let latestTeam: string | null = null;
      let latestTime = 0;

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const configPath = path.join(teamsDir, entry.name, 'config.json');
        try {
          const stat = fs.statSync(configPath);
          if (stat.mtimeMs > latestTime) {
            latestTime = stat.mtimeMs;
            latestTeam = entry.name;
          }
        } catch {
          // no config.json in this dir
        }
      }

      if (latestTeam && latestTeam !== this.teamName) {
        this.teamName = latestTeam;
        this.startTeamMonitoring(latestTeam);
      }
    } catch {
      // teams dir doesn't exist yet
    }
  }

  // ── Team Monitoring ──

  private startTeamMonitoring(teamName: string): void {
    // Monitor team config
    this.watchTeamConfig(teamName);
    // Monitor task list
    this.watchTasks(teamName);
    // Monitor subagent transcripts
    this.watchSubagentTranscripts();

    // Initial read
    this.pollTeamConfig(teamName);
    this.pollTasks(teamName);
  }

  // ── Team Config ──

  private watchTeamConfig(teamName: string): void {
    const configPath = path.join(this.claudeDir, 'teams', teamName, 'config.json');
    const timer = setInterval(() => {
      if (!this.isRunning) return;
      this.pollTeamConfig(teamName);
    }, 3000);
    this.pollTimers.push(timer);

    // Also try fs.watch for faster updates
    try {
      const dir = path.dirname(configPath);
      if (fs.existsSync(dir)) {
        const watcher = fs.watch(dir, () => {
          this.pollTeamConfig(teamName);
        });
        this.watchers.push(watcher);
      }
    } catch {
      // fs.watch not available, polling is fine
    }
  }

  private pollTeamConfig(teamName: string): void {
    try {
      const configPath = path.join(this.claudeDir, 'teams', teamName, 'config.json');
      if (!fs.existsSync(configPath)) return;

      const content = fs.readFileSync(configPath, 'utf-8');
      if (content === this.lastTeamConfig) return;
      this.lastTeamConfig = content;

      const members = this.parseTeamConfig(content);
      this.emit({
        type: 'team_config',
        data: { teamName, members },
      });
    } catch {
      // config not ready yet
    }
  }

  private parseTeamConfig(content: string): TeamMember[] {
    try {
      const config = JSON.parse(content);
      const members: TeamMember[] = [];

      if (Array.isArray(config.members)) {
        for (const m of config.members) {
          members.push({
            name: m.name || 'unknown',
            agentId: m.agentId || m.agent_id,
            agentType: m.agentType || m.agent_type,
            role: m.role || 'member',
            status: 'active',
          });
        }
      }

      return members;
    } catch {
      return [];
    }
  }

  readTeamConfig(teamName: string): TeamMember[] {
    try {
      const configPath = path.join(this.claudeDir, 'teams', teamName, 'config.json');
      const content = fs.readFileSync(configPath, 'utf-8');
      return this.parseTeamConfig(content);
    } catch {
      return [];
    }
  }

  // ── Task List ──

  private watchTasks(teamName: string): void {
    const tasksDir = path.join(this.claudeDir, 'tasks', teamName);

    const timer = setInterval(() => {
      if (!this.isRunning) return;
      this.pollTasks(teamName);
    }, 2000);
    this.pollTimers.push(timer);

    // Try fs.watch
    try {
      if (fs.existsSync(tasksDir)) {
        const watcher = fs.watch(tasksDir, { recursive: true }, () => {
          this.pollTasks(teamName);
        });
        this.watchers.push(watcher);
      }
    } catch {
      // fs.watch not available
    }
  }

  private pollTasks(teamName: string): void {
    try {
      const tasks = this.readTasks(teamName);
      const hash = JSON.stringify(tasks);
      if (hash === this.lastTasksHash) return;
      this.lastTasksHash = hash;

      this.emit({
        type: 'task_update',
        data: { teamName, tasks },
      });

      // Sync to Mission Control (lazy import to avoid pulling in DB at module load)
      if (this.conversationId && tasks.length > 0) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { missionSyncService } = require('@process/services/missionControl/MissionSyncService');
          missionSyncService.syncFromClaudeTasks(this.conversationId, teamName, tasks);
        } catch (err) {
          console.error('[TeamMonitor] Mission sync error:', err);
        }
      }
    } catch {
      // tasks not ready yet
    }
  }

  readTasks(teamName: string): TeamTask[] {
    const tasksDir = path.join(this.claudeDir, 'tasks', teamName);
    const tasks: TeamTask[] = [];

    try {
      if (!fs.existsSync(tasksDir)) return tasks;

      const entries = fs.readdirSync(tasksDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isFile()) continue;

        const filePath = path.join(tasksDir, entry.name);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');

          if (entry.name.endsWith('.json')) {
            // Try single task JSON file
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
              // Array of tasks in a single file
              for (const t of parsed) {
                tasks.push(this.normalizeTask(t));
              }
            } else if (parsed.id || parsed.subject) {
              // Single task
              tasks.push(this.normalizeTask(parsed));
            } else if (parsed.tasks && Array.isArray(parsed.tasks)) {
              // Wrapper object with tasks array
              for (const t of parsed.tasks) {
                tasks.push(this.normalizeTask(t));
              }
            }
          } else if (entry.name.endsWith('.jsonl')) {
            // JSONL format
            const lines = content.split('\n').filter((l) => l.trim());
            for (const line of lines) {
              try {
                const parsed = JSON.parse(line);
                tasks.push(this.normalizeTask(parsed));
              } catch {
                // skip invalid line
              }
            }
          }
        } catch {
          // skip unreadable file
        }
      }
    } catch {
      // directory not readable
    }

    return tasks;
  }

  private normalizeTask(raw: Record<string, unknown>): TeamTask {
    return {
      id: String(raw.id || raw.task_id || `task-${Date.now()}`),
      subject: String(raw.subject || raw.title || raw.name || 'Untitled'),
      description: raw.description ? String(raw.description) : undefined,
      state: this.normalizeTaskState(raw.state || raw.status),
      assignee: raw.assignee ? String(raw.assignee) : undefined,
      dependencies: Array.isArray(raw.dependencies) ? raw.dependencies.map(String) : undefined,
    };
  }

  private normalizeTaskState(state: unknown): TeamTask['state'] {
    const s = String(state || '').toLowerCase().replace(/[-_\s]/g, '');
    if (s === 'inprogress' || s === 'active' || s === 'working' || s === 'claimed') return 'in_progress';
    if (s === 'completed' || s === 'done' || s === 'finished') return 'completed';
    return 'pending';
  }

  // ── Subagent Transcripts ──

  private watchSubagentTranscripts(): void {
    // Look for subagent transcripts in the project directory
    // Claude stores them at {project_dir}/subagents/agent-{id}.jsonl
    const projectsDir = path.join(this.claudeDir, 'projects');

    const timer = setInterval(() => {
      if (!this.isRunning) return;
      this.pollSubagentTranscripts();
    }, 3000);
    this.pollTimers.push(timer);

    // Try watching the projects dir
    try {
      if (fs.existsSync(projectsDir)) {
        const watcher = fs.watch(projectsDir, { recursive: true }, (_, filename) => {
          if (filename && filename.includes('subagent')) {
            this.pollSubagentTranscripts();
          }
        });
        this.watchers.push(watcher);
      }
    } catch {
      // fs.watch not available
    }
  }

  private pollSubagentTranscripts(): void {
    const outputs = this.readSubagentTranscripts();
    for (const output of outputs) {
      this.cachedAgentOutputs.set(output.agentName, output);
      this.emit({
        type: 'agent_output',
        data: output,
      });
    }
  }

  private readSubagentTranscripts(): AgentOutput[] {
    const outputs: AgentOutput[] = [];
    const projectsDir = path.join(this.claudeDir, 'projects');

    try {
      if (!fs.existsSync(projectsDir)) return outputs;

      // Find subagent directories recursively
      this.findSubagentDirs(projectsDir, (subagentDir) => {
        try {
          const entries = fs.readdirSync(subagentDir, { withFileTypes: true });
          for (const entry of entries) {
            if (!entry.isFile() || !entry.name.endsWith('.jsonl')) continue;
            const filePath = path.join(subagentDir, entry.name);
            const agentName = entry.name.replace(/^agent-/, '').replace(/\.jsonl$/, '');

            try {
              const stat = fs.statSync(filePath);
              const lastSize = this.lastTranscriptSizes.get(filePath) || 0;

              // Only read if file has grown
              if (stat.size <= lastSize) continue;
              this.lastTranscriptSizes.set(filePath, stat.size);

              const content = fs.readFileSync(filePath, 'utf-8');
              const transcriptEntries = this.parseTranscript(content);

              if (transcriptEntries.length > 0) {
                outputs.push({
                  agentName,
                  entries: transcriptEntries,
                  lastActivity: stat.mtimeMs,
                });
              }
            } catch {
              // skip unreadable
            }
          }
        } catch {
          // skip
        }
      });
    } catch {
      // projects dir not readable
    }

    return outputs;
  }

  private findSubagentDirs(dir: string, callback: (dir: string) => void, depth = 0): void {
    if (depth > 4) return; // Limit recursion depth

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.name === 'subagents') {
          callback(fullPath);
        } else {
          this.findSubagentDirs(fullPath, callback, depth + 1);
        }
      }
    } catch {
      // not readable
    }
  }

  private parseTranscript(content: string): TranscriptEntry[] {
    const entries: TranscriptEntry[] = [];
    const lines = content.split('\n').filter((l) => l.trim());

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        const role = parsed.type === 'human' ? 'user' : parsed.type === 'assistant' ? 'assistant' : null;
        if (!role) continue;

        const message = parsed.message;
        if (!message?.content) continue;

        const contentArr = Array.isArray(message.content) ? message.content : [message.content];
        for (const block of contentArr) {
          if (typeof block === 'string') {
            entries.push({ role, text: block });
          } else if (block.type === 'text') {
            entries.push({ role, text: block.text });
          } else if (block.type === 'tool_use') {
            entries.push({
              role,
              text: `[Tool: ${block.name}]`,
              toolName: block.name,
              toolInput: typeof block.input === 'string' ? block.input : JSON.stringify(block.input),
            });
          } else if (block.type === 'tool_result') {
            const resultText = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);
            entries.push({
              role,
              text: `[Result: ${resultText.slice(0, 200)}]`,
            });
          }
        }
      } catch {
        // skip invalid line
      }
    }

    return entries;
  }
}

/** Singleton instance */
export const teamMonitorService = new TeamMonitorService();
