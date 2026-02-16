/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { EventEmitter } from 'events';
import type { TeamEvent, TeamEventType } from './types';

/**
 * TeamEventBus — Typed event bus for inter-agent communication.
 *
 * All agents in a team session publish and subscribe to events through
 * this bus. The orchestrator listens to coordinate the workflow.
 * External consumers (IPC bridge, UI) can also subscribe.
 */
class TeamEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  /** Emit a typed team event */
  emitTeamEvent(event: TeamEvent): void {
    this.emit('team_event', event);
    this.emit(event.type, event);
  }

  /** Subscribe to all team events */
  onTeamEvent(handler: (event: TeamEvent) => void): () => void {
    this.on('team_event', handler);
    return () => this.off('team_event', handler);
  }

  /** Subscribe to a specific event type */
  onEventType(type: TeamEventType, handler: (event: TeamEvent) => void): () => void {
    this.on(type, handler);
    return () => this.off(type, handler);
  }

  /** Helper to create and emit an event */
  publish(
    type: TeamEventType,
    sessionId: string,
    extra?: { agentId?: string; missionId?: string; data?: unknown }
  ): void {
    this.emitTeamEvent({
      type,
      sessionId,
      timestamp: Date.now(),
      ...extra,
    });
  }

  /** Remove all listeners for a specific session (cleanup) */
  clearSession(sessionId: string): void {
    // We don't filter by session — just reset if needed.
    // Listeners are expected to filter by sessionId themselves.
    // This is a no-op placeholder for future per-session isolation.
  }
}

/** Singleton event bus shared across the team control module */
export const teamEventBus = new TeamEventBus();
