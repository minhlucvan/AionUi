/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IResponseMessage } from '@/common/ipcBridge';
import type { AcpBackend } from '@/types/acpTypes';
import { researchEventBus } from './ResearchEventBus';
import { StreamingToolParser } from './TeamToolParser';
import { TeamToolExecutor } from './TeamToolExecutor';
import { buildTeamToolsPrompt } from './TeamToolDefinitions';
import type { BoardManager } from './BoardManager';
import type { ResearchAgentRole, ResearchCommand } from './types';

/**
 * ResearchAgentRunner — Manages a single independent team agent.
 *
 * Follows a Kanban-style workflow:
 * 1. Starts with an initial objective (with 3 team tools injected)
 * 2. Agent works autonomously using native file tools
 * 3. Agent writes artifacts to .team/artifacts/
 * 4. Agent uses board_update to report progress
 * 5. Agent uses notify to signal teammates
 * 6. Agent uses board_read to check team state
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
  private toolParser = new StreamingToolParser();
  private toolExecutor: TeamToolExecutor | null = null;

  /** Teammates info — set by the manager before sending objective */
  private teammates: Array<{ id: string; name: string; role: string; status: string }> = [];
  private board: BoardManager | null = null;

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

  /** Set teammates and board so the runner can resolve agent names and manage the board */
  setTeammates(teammates: Array<{ id: string; name: string; role: string; status: string }>, board: BoardManager): void {
    this.teammates = teammates;
    this.board = board;

    // (Re)create tool executor with updated agent lookup and board
    this.toolExecutor = new TeamToolExecutor(
      this.sessionId,
      {
        resolveAgentId: (name: string) => {
          const agent = this.teammates.find((t) => t.name.toLowerCase() === name.toLowerCase() || t.id === name);
          return agent?.id ?? null;
        },
        getAgents: () => this.teammates,
      },
      board
    );
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

    // Update board status to done
    this.board?.updateAgent(this.id, { status: 'done', message: 'Agent stopped' });

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

      // Parse any team tool calls from the output stream
      this.processToolCalls(data.data);
    } else if (data.type === 'finish') {
      this.running = false;
      this.toolParser.reset();

      // Mark done on the board
      this.board?.updateAgent(this.id, { status: 'done', message: 'Finished working' });

      researchEventBus.emitEvent('agent_finished', this.sessionId, {
        agentId: this.id,
        summary: `${this.name} finished`,
        data: { outputLength: this.output.length },
      });
    }
  }

  /**
   * Feed output chunk to the streaming tool parser.
   * Any complete tool calls are executed and results sent back to the agent.
   */
  private processToolCalls(chunk: string): void {
    if (!this.toolExecutor) return;

    const calls = this.toolParser.feed(chunk);
    if (calls.length === 0) return;

    for (const call of calls) {
      const result = this.toolExecutor.execute(call, this.id);

      // Emit tool call event to the feed
      researchEventBus.emitEvent('agent_output', this.sessionId, {
        agentId: this.id,
        summary: `${this.name} called tool: ${call.name}${call.target ? ` → ${call.target}` : ''}`,
        data: {
          toolCall: true,
          toolName: call.name,
          target: call.target,
          success: result.success,
          resultMessage: result.message,
        },
      });

      // Send the result back to the agent as a follow-up message
      // (async, don't block the stream)
      if (result.message) {
        const resultText = `[TOOL RESULT: ${call.name}] ${result.message}`;
        this.sendMessage(resultText).catch(() => {});
      }
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
Write your findings as artifact files. Update the board as you make progress.`,

      analyst: `You are an Analyst Agent. Your job is to analyze data, code, or information.
Write structured analysis as artifact files. Update the board with conclusions.`,

      reviewer: `You are a Review Agent. Your job is to review work produced by other agents.
Read their artifacts, assess quality, and write review notes as your own artifacts.`,

      custom: `You are a team agent working on a collaborative task.
Write your work output as artifact files and coordinate via the board.`,
    };

    // Build team tools prompt with teammate information and workspace paths
    const teammateInfo = this.teammates
      .filter((t) => t.id !== this.id)
      .map((t) => ({ name: t.name, role: t.role }));

    const boardPath = this.board?.getBoardFilePath() ?? `${this.config.workingDir}/.team/board.md`;
    const artifactsDir = this.board?.getArtifactsDir() ?? `${this.config.workingDir}/.team/artifacts`;

    const teamToolsPrompt = buildTeamToolsPrompt(this.name, teammateInfo, boardPath, artifactsDir);

    return `[TEAM AGENT: ${this.name} — ${this.role}]

${roleInstructions[this.role]}

${teamToolsPrompt}

## Your Objective
${objective}

## Workflow
1. Start by reading the board to check team state
2. Work on your objective using your native tools (Read, Write, Edit, Bash, Grep, Glob)
3. Write any shareable output to ${artifactsDir}/<descriptive-name>.md
4. Update the board with your progress (board_update)
5. Notify relevant teammates when they need to act (notify)
6. When done, update the board with status: done`;
  }
}
