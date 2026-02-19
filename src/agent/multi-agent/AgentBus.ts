/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * AgentBus — Shared event-driven message bus for multi-agent communication.
 *
 * Works like a lightweight event bus / message broker:
 *   1. Agents publish messages when they finish a turn
 *   2. The bus routes messages to the correct recipients based on topology
 *   3. Listeners (orchestrator, UI, logs) can observe all traffic
 *
 * Decouples agents from each other — they only know about the bus,
 * not about who is on the other end.
 */

import { EventEmitter } from 'events';
import type { BusEvent, BusEventType, BusMessage } from './types';

export type BusListener = (event: BusEvent) => void;

export class AgentBus extends EventEmitter {
  private messageLog: BusMessage[] = [];

  constructor() {
    super();
    this.setMaxListeners(50);
  }

  /**
   * Publish a message onto the bus (agent finished a turn).
   */
  publish(message: BusMessage): void {
    this.messageLog.push(message);

    this.emitBusEvent({
      type: 'agent:response',
      message,
      nodeId: message.from,
    });
  }

  /**
   * Signal that a message was delivered to a target agent.
   */
  delivered(message: BusMessage, targetNodeId: string): void {
    this.emitBusEvent({
      type: 'agent:delivered',
      message,
      nodeId: targetNodeId,
    });
  }

  /**
   * Signal an agent-level error.
   */
  error(nodeId: string, error: string): void {
    this.emitBusEvent({
      type: 'agent:error',
      nodeId,
      error,
    });
  }

  /**
   * Signal bus-level completion.
   */
  complete(meta?: Record<string, unknown>): void {
    this.emitBusEvent({
      type: 'bus:complete',
      meta,
    });
  }

  /**
   * Signal bus-level status change.
   */
  status(meta: Record<string, unknown>): void {
    this.emitBusEvent({
      type: 'bus:status',
      meta,
    });
  }

  /**
   * Subscribe to a specific event type.
   */
  onEvent(type: BusEventType, listener: BusListener): () => void {
    const handler = (event: BusEvent) => {
      if (event.type === type) listener(event);
    };
    this.on('bus', handler);
    return () => this.off('bus', handler);
  }

  /**
   * Subscribe to all events.
   */
  onAll(listener: BusListener): () => void {
    this.on('bus', listener);
    return () => this.off('bus', listener);
  }

  /**
   * Get full message history.
   */
  getMessageLog(): BusMessage[] {
    return [...this.messageLog];
  }

  /**
   * Get messages from a specific node.
   */
  getMessagesFrom(nodeId: string): BusMessage[] {
    return this.messageLog.filter((m) => m.from === nodeId);
  }

  /**
   * Clear all state (for reuse or testing).
   */
  reset(): void {
    this.messageLog = [];
    this.removeAllListeners('bus');
  }

  private emitBusEvent(event: BusEvent): void {
    this.emit('bus', event);
  }
}
