/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import type { FeedEntry, ResearchCommand, ResearchCommandType, ResearchEvent, ResearchEventType } from './types';

/**
 * ResearchEventBus — Central hub for agent communication.
 *
 * Two channels:
 * 1. Events (broadcasts) — status updates, findings, progress
 * 2. Commands (directed) — messages between agents or from user
 *
 * All events and commands are recorded in a chronological feed
 * that can be queried, streamed to UI, or persisted.
 */
class ResearchEventBus extends EventEmitter {
  /** In-memory feed (per session) */
  private feeds = new Map<string, FeedEntry[]>();

  constructor() {
    super();
    this.setMaxListeners(100);
  }

  // ── Events (broadcasts) ──

  /** Publish an event — broadcasts to all listeners and records to feed */
  publishEvent(event: ResearchEvent): FeedEntry {
    const entry: FeedEntry = {
      id: randomUUID(),
      sessionId: event.sessionId,
      kind: 'event',
      type: event.type,
      sourceAgentId: event.agentId ?? null,
      data: event.data,
      summary: event.summary,
      timestamp: event.timestamp,
    };

    this.appendToFeed(entry);
    this.emit('event', event);
    this.emit(`event:${event.type}`, event);
    this.emit('feed', entry);
    return entry;
  }

  /** Convenience helper to create and publish an event */
  emitEvent(type: ResearchEventType, sessionId: string, extra?: { agentId?: string; data?: unknown; summary?: string }): FeedEntry {
    return this.publishEvent({
      type,
      sessionId,
      timestamp: Date.now(),
      ...extra,
    });
  }

  /** Subscribe to all events */
  onEvent(handler: (event: ResearchEvent) => void): () => void {
    this.on('event', handler);
    return () => this.off('event', handler);
  }

  /** Subscribe to a specific event type */
  onEventType(type: ResearchEventType, handler: (event: ResearchEvent) => void): () => void {
    const key = `event:${type}`;
    this.on(key, handler);
    return () => this.off(key, handler);
  }

  // ── Commands (directed messages) ──

  /** Send a command — directed to a specific agent or broadcast */
  sendCommand(command: ResearchCommand): FeedEntry {
    const entry: FeedEntry = {
      id: randomUUID(),
      sessionId: command.sessionId,
      kind: 'command',
      type: command.type,
      sourceAgentId: command.sourceAgentId,
      targetAgentId: command.targetAgentId,
      data: command.data,
      summary: command.summary,
      timestamp: command.timestamp,
    };

    this.appendToFeed(entry);

    if (command.targetAgentId) {
      // Directed: emit to specific agent
      this.emit(`command:${command.targetAgentId}`, command);
    } else {
      // Broadcast command
      this.emit('command:*', command);
    }

    this.emit('command', command);
    this.emit('feed', entry);
    return entry;
  }

  /** Convenience helper to create and send a command */
  emitCommand(type: ResearchCommandType, sessionId: string, extra?: { sourceAgentId?: string | null; targetAgentId?: string | null; data?: unknown; summary?: string }): FeedEntry {
    return this.sendCommand({
      type,
      sessionId,
      sourceAgentId: extra?.sourceAgentId ?? null,
      targetAgentId: extra?.targetAgentId ?? null,
      timestamp: Date.now(),
      data: extra?.data,
      summary: extra?.summary,
    });
  }

  /** Subscribe to commands for a specific agent */
  onCommandForAgent(agentId: string, handler: (command: ResearchCommand) => void): () => void {
    const key = `command:${agentId}`;
    this.on(key, handler);
    // Also listen for broadcast commands
    const broadcastHandler = (cmd: ResearchCommand) => handler(cmd);
    this.on('command:*', broadcastHandler);
    return () => {
      this.off(key, handler);
      this.off('command:*', broadcastHandler);
    };
  }

  /** Subscribe to all commands */
  onCommand(handler: (command: ResearchCommand) => void): () => void {
    this.on('command', handler);
    return () => this.off('command', handler);
  }

  // ── Feed ──

  /** Subscribe to all feed entries (events + commands) */
  onFeed(handler: (entry: FeedEntry) => void): () => void {
    this.on('feed', handler);
    return () => this.off('feed', handler);
  }

  /** Get the full feed for a session */
  getFeed(sessionId: string): FeedEntry[] {
    return this.feeds.get(sessionId) ?? [];
  }

  /** Get feed entries filtered by kind and/or agent */
  queryFeed(sessionId: string, filters?: { kind?: FeedEntry['kind']; agentId?: string; limit?: number }): FeedEntry[] {
    let entries = this.getFeed(sessionId);

    if (filters?.kind) {
      entries = entries.filter((e) => e.kind === filters.kind);
    }
    if (filters?.agentId) {
      entries = entries.filter((e) => e.sourceAgentId === filters.agentId || e.targetAgentId === filters.agentId);
    }
    if (filters?.limit && filters.limit > 0) {
      entries = entries.slice(-filters.limit);
    }

    return entries;
  }

  /** Clear feed for a session */
  clearFeed(sessionId: string): void {
    this.feeds.delete(sessionId);
  }

  // ── Internal ──

  private appendToFeed(entry: FeedEntry): void {
    let feed = this.feeds.get(entry.sessionId);
    if (!feed) {
      feed = [];
      this.feeds.set(entry.sessionId, feed);
    }
    feed.push(entry);
  }
}

/** Singleton event bus for the research team module */
export const researchEventBus = new ResearchEventBus();
