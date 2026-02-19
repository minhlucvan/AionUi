/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * FileRelay — File-based message persistence for multi-agent runs.
 *
 * Writes all inter-agent communication to the workspace so you can
 * inspect the full conversation on disk:
 *
 *   {workspace}/.multi-agent/{runId}/
 *   ├── feed.jsonl                     # Shared event feed (every bus event)
 *   ├── {nodeId}/
 *   │   ├── inbox/
 *   │   │   ├── 001_from_{sender}.md   # Messages received by this agent
 *   │   │   └── 002_from_{sender}.md
 *   │   └── outbox/
 *   │       ├── 001.md                 # Responses produced by this agent
 *   │       └── 002.md
 *
 * This is the "file based approach" — simple, debuggable, survives crashes.
 */

import * as fs from 'fs';
import * as path from 'path';

export type FeedEntry = {
  ts: string;
  seq: number;
  type: string;
  from?: string;
  to?: string | string[];
  turn?: number;
  contentLength?: number;
  contentPreview?: string;
  [key: string]: unknown;
};

export class FileRelay {
  private rootDir: string;
  private seq = 0;
  private started = false;

  constructor(workspace: string, runId: string) {
    const safeRunId = runId.replace(/[^a-zA-Z0-9_-]/g, '_');
    this.rootDir = path.join(workspace, '.multi-agent', safeRunId);
  }

  /**
   * Initialize the directory structure.
   */
  start(nodeIds: string[]): void {
    fs.mkdirSync(this.rootDir, { recursive: true });

    for (const nodeId of nodeIds) {
      fs.mkdirSync(path.join(this.rootDir, nodeId, 'inbox'), { recursive: true });
      fs.mkdirSync(path.join(this.rootDir, nodeId, 'outbox'), { recursive: true });
    }

    this.started = true;
    this.appendFeed({ type: 'relay:start', nodeIds });
  }

  /**
   * Write a message to a node's inbox (message it received).
   */
  writeInbox(nodeId: string, turn: number, from: string, content: string): string {
    const filename = `${pad(turn)}_from_${safeName(from)}.md`;
    const filePath = path.join(this.rootDir, nodeId, 'inbox', filename);
    this.writeFile(filePath, this.formatMessage(from, nodeId, turn, content));
    this.appendFeed({ type: 'inbox', nodeId, from, turn, contentLength: content.length });
    return filePath;
  }

  /**
   * Write a message to a node's outbox (response it produced).
   */
  writeOutbox(nodeId: string, turn: number, content: string): string {
    const filename = `${pad(turn)}.md`;
    const filePath = path.join(this.rootDir, nodeId, 'outbox', filename);
    this.writeFile(filePath, content);
    this.appendFeed({ type: 'outbox', nodeId, turn, contentLength: content.length });
    return filePath;
  }

  /**
   * Write the initial prompt sent to a node.
   */
  writeInitialPrompt(nodeId: string, prompt: string): string {
    const filePath = path.join(this.rootDir, nodeId, 'initial_prompt.md');
    this.writeFile(filePath, prompt);
    this.appendFeed({ type: 'initial_prompt', nodeId, contentLength: prompt.length });
    return filePath;
  }

  /**
   * Append an entry to the shared feed.jsonl.
   */
  appendFeed(entry: Omit<FeedEntry, 'ts' | 'seq'>): void {
    if (!this.started) return;
    const line = {
      ts: new Date().toISOString(),
      seq: this.seq++,
      type: entry.type,
      ...entry,
    };
    try {
      fs.appendFileSync(path.join(this.rootDir, 'feed.jsonl'), JSON.stringify(line) + '\n');
    } catch {
      // Swallow — file relay must never crash the orchestrator
    }
  }

  /**
   * Write a summary file when the run completes.
   */
  writeSummary(summary: Record<string, unknown>): void {
    const filePath = path.join(this.rootDir, 'summary.json');
    this.writeFile(filePath, JSON.stringify(summary, null, 2));
  }

  /**
   * Stop the relay.
   */
  stop(): void {
    if (this.started) {
      this.appendFeed({ type: 'relay:stop' });
      this.started = false;
    }
  }

  /**
   * Get the root directory for this run.
   */
  getRootDir(): string {
    return this.rootDir;
  }

  private formatMessage(from: string, to: string, turn: number, content: string): string {
    return `<!-- turn: ${turn}, from: ${from}, to: ${to}, ts: ${new Date().toISOString()} -->\n\n${content}\n`;
  }

  private writeFile(filePath: string, content: string): void {
    try {
      fs.writeFileSync(filePath, content, 'utf-8');
    } catch {
      // Swallow
    }
  }
}

function pad(n: number): string {
  return String(n).padStart(3, '0');
}

function safeName(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '_');
}
