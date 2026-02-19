/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * AgentNode — Represents one isolated AI agent on the bus.
 *
 * Each node:
 *   - Wraps an AcpAgentManager (conversation)
 *   - Delivers messages through the agent's own AcpMessageQueue (isolation)
 *   - Listens to channelEventBus for its conversation's events
 *   - Accumulates streaming content
 *   - Publishes finished responses onto the AgentBus
 *   - Optionally writes inbox/outbox to disk via FileRelay
 */

import { channelEventBus, type IAgentMessageEvent } from '@/channels/agent/ChannelEventBus';
import { uuid } from '@/common/utils';
import type AcpAgentManager from '@/process/task/AcpAgentManager';
import type { AgentBus } from './AgentBus';
import type { FileRelay } from './FileRelay';
import type { AgentNodeConfig, AgentRole, BusMessage } from './types';

export class AgentNode {
  readonly id: string;
  readonly role: AgentRole;
  readonly label: string;
  readonly config: AgentNodeConfig;

  private bus: AgentBus;
  private fileRelay: FileRelay | null = null;
  private task: AcpAgentManager | null = null;
  private conversationId = '';
  private accumulatedContent = '';
  private outboxTurn = 0;
  private unsubscribe: (() => void) | null = null;
  private active = false;

  constructor(config: AgentNodeConfig, bus: AgentBus, fileRelay?: FileRelay) {
    this.id = config.id;
    this.role = config.role;
    this.label = config.label || config.id;
    this.config = config;
    this.bus = bus;
    this.fileRelay = fileRelay || null;
  }

  /**
   * Attach an ACP conversation/task to this node.
   */
  attach(conversationId: string, task: AcpAgentManager): void {
    this.conversationId = conversationId;
    this.task = task;
    this.active = true;
    this.subscribeToConversation();
  }

  /**
   * Deliver a message to this node's agent through its AcpMessageQueue.
   * This ensures proper isolation — each agent only processes messages
   * sequentially through its own queue.
   */
  async deliver(message: BusMessage): Promise<void> {
    if (!this.task) {
      throw new Error(`[AgentNode:${this.id}] No task attached, cannot deliver`);
    }

    // Write to inbox file for debugging
    if (this.fileRelay && message.meta?.turn) {
      this.fileRelay.writeInbox(this.id, message.meta.turn as number, message.from, message.content);
    }

    // Route through the agent's dedicated message queue
    this.task.enqueueMessages([
      {
        content: message.content,
        priority: 'normal',
        source: 'system',
      },
    ]);

    this.bus.delivered(message, this.id);
  }

  /**
   * Send the initial prompt to bootstrap this node's agent.
   * Uses direct sendMessage since the queue is idle at this point.
   */
  async sendInitialPrompt(content: string): Promise<void> {
    if (!this.task) {
      throw new Error(`[AgentNode:${this.id}] No task attached`);
    }

    // Write initial prompt to file
    if (this.fileRelay) {
      this.fileRelay.writeInitialPrompt(this.id, content);
    }

    await this.task.sendMessage({
      content,
      msg_id: uuid(),
    });
  }

  /**
   * Detach from the conversation and stop listening.
   */
  detach(): void {
    this.active = false;
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  getConversationId(): string {
    return this.conversationId;
  }

  isActive(): boolean {
    return this.active;
  }

  /**
   * Subscribe to channelEventBus to capture this agent's responses.
   * When the agent finishes a turn, publish the accumulated content to the bus.
   */
  private subscribeToConversation(): void {
    this.unsubscribe = channelEventBus.onAgentMessage((event: IAgentMessageEvent) => {
      if (!this.active) return;
      if (event.conversation_id !== this.conversationId) return;

      // Accumulate streaming text
      if (event.type === 'content' && typeof event.data === 'string') {
        this.accumulatedContent += event.data;
      }

      // On finish, write outbox and publish to bus
      if (event.type === 'finish') {
        const content = this.accumulatedContent;
        this.accumulatedContent = '';

        if (content) {
          this.outboxTurn++;

          // Write to outbox file for debugging
          if (this.fileRelay) {
            this.fileRelay.writeOutbox(this.id, this.outboxTurn, content);
          }

          this.bus.publish({
            id: uuid(),
            from: this.id,
            content,
            timestamp: Date.now(),
          });
        }
      }
    });
  }
}
