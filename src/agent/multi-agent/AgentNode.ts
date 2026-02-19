/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * AgentNode — Represents one AI agent participant on the bus.
 *
 * Each node:
 *   - Wraps an AcpAgentManager (conversation)
 *   - Listens to channelEventBus for its conversation's events
 *   - Accumulates streaming content
 *   - Publishes finished responses onto the AgentBus
 *   - Receives messages from the bus and forwards to its agent via sendMessage()
 */

import { channelEventBus, type IAgentMessageEvent } from '@/channels/agent/ChannelEventBus';
import { uuid } from '@/common/utils';
import type AcpAgentManager from '@/process/task/AcpAgentManager';
import type { AgentBus } from './AgentBus';
import type { AgentNodeConfig, AgentRole, BusMessage } from './types';

export class AgentNode {
  readonly id: string;
  readonly role: AgentRole;
  readonly label: string;
  readonly config: AgentNodeConfig;

  private bus: AgentBus;
  private task: AcpAgentManager | null = null;
  private conversationId = '';
  private accumulatedContent = '';
  private unsubscribe: (() => void) | null = null;
  private active = false;

  constructor(config: AgentNodeConfig, bus: AgentBus) {
    this.id = config.id;
    this.role = config.role;
    this.label = config.label || config.id;
    this.config = config;
    this.bus = bus;
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
   * Send a message into this node's agent.
   */
  async deliver(message: BusMessage): Promise<void> {
    if (!this.task) {
      throw new Error(`[AgentNode:${this.id}] No task attached, cannot deliver`);
    }

    await this.task.sendMessage({
      content: message.content,
      msg_id: uuid(),
    });

    this.bus.delivered(message, this.id);
  }

  /**
   * Send the initial prompt to bootstrap this node's agent.
   */
  async sendInitialPrompt(content: string): Promise<void> {
    if (!this.task) {
      throw new Error(`[AgentNode:${this.id}] No task attached`);
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

      // On finish, publish to bus
      if (event.type === 'finish') {
        const content = this.accumulatedContent;
        this.accumulatedContent = '';

        if (content) {
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
