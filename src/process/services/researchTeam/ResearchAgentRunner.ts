/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IResponseMessage } from '@/common/ipcBridge';
import type { AcpBackend } from '@/types/acpTypes';
import { researchEventBus } from './ResearchEventBus';
import type { ResearchAgentRole, ResearchCommand } from './types';

/**
 * ResearchAgentRunner — Manages a single independent research agent.
 *
 * Unlike TeamAgentRunner (which runs prompt→finish in a loop),
 * ResearchAgentRunner runs continuously in the background:
 * 1. Starts with an initial objective
 * 2. Streams output and publishes events to the feed
 * 3. Listens for incoming commands from other agents
 * 4. Can receive follow-up messages at any time
 *
 * AcpAgent is loaded lazily to avoid pulling Electron at import time.
 */
export class ResearchAgentRunner {
  readonly id: string;
  readonly name: string;
  readonly role: ResearchAgentRole;
  readonly sessionId: string;

  private agent: unknown = null;
  private output = '';
  private running = false;
  private commandUnsubscribe: (() => void) | null = null;

  constructor(
    private readonly config: {
      id: string;
      name: string;
      role: ResearchAgentRole;
      sessionId: string;
      backend: AcpBackend;
      workingDir: string;
      cliPath?: string;
    }
  ) {
    this.id = config.id;
    this.name = config.name;
    this.role = config.role;
    this.sessionId = config.sessionId;
  }

  /** Start the agent process and begin listening for commands */
  async start(): Promise<void> {
    const { AcpAgent } = await import('@/agent/acp');

    const agent = new AcpAgent({
      id: this.id,
      backend: this.config.backend,
      cliPath: this.config.cliPath,
      workingDir: this.config.workingDir,
      extra: {
        workspace: this.config.workingDir,
        backend: this.config.backend,
        cliPath: this.config.cliPath,
      },
      onStreamEvent: (data: IResponseMessage) => this.handleStreamEvent(data),
    });

    this.agent = agent;
    this.running = true;
    await agent.start();

    // Listen for commands directed at this agent
    this.commandUnsubscribe = researchEventBus.onCommandForAgent(this.id, (cmd) => this.handleCommand(cmd));

    researchEventBus.emitEvent('agent_started', this.sessionId, {
      agentId: this.id,
      summary: `${this.name} (${this.role}) started`,
      data: { name: this.name, role: this.role, backend: this.config.backend },
    });
  }

  /** Send initial objective to start the agent working */
  async sendObjective(objective: string): Promise<void> {
    if (!this.agent) return;

    const prompt = this.buildPrompt(objective);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.agent as any).sendMessage({ content: prompt });
  }

  /** Send a follow-up message to the agent */
  async sendMessage(content: string): Promise<void> {
    if (!this.agent || !this.running) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.agent as any).sendMessage({ content });

    researchEventBus.emitEvent('agent_output', this.sessionId, {
      agentId: this.id,
      summary: `Message sent to ${this.name}`,
      data: { direction: 'inbound', preview: content.slice(0, 200) },
    });
  }

  /** Pause the agent (stops accepting new work but doesn't kill process) */
  pause(): void {
    this.running = false;
    researchEventBus.emitEvent('agent_paused', this.sessionId, {
      agentId: this.id,
      summary: `${this.name} paused`,
    });
  }

  /** Resume a paused agent */
  resume(): void {
    this.running = true;
    researchEventBus.emitEvent('agent_resumed', this.sessionId, {
      agentId: this.id,
      summary: `${this.name} resumed`,
    });
  }

  /** Stop and clean up the agent process */
  async stop(): Promise<void> {
    this.running = false;

    if (this.commandUnsubscribe) {
      this.commandUnsubscribe();
      this.commandUnsubscribe = null;
    }

    if (this.agent) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (this.agent as any).stop();
      } catch {
        // Best-effort stop
      }
      this.agent = null;
    }

    researchEventBus.emitEvent('agent_finished', this.sessionId, {
      agentId: this.id,
      summary: `${this.name} stopped`,
      data: { outputLength: this.output.length },
    });
  }

  /** Get accumulated output */
  getOutput(): string {
    return this.output;
  }

  /** Check if agent is running */
  isRunning(): boolean {
    return this.running;
  }

  // ── Internal ──

  private handleStreamEvent(data: IResponseMessage): void {
    if (data.type === 'content' && typeof data.data === 'string') {
      this.output += data.data;
      researchEventBus.emitEvent('agent_output', this.sessionId, {
        agentId: this.id,
        data: { chunk: data.data, role: this.role, name: this.name },
      });
    } else if (data.type === 'finish') {
      this.running = false;
      researchEventBus.emitEvent('agent_finished', this.sessionId, {
        agentId: this.id,
        summary: `${this.name} finished`,
        data: { outputLength: this.output.length },
      });
    }
  }

  private handleCommand(command: ResearchCommand): void {
    if (!this.running && command.type !== 'resume') return;

    switch (command.type) {
      case 'send_message':
        if (typeof command.data === 'object' && command.data && 'content' in command.data) {
          this.sendMessage((command.data as { content: string }).content).catch(() => {});
        }
        break;
      case 'pause':
        this.pause();
        break;
      case 'resume':
        this.resume();
        break;
      case 'stop':
        this.stop().catch(() => {});
        break;
      default:
        // Other commands forwarded as messages to the agent
        if (command.summary || command.data) {
          const content = command.summary ?? JSON.stringify(command.data);
          this.sendMessage(`[${command.type}] ${content}`).catch(() => {});
        }
        break;
    }
  }

  private buildPrompt(objective: string): string {
    const roleInstructions: Record<ResearchAgentRole, string> = {
      researcher: `You are a Research Agent. Your job is to investigate, explore, and gather information autonomously.
When you discover important findings, clearly state them.
Work independently — you will receive commands from other agents via messages.`,

      analyst: `You are an Analyst Agent. Your job is to analyze data, code, or information provided to you.
Provide structured analysis with clear conclusions.
Work independently — you will receive commands from other agents via messages.`,

      reviewer: `You are a Review Agent. Your job is to review work done by other agents.
Check for correctness, completeness, and quality. Provide actionable feedback.
Work independently — you will receive commands from other agents via messages.`,

      custom: `You are a team agent working on a collaborative research task.
Work independently and communicate your findings clearly.`,
    };

    return `[TEAM ROLE: ${this.name} — ${this.role}]

${roleInstructions[this.role]}

## Your Objective
${objective}

## Instructions
- Work autonomously to complete your objective
- Be thorough and report your findings clearly
- You may receive follow-up messages or commands from teammates
- Provide clear summaries of your progress and findings`;
  }
}
