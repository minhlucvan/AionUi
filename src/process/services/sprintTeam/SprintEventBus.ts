/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import type { SprintEvent, SprintEventType } from './types';

/**
 * Feed entry for the sprint activity log.
 * Records all events chronologically for observability.
 */
export type SprintFeedEntry = {
  id: string;
  sessionId: string;
  type: SprintEventType;
  agentId?: string;
  taskId?: string;
  sprintNumber?: number;
  data?: unknown;
  timestamp: number;
};

/**
 * SprintEventBus — Typed event bus for the sprint team module.
 *
 * Provides:
 * 1. Typed event publish/subscribe for sprint lifecycle
 * 2. Chronological feed for UI and debugging
 * 3. Session-scoped feed querying
 */
class SprintEventBus extends EventEmitter {
  private feeds = new Map<string, SprintFeedEntry[]>();

  constructor() {
    super();
    this.setMaxListeners(100);
  }

  /** Emit a typed sprint event and record to feed */
  publish(type: SprintEventType, sessionId: string, extra?: { agentId?: string; taskId?: string; sprintNumber?: number; data?: unknown }): SprintFeedEntry {
    const event: SprintEvent = {
      type,
      sessionId,
      timestamp: Date.now(),
      ...extra,
    };

    const entry: SprintFeedEntry = {
      id: randomUUID(),
      sessionId: event.sessionId,
      type: event.type,
      agentId: event.agentId,
      taskId: event.taskId,
      sprintNumber: event.sprintNumber,
      data: event.data,
      timestamp: event.timestamp,
    };

    this.appendToFeed(entry);
    this.emit('sprint_event', event);
    this.emit(event.type, event);
    this.emit('feed', entry);
    return entry;
  }

  /** Subscribe to all sprint events */
  onSprintEvent(handler: (event: SprintEvent) => void): () => void {
    this.on('sprint_event', handler);
    return () => this.off('sprint_event', handler);
  }

  /** Subscribe to a specific event type */
  onEventType(type: SprintEventType, handler: (event: SprintEvent) => void): () => void {
    this.on(type, handler);
    return () => this.off(type, handler);
  }

  /** Subscribe to all feed entries */
  onFeed(handler: (entry: SprintFeedEntry) => void): () => void {
    this.on('feed', handler);
    return () => this.off('feed', handler);
  }

  /** Get the full feed for a session */
  getFeed(sessionId: string): SprintFeedEntry[] {
    return this.feeds.get(sessionId) ?? [];
  }

  /** Query feed entries with filters */
  queryFeed(sessionId: string, filters?: { type?: SprintEventType; agentId?: string; sprintNumber?: number; limit?: number }): SprintFeedEntry[] {
    let entries = this.getFeed(sessionId);

    if (filters?.type) {
      entries = entries.filter((e) => e.type === filters.type);
    }
    if (filters?.agentId) {
      entries = entries.filter((e) => e.agentId === filters.agentId);
    }
    if (filters?.sprintNumber !== undefined) {
      entries = entries.filter((e) => e.sprintNumber === filters.sprintNumber);
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

  private appendToFeed(entry: SprintFeedEntry): void {
    let feed = this.feeds.get(entry.sessionId);
    if (!feed) {
      feed = [];
      this.feeds.set(entry.sessionId, feed);
    }
    feed.push(entry);
  }
}

/** Singleton event bus for the sprint team module */
export const sprintEventBus = new SprintEventBus();
