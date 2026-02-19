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
 *   - Runs per-node hooks (onNodeReceive, onNodeResponse) for custom behavior
 */

import { channelEventBus, type IAgentMessageEvent } from '@/channels/agent/ChannelEventBus';
import { uuid } from '@/common/utils';
import type AcpAgentManager from '@/process/task/AcpAgentManager';
import type { AgentBus } from './AgentBus';
import type { FileRelay } from './FileRelay';
import type { NodeHookRunner } from './NodeHookRunner';
import type { NodeHookResult } from './NodeHookTypes';
import type { AgentNodeConfig, AgentRole, BusMessage } from './types';

/**
 * Callback for hook side-effects that the orchestrator must handle
 * (bus routing, completion signaling).
 */
export type NodeHookCallback = (nodeId: string, result: NodeHookResult) => void;

export class AgentNode {
  readonly id: string;
  readonly role: AgentRole;
  readonly label: string;
  readonly config: AgentNodeConfig;

  private bus: AgentBus;
  private fileRelay: FileRelay | null = null;
  private hookRunner: NodeHookRunner | null = null;
  private onHookResult: NodeHookCallback | null = null;
  private task: AcpAgentManager | null = null;
  private conversationId = '';
  private accumulatedContent = '';
  private outboxTurn = 0;
  private unsubscribe: (() => void) | null = null;
  private active = false;

  constructor(config: AgentNodeConfig, bus: AgentBus, fileRelay?: FileRelay, hookRunner?: NodeHookRunner) {
    this.id = config.id;
    this.role = config.role;
    this.label = config.label || config.id;
    this.config = config;
    this.bus = bus;
    this.fileRelay = fileRelay || null;
    this.hookRunner = hookRunner || null;
  }

  /**
   * Set the callback for hook side-effects.
   */
  setHookCallback(callback: NodeHookCallback): void {
    this.onHookResult = callback;
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
   * Runs onNodeReceive hooks first — hooks can transform, block, or trigger
   * side-effects (busMessages, queueMessages).
   */
  async deliver(message: BusMessage): Promise<void> {
    if (!this.task) {
      throw new Error(`[AgentNode:${this.id}] No task attached, cannot deliver`);
    }

    const turn = (message.meta?.turn as number) || 0;
    let content = message.content;

    // Run onNodeReceive hooks
    if (this.hookRunner) {
      const hookResult = await this.hookRunner.run('onNodeReceive', {
        turn,
        content,
        from: message.from,
      });

      // Hook can block delivery
      if (hookResult.blocked) {
        return;
      }

      // Hook can transform content
      if (hookResult.content !== undefined) {
        content = hookResult.content;
      }

      // Hook can queue extra messages or route to bus
      this.emitHookResult(hookResult);
    }

    // Write to inbox file for debugging
    if (this.fileRelay && turn) {
      this.fileRelay.writeInbox(this.id, turn, message.from, content);
    }

    // Route through the agent's dedicated message queue
    this.task.enqueueMessages([
      {
        content,
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
   * Run onNodeInit hooks. Called by the orchestrator after attach.
   */
  async runInitHooks(): Promise<void> {
    if (!this.hookRunner) return;

    const result = await this.hookRunner.run('onNodeInit');
    this.emitHookResult(result);
  }

  /**
   * Run onNodeComplete hooks. Called by the orchestrator on finish.
   */
  async runCompleteHooks(): Promise<void> {
    if (!this.hookRunner) return;

    const result = await this.hookRunner.run('onNodeComplete', {
      turn: this.outboxTurn,
    });
    this.emitHookResult(result);
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
   * When the agent finishes a turn, run hooks and publish to bus.
   */
  private subscribeToConversation(): void {
    this.unsubscribe = channelEventBus.onAgentMessage((event: IAgentMessageEvent) => {
      if (!this.active) return;
      if (event.conversation_id !== this.conversationId) return;

      // Accumulate streaming text
      if (event.type === 'content' && typeof event.data === 'string') {
        this.accumulatedContent += event.data;
      }

      // On finish, run hooks, write outbox, and publish to bus
      if (event.type === 'finish') {
        const content = this.accumulatedContent;
        this.accumulatedContent = '';

        if (content) {
          this.outboxTurn++;
          void this.handleTurnFinish(content);
        }
      }
    });
  }

  /**
   * Handle a completed turn: run hooks, write files, publish to bus.
   */
  private async handleTurnFinish(content: string): Promise<void> {
    const turn = this.outboxTurn;

    // Write to outbox file for debugging
    if (this.fileRelay) {
      this.fileRelay.writeOutbox(this.id, turn, content);
    }

    // Run onNodeResponse hooks
    if (this.hookRunner) {
      const hookResult = await this.hookRunner.run('onNodeResponse', {
        turn,
        content,
      });

      this.emitHookResult(hookResult);

      // Hook can signal completion — don't publish to bus, let orchestrator handle
      if (hookResult.complete) {
        return;
      }
    }

    // Publish to bus for routing to other agents
    this.bus.publish({
      id: uuid(),
      from: this.id,
      content,
      timestamp: Date.now(),
    });
  }

  /**
   * Emit hook side-effects to the orchestrator.
   */
  private emitHookResult(result: NodeHookResult): void {
    if (!result) return;

    // Queue extra messages into this agent's own queue
    if (result.queueMessages?.length && this.task) {
      this.task.enqueueMessages(
        result.queueMessages.map((m) => ({
          content: m.content,
          files: m.files,
          priority: m.priority || 'normal',
          source: 'system' as const,
        }))
      );
    }

    // Forward busMessages and complete signals to the orchestrator
    if ((result.busMessages?.length || result.complete) && this.onHookResult) {
      this.onHookResult(this.id, result);
    }
  }
}
