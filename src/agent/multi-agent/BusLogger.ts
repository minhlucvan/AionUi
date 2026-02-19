/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * BusLogger — Persists AgentBus events and orchestrator lifecycle
 * to a JSONL file for offline debugging and inspection.
 *
 * Each line is a self-contained JSON object with:
 *   { ts, seq, event, ...payload }
 *
 * Uses synchronous file I/O (appendFileSync) to guarantee lines are
 * flushed immediately — acceptable for a low-volume debug log.
 *
 * Usage:
 *   const logger = new BusLogger(runId, bus, logDir?);
 *   logger.start();       // subscribes to all bus events
 *   logger.logEvent(...)  // manual orchestrator events
 *   logger.stop();        // unsubscribe
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AgentBus } from './AgentBus';
import type { BusEvent, TopologyConfig } from './types';

export type LogEventKind = 'bus:event' | 'orchestrator:start' | 'orchestrator:node_created' | 'orchestrator:initial_prompt' | 'orchestrator:route' | 'orchestrator:completion' | 'orchestrator:max_turns' | 'orchestrator:stop' | 'orchestrator:error' | 'orchestrator:finish' | 'hook:complete';

export type LogEntry = {
  /** ISO timestamp */
  ts: string;
  /** Monotonic sequence number */
  seq: number;
  /** Event category */
  event: LogEventKind;
  /** Arbitrary payload */
  [key: string]: unknown;
};

export class BusLogger {
  private runId: string;
  private bus: AgentBus | null;
  private logDir: string;
  private filePath: string;
  private started = false;
  private seq = 0;
  private unsubscribe: (() => void) | null = null;

  constructor(runId: string, bus: AgentBus | null, logDir?: string) {
    this.runId = runId;
    this.bus = bus;
    this.logDir = logDir || path.join(process.cwd(), 'multi-agent-logs');

    const safeRunId = runId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const datePrefix = new Date().toISOString().slice(0, 10);
    this.filePath = path.join(this.logDir, `${datePrefix}_${safeRunId}.jsonl`);
  }

  /**
   * Start logging — creates the log file and subscribes to the bus.
   */
  start(): void {
    fs.mkdirSync(this.logDir, { recursive: true });
    // Touch the file so it exists immediately
    fs.writeFileSync(this.filePath, '', { flag: 'a' });
    this.started = true;

    if (this.bus) {
      this.unsubscribe = this.bus.onAll((event: BusEvent) => {
        this.writeBusEvent(event);
      });
    }
  }

  /**
   * Write a bus event as a JSONL line.
   */
  private writeBusEvent(event: BusEvent): void {
    const entry: LogEntry = {
      ts: new Date().toISOString(),
      seq: this.seq++,
      event: 'bus:event',
      busEventType: event.type,
      nodeId: event.nodeId,
      error: event.error,
      meta: event.meta,
      messageId: event.message?.id,
      messageFrom: event.message?.from,
      messageTo: event.message?.to,
      messageContent: event.message?.content ? truncate(event.message.content, 2000) : undefined,
    };
    this.writeLine(entry);
  }

  /**
   * Log an orchestrator lifecycle event.
   */
  logEvent(kind: LogEventKind, payload?: Record<string, unknown>): void {
    const entry: LogEntry = {
      ts: new Date().toISOString(),
      seq: this.seq++,
      event: kind,
      runId: this.runId,
      ...payload,
    };
    this.writeLine(entry);
  }

  /**
   * Log the start of an orchestration run.
   */
  logStart(topology: TopologyConfig, config: Record<string, unknown>): void {
    this.logEvent('orchestrator:start', {
      topologyType: topology.type,
      nodeCount: topology.nodes.length,
      nodeIds: topology.nodes.map((n) => n.id),
      edges: topology.edges,
      hubNodeId: topology.hubNodeId,
      pipelineOrder: topology.pipelineOrder,
      ...config,
    });
  }

  /**
   * Log a node being created and attached.
   */
  logNodeCreated(nodeId: string, role: string, backend: string, conversationId: string): void {
    this.logEvent('orchestrator:node_created', {
      nodeId,
      role,
      backend,
      conversationId,
    });
  }

  /**
   * Log an initial prompt being sent.
   */
  logInitialPrompt(nodeId: string, prompt: string, isStarter: boolean): void {
    this.logEvent('orchestrator:initial_prompt', {
      nodeId,
      isStarter,
      promptLength: prompt.length,
      promptPreview: truncate(prompt, 500),
    });
  }

  /**
   * Log a message being routed.
   */
  logRoute(turn: number, from: string, targets: string[], contentLength: number): void {
    this.logEvent('orchestrator:route', {
      turn,
      from,
      targets,
      contentLength,
    });
  }

  /**
   * Log completion signal detected.
   */
  logCompletion(turn: number, from: string): void {
    this.logEvent('orchestrator:completion', {
      turn,
      from,
    });
  }

  /**
   * Log max turns reached.
   */
  logMaxTurns(turn: number, maxTurns: number): void {
    this.logEvent('orchestrator:max_turns', {
      turn,
      maxTurns,
    });
  }

  /**
   * Log an error.
   */
  logError(error: string, context?: Record<string, unknown>): void {
    this.logEvent('orchestrator:error', {
      error,
      ...context,
    });
  }

  /**
   * Log the orchestration finishing.
   */
  logFinish(result: Record<string, unknown>): void {
    this.logEvent('orchestrator:finish', result);
  }

  /**
   * Stop logging — unsubscribe from the bus.
   */
  stop(): void {
    this.started = false;
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * Get the log file path.
   */
  getFilePath(): string {
    return this.filePath;
  }

  private writeLine(entry: LogEntry): void {
    if (!this.started) return;
    try {
      fs.appendFileSync(this.filePath, JSON.stringify(entry) + '\n');
    } catch {
      // Swallow write errors — logging must never crash the orchestrator
    }
  }
}

function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen) + `... [truncated, ${s.length} chars total]`;
}
