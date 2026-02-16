/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { randomUUID } from 'crypto';
import { researchEventBus } from './ResearchEventBus';
import { ResearchAgentRunner } from './ResearchAgentRunner';
import type { FeedEntry, ResearchAgent, ResearchSession, ResearchSessionConfig, ResearchSessionStatus } from './types';

/**
 * ResearchTeamManager — Manages research team sessions.
 *
 * Unlike TeamOrchestrator (sequential worker→validator loop),
 * ResearchTeamManager spawns agents that run independently in parallel.
 * Agents communicate through the ResearchEventBus and all activity
 * flows into the unified feed.
 *
 * Key differences from TeamControl:
 * - Agents run concurrently, not sequentially
 * - No built-in validation loop — agents collaborate freely
 * - Communication via events/commands, not prompts
 * - Feed provides full observability of all activity
 */
export class ResearchTeamManager {
  private sessions = new Map<string, ResearchSession>();
  private runners = new Map<string, ResearchAgentRunner>();

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

    researchEventBus.emitEvent('session_started', sessionId, {
      summary: `Research session started: ${config.objective.slice(0, 100)}`,
      data: {
        objective: config.objective,
        agentCount: config.agents.length,
      },
    });

    // Spawn all agents in parallel
    const spawnPromises = config.agents.map(async (agentConfig) => {
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

      try {
        await runner.start();
        agent.status = 'running';

        // Send objective — agent works independently from here
        runner.sendObjective(agentConfig.objective).catch((err) => {
          agent.status = 'error';
          agent.error = err instanceof Error ? err.message : String(err);
          researchEventBus.emitEvent('agent_error', sessionId, {
            agentId,
            summary: `${agentConfig.name} failed to start objective`,
            data: { error: agent.error },
          });
        });
      } catch (err) {
        agent.status = 'error';
        agent.error = err instanceof Error ? err.message : String(err);
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
    if (!session || session.status !== 'running') return null;

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

    try {
      await runner.start();
      agent.status = 'running';
      runner.sendObjective(agentConfig.objective).catch(() => {});
    } catch (err) {
      agent.status = 'error';
      agent.error = err instanceof Error ? err.message : String(err);
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
  sendAgentCommand(sessionId: string, sourceAgentId: string | null, targetAgentId: string | null, type: ResearchSessionConfig extends never ? never : 'send_message' | 'assign_task' | 'request_review' | 'share_context', data?: unknown, summary?: string): void {
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
      summary: 'Research session ended',
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
          summary: 'All research agents completed',
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
