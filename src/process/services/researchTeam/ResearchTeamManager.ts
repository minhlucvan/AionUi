/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { randomUUID } from 'crypto';
import { researchEventBus } from './ResearchEventBus';
import { ResearchAgentRunner } from './ResearchAgentRunner';
import { BoardManager } from './BoardManager';
import type { FeedEntry, ResearchAgent, ResearchSession, ResearchSessionConfig, ResearchSessionStatus } from './types';

/**
 * ResearchTeamManager — Manages team sessions with a Kanban-style board.
 *
 * Key design:
 * - Agents run concurrently and independently
 * - A shared BoardManager provides the team board file (.team/board.md)
 * - Agents write artifacts to .team/artifacts/ using native file tools
 * - 3 team tools (board_update, board_read, notify) handle coordination
 * - All activity flows into the unified feed for observability
 */
export class ResearchTeamManager {
  private sessions = new Map<string, ResearchSession>();
  private runners = new Map<string, ResearchAgentRunner>();
  private boards = new Map<string, BoardManager>();

  /** Start a new research session with multiple independent agents */
  async startSession(config: ResearchSessionConfig): Promise<ResearchSession> {
    const sessionId = randomUUID();

    const session: ResearchSession = {
      id: sessionId,
      conversationId: config.conversationId,
      objective: config.objective,
      status: 'running',
      agents: [],
      workingDir: config.workingDir,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.sessions.set(sessionId, session);

    // Create the shared board for this session
    const board = new BoardManager(config.workingDir, sessionId, config.objective);
    this.boards.set(sessionId, board);

    researchEventBus.emitEvent('session_started', sessionId, {
      summary: `Team session started: ${config.objective.slice(0, 100)}`,
      data: {
        objective: config.objective,
        agentCount: config.agents.length,
        boardPath: board.getBoardFilePath(),
        artifactsDir: board.getArtifactsDir(),
      },
    });

    // Phase 1: Create all agents and runners
    const agentConfigs: Array<{ agentId: string; agentConfig: (typeof config.agents)[0]; agent: ResearchAgent; runner: ResearchAgentRunner }> = [];

    for (const agentConfig of config.agents) {
      const agentId = agentConfig.id ?? randomUUID();

      const agent: ResearchAgent = {
        id: agentId,
        name: agentConfig.name,
        role: agentConfig.role,
        backend: agentConfig.backend,
        status: 'starting',
        objective: agentConfig.objective,
        output: '',
        startedAt: Date.now(),
      };

      session.agents.push(agent);

      // Register agent on the board
      board.registerAgent(agentId, agentConfig.name, agentConfig.role);

      const runner = new ResearchAgentRunner({
        id: agentId,
        name: agentConfig.name,
        role: agentConfig.role,
        sessionId,
        backend: agentConfig.backend,
        workingDir: config.workingDir,
        cliPath: agentConfig.cliPath,
      });

      this.runners.set(agentId, runner);
      agentConfigs.push({ agentId, agentConfig, agent, runner });
    }

    // Phase 2: Wire up teammates + board on all runners
    const teammates = session.agents.map((a) => ({ id: a.id, name: a.name, role: a.role, status: a.status }));
    for (const { runner } of agentConfigs) {
      runner.setTeammates(teammates, board);
    }

    // Phase 3: Start all agents and send objectives
    const spawnPromises = agentConfigs.map(async ({ agentId, agentConfig, agent, runner }) => {
      try {
        await runner.start();
        agent.status = 'running';
        board.updateAgent(agentId, { status: 'working', message: agentConfig.objective.slice(0, 100) });

        // Send objective — agent works independently from here
        runner.sendObjective(agentConfig.objective).catch((err) => {
          agent.status = 'error';
          agent.error = err instanceof Error ? err.message : String(err);
          board.updateAgent(agentId, { status: 'blocked', message: `Error: ${agent.error}` });
          researchEventBus.emitEvent('agent_error', sessionId, {
            agentId,
            summary: `${agentConfig.name} failed to start objective`,
            data: { error: agent.error },
          });
        });
      } catch (err) {
        agent.status = 'error';
        agent.error = err instanceof Error ? err.message : String(err);
        board.updateAgent(agentId, { status: 'blocked', message: `Error: ${agent.error}` });
        researchEventBus.emitEvent('agent_error', sessionId, {
          agentId,
          summary: `${agentConfig.name} failed to start`,
          data: { error: agent.error },
        });
      }
    });

    await Promise.allSettled(spawnPromises);
    session.updatedAt = Date.now();

    // Watch for all agents finishing
    this.watchForCompletion(sessionId);

    return session;
  }

  /** Add a new agent to a running session */
  async addAgent(sessionId: string, agentConfig: ResearchSessionConfig['agents'][0]): Promise<ResearchAgent | null> {
    const session = this.sessions.get(sessionId);
    const board = this.boards.get(sessionId);
    if (!session || !board || session.status !== 'running') return null;

    const agentId = agentConfig.id ?? randomUUID();

    const agent: ResearchAgent = {
      id: agentId,
      name: agentConfig.name,
      role: agentConfig.role,
      backend: agentConfig.backend,
      status: 'starting',
      objective: agentConfig.objective,
      output: '',
      startedAt: Date.now(),
    };

    session.agents.push(agent);
    board.registerAgent(agentId, agentConfig.name, agentConfig.role);

    const runner = new ResearchAgentRunner({
      id: agentId,
      name: agentConfig.name,
      role: agentConfig.role,
      sessionId,
      backend: agentConfig.backend,
      workingDir: session.workingDir,
      cliPath: agentConfig.cliPath,
    });

    this.runners.set(agentId, runner);

    // Wire up teammates + board (including the new agent)
    const teammates = session.agents.map((a) => ({ id: a.id, name: a.name, role: a.role, status: a.status }));
    runner.setTeammates(teammates, board);

    // Also update teammates on existing runners so they know about the new agent
    for (const existingAgent of session.agents) {
      if (existingAgent.id !== agentId) {
        const existingRunner = this.runners.get(existingAgent.id);
        existingRunner?.setTeammates(teammates, board);
      }
    }

    try {
      await runner.start();
      agent.status = 'running';
      board.updateAgent(agentId, { status: 'working', message: agentConfig.objective.slice(0, 100) });
      runner.sendObjective(agentConfig.objective).catch(() => {});
    } catch (err) {
      agent.status = 'error';
      agent.error = err instanceof Error ? err.message : String(err);
      board.updateAgent(agentId, { status: 'blocked', message: `Error: ${agent.error}` });
    }

    session.updatedAt = Date.now();
    return agent;
  }

  /** Send a message to a specific agent */
  async sendMessageToAgent(sessionId: string, agentId: string, content: string): Promise<boolean> {
    const runner = this.runners.get(agentId);
    if (!runner || !runner.isRunning()) return false;

    researchEventBus.emitCommand('send_message', sessionId, {
      sourceAgentId: null, // from user
      targetAgentId: agentId,
      data: { content },
      summary: `User message to ${runner.name}`,
    });

    await runner.sendMessage(content);
    return true;
  }

  /** Send a command between agents */
  sendAgentCommand(sessionId: string, sourceAgentId: string | null, targetAgentId: string | null, type: 'send_message' | 'assign_task' | 'request_review' | 'share_context', data?: unknown, summary?: string): void {
    researchEventBus.emitCommand(type, sessionId, {
      sourceAgentId,
      targetAgentId,
      data,
      summary,
    });
  }

  /** Stop a specific agent in a session */
  async stopAgent(sessionId: string, agentId: string): Promise<void> {
    const runner = this.runners.get(agentId);
    if (runner) {
      await runner.stop();
      this.runners.delete(agentId);
    }

    const session = this.sessions.get(sessionId);
    if (session) {
      const agent = session.agents.find((a) => a.id === agentId);
      if (agent) {
        agent.status = 'finished';
        agent.finishedAt = Date.now();
        agent.output = runner?.getOutput() ?? agent.output;
      }
      session.updatedAt = Date.now();
    }
  }

  /** Stop all agents and end the session */
  async stopSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const stopPromises = session.agents.filter((a) => a.status === 'running' || a.status === 'starting').map((a) => this.stopAgent(sessionId, a.id));

    await Promise.allSettled(stopPromises);

    this.updateSessionStatus(sessionId, 'completed');

    researchEventBus.emitEvent('session_completed', sessionId, {
      summary: 'Team session ended',
      data: {
        agentCount: session.agents.length,
        feedSize: researchEventBus.getFeed(sessionId).length,
      },
    });
  }

