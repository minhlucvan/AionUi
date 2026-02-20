/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { uuid } from '@/common/utils';
import type { SwarmFeedEntry } from './types';

/**
 * Manages the .swarm/feed.jsonl file as an append-only message bus.
 * The .swarm/ directory is pre-created in the workspace template.
 */
export class SwarmFeedManager {
  private feedPath: string;
  private seq: number = 0;
  private cursors: Map<string, number> = new Map();

  constructor(workspacePath: string, feedRelPath: string) {
    this.feedPath = path.join(workspacePath, feedRelPath);
  }

  /** Initialize feed file (directory already exists from workspace template) */
  init(): void {
    const dir = path.dirname(this.feedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(this.feedPath)) {
      // Recover state from existing feed
      const entries = this.readAll();
      if (entries.length > 0) {
        this.seq = entries[entries.length - 1].seq;
      }
    } else {
      fs.writeFileSync(this.feedPath, '', 'utf-8');
    }
  }

  /** Append a message to the feed */
  append(entry: Omit<SwarmFeedEntry, 'id' | 'seq' | 'ts'>): SwarmFeedEntry {
    this.seq++;
    const full: SwarmFeedEntry = {
      id: uuid(),
      seq: this.seq,
      ts: new Date().toISOString(),
      ...entry,
    };
    fs.appendFileSync(this.feedPath, JSON.stringify(full) + '\n', 'utf-8');
    return full;
  }

  /** Read new messages for a specific agent since its last cursor position */
  readNewFor(role: string): SwarmFeedEntry[] {
    const cursor = this.cursors.get(role) || 0;
    const all = this.readAll();
    const entries = all.filter((e) => e.seq > cursor && (e.to === role || e.to === 'all'));
    if (all.length > 0) {
      this.cursors.set(role, all[all.length - 1].seq);
    }
    return entries;
  }

  /** Read all messages */
  readAll(): SwarmFeedEntry[] {
    if (!fs.existsSync(this.feedPath)) return [];
    const content = fs.readFileSync(this.feedPath, 'utf-8').trim();
    if (!content) return [];
    return content
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as SwarmFeedEntry);
  }

  /** Check if a "done" message exists */
  isDone(): boolean {
    return this.readAll().some((e) => e.type === 'done');
  }

  /** Get current sequence number */
  getSeq(): number {
    return this.seq;
  }
}
