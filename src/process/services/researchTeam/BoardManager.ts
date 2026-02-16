/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * BoardManager — Manages the shared team board as a file artifact.
 *
 * Inspired by Scrum/Kanban: the board is a single file that serves as
 * the team's source of truth. Every agent can read it (via native Read)
 * and update it (via the `board_update` tool). The board tracks:
 *
 * - Each agent's current status and what they're working on
 * - Artifacts produced (file paths)
 * - Recent updates (a concise activity log)
 *
 * Board file location: `<workingDir>/.team/board.md`
 * Artifact directory:  `<workingDir>/.team/artifacts/`
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

export type AgentBoardStatus = 'working' | 'blocked' | 'reviewing' | 'done' | 'idle';

export type BoardAgentEntry = {
  id: string;
  name: string;
  role: string;
  status: AgentBoardStatus;
  currentTask: string;
  artifacts: string[];
  lastUpdate: string;
  updatedAt: number;
};

export type BoardUpdate = {
  agentId: string;
  agentName: string;
  agentRole: string;
  message: string;
  timestamp: number;
};

type BoardState = {
  sessionId: string;
  objective: string;
  agents: Record<string, BoardAgentEntry>;
  updates: BoardUpdate[];
  createdAt: number;
};

export class BoardManager {
  private state: BoardState;
  private readonly boardDir: string;
  private readonly boardFilePath: string;
  private readonly artifactsDir: string;

  constructor(
    private readonly workingDir: string,
    sessionId: string,
    objective: string
  ) {
    this.boardDir = join(workingDir, '.team');
    this.boardFilePath = join(this.boardDir, 'board.md');
    this.artifactsDir = join(this.boardDir, 'artifacts');

    this.state = {
      sessionId,
      objective,
      agents: {},
      updates: [],
      createdAt: Date.now(),
    };

    this.ensureDirectories();
  }

  /** Register an agent on the board */
  registerAgent(id: string, name: string, role: string): void {
    this.state.agents[id] = {
      id,
      name,
      role,
      status: 'idle',
      currentTask: '',
      artifacts: [],
      lastUpdate: 'Just joined the team',
      updatedAt: Date.now(),
    };
    this.flush();
  }

  /** Agent updates their board entry */
  updateAgent(agentId: string, update: { status?: AgentBoardStatus; message?: string; artifacts?: string[] }): void {
    const agent = this.state.agents[agentId];
    if (!agent) return;

    if (update.status) agent.status = update.status;
    if (update.message) {
      agent.lastUpdate = update.message;
      agent.currentTask = update.message;
    }
    if (update.artifacts) {
      agent.artifacts = [...new Set([...agent.artifacts, ...update.artifacts])];
    }
    agent.updatedAt = Date.now();

    // Append to update log (keep last 30 entries)
    this.state.updates.push({
      agentId,
      agentName: agent.name,
      agentRole: agent.role,
      message: update.message ?? `Status → ${update.status ?? agent.status}`,
      timestamp: Date.now(),
    });
    if (this.state.updates.length > 30) {
      this.state.updates = this.state.updates.slice(-30);
    }

    this.flush();
  }

  /** Read the full board state as formatted markdown */
  readBoard(): string {
    return this.renderMarkdown();
  }

  /** Get raw board state for programmatic access */
  getState(): BoardState {
    return this.state;
  }

  /** Get agents summary for status queries */
  getAgentsSummary(): Array<{ id: string; name: string; role: string; status: string }> {
    return Object.values(this.state.agents).map((a) => ({
      id: a.id,
      name: a.name,
      role: a.role,
      status: a.status,
    }));
  }

  /** Get the artifacts directory path */
  getArtifactsDir(): string {
    return this.artifactsDir;
  }

  /** Get the board file path */
  getBoardFilePath(): string {
    return this.boardFilePath;
  }

  // ── Internal ──

  private ensureDirectories(): void {
    mkdirSync(this.boardDir, { recursive: true });
    mkdirSync(this.artifactsDir, { recursive: true });
  }

  /** Write the board state to the markdown file */
  private flush(): void {
    try {
      writeFileSync(this.boardFilePath, this.renderMarkdown(), 'utf-8');
    } catch {
      // Best-effort write — agents can still use in-memory state
    }
  }

  private renderMarkdown(): string {
    const agents = Object.values(this.state.agents);
    const now = Date.now();

    let md = `# Team Board\n\n`;
    md += `**Objective:** ${this.state.objective}\n\n`;
    md += `---\n\n`;

    // Agent status table
    md += `## Team Status\n\n`;
    md += `| Agent | Role | Status | Current Work |\n`;
    md += `|-------|------|--------|-------------|\n`;

    for (const agent of agents) {
      const statusIcon = STATUS_ICONS[agent.status] ?? '⚪';
      md += `| ${agent.name} | ${agent.role} | ${statusIcon} ${agent.status} | ${agent.lastUpdate.slice(0, 80)} |\n`;
    }

    md += `\n`;

    // Artifacts index
    const allArtifacts = agents.flatMap((a) => a.artifacts.map((f) => ({ agent: a.name, file: f })));
    if (allArtifacts.length > 0) {
      md += `## Artifacts\n\n`;
      for (const art of allArtifacts) {
        md += `- \`${art.file}\` (by ${art.agent})\n`;
      }
      md += `\n`;
    }

    // Recent updates (last 10)
    const recentUpdates = this.state.updates.slice(-10);
    if (recentUpdates.length > 0) {
      md += `## Recent Updates\n\n`;
      for (const update of recentUpdates.reverse()) {
        const ago = formatTimeAgo(now - update.timestamp);
        md += `- **${update.agentName}** (${ago}): ${update.message}\n`;
      }
      md += `\n`;
    }

    md += `---\n`;
    md += `*Board file: \`${this.boardFilePath}\`*\n`;
    md += `*Artifacts dir: \`${this.artifactsDir}\`*\n`;
    md += `*Use native Read/Write tools to work with artifact files.*\n`;

    return md;
  }
}

const STATUS_ICONS: Record<string, string> = {
  working: '🔵',
  blocked: '🔴',
  reviewing: '🟡',
  done: '🟢',
  idle: '⚪',
};

function formatTimeAgo(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}