  // ── Queries ──

  getSession(sessionId: string): ResearchSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  getSessionsByConversation(conversationId: string): ResearchSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.conversationId === conversationId);
  }

  getActiveSessions(): ResearchSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.status === 'running');
  }

  getBoard(sessionId: string): BoardManager | null {
    return this.boards.get(sessionId) ?? null;
  }

  getFeed(sessionId: string): FeedEntry[] {
    return researchEventBus.getFeed(sessionId);
  }

  queryFeed(sessionId: string, filters?: { kind?: FeedEntry['kind']; agentId?: string; limit?: number }): FeedEntry[] {
    return researchEventBus.queryFeed(sessionId, filters);
  }

  // ── Internal ──

  private updateSessionStatus(sessionId: string, status: ResearchSessionStatus): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
      session.updatedAt = Date.now();
    }
  }

  private watchForCompletion(sessionId: string): void {
    const unsubscribe = researchEventBus.onEventType('agent_finished', (event) => {
      if (event.sessionId !== sessionId) return;

      const session = this.sessions.get(sessionId);
      if (!session || session.status !== 'running') {
        unsubscribe();
        return;
      }

      // Update agent output from runner
      const runner = this.runners.get(event.agentId ?? '');
      if (runner && event.agentId) {
        const agent = session.agents.find((a) => a.id === event.agentId);
        if (agent) {
          agent.output = runner.getOutput();
          agent.status = 'finished';
          agent.finishedAt = Date.now();
        }
        this.runners.delete(event.agentId);
      }

      // Check if all agents are done
      const allDone = session.agents.every((a) => a.status === 'finished' || a.status === 'error');

      if (allDone) {
        unsubscribe();
        this.updateSessionStatus(sessionId, 'completed');
        researchEventBus.emitEvent('session_completed', sessionId, {
          summary: 'All team agents completed',
          data: {
            agentCount: session.agents.length,
            feedSize: researchEventBus.getFeed(sessionId).length,
          },
        });
      }
    });
  }
}

/** Singleton research team manager */
export const researchTeamManager = new ResearchTeamManager();
