/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { randomUUID } from 'crypto';
import { teamEventBus } from './TeamEventBus';
import { TeamTaskBoard } from './TeamTaskBoard';
import { TeamAgentRunner } from './TeamAgentRunner';
import { buildWorkerPrompt, buildValidatorPrompt, parseValidatorVerdict } from './prompts';
import type { TeamConfig, TeamSession, TeamAgent, TeamSessionStatus } from './types';

/**
 * TeamOrchestrator — Coordinates a manager-worker team session.
 *
 * Flow:
 * 1. User provides an objective
 * 2. Orchestrator creates task on the board
 * 3. Spawns Worker agent → sends task → collects output
 * 4. Spawns Validator agent → sends worker output for review
 * 5. If approved → task complete, session done
 * 6. If rejected → send feedback to worker (up to maxIterations)
 *
 * Each session is independent. Multiple sessions can run in parallel.
 */
export class TeamOrchestrator {
  private sessions = new Map<string, TeamSession>();
  private runners = new Map<string, TeamAgentRunner>();
  private boards = new Map<string, TeamTaskBoard>();

  /** Start a new team session */
  async startSession(config: TeamConfig): Promise<TeamSession> {
    const sessionId = randomUUID();
    const teamName = `team-${sessionId.slice(0, 8)}`;

    const session: TeamSession = {
      id: sessionId,
      conversationId: config.conversationId,
      objective: config.objective,
      status: 'running',
      agents: [],
      backend: config.backend,
      workingDir: config.workingDir,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      iterationCount: 0,
      maxIterations: config.maxIterations ?? 3,
    };

    this.sessions.set(sessionId, session);

    const board = new TeamTaskBoard(sessionId, config.conversationId, teamName);
    this.boards.set(sessionId, board);

    teamEventBus.publish('session_started', sessionId, {
      data: { objective: config.objective, backend: config.backend },
    });

    // Run the worker↔validator loop asynchronously
    this.runSession(session, config, board).catch((err) => {
      this.updateSessionStatus(sessionId, 'error');
      teamEventBus.publish('session_error', sessionId, {
        data: { error: err instanceof Error ? err.message : String(err) },
      });
    });

    return session;
  }

  /** Stop a running session */
  async stopSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Stop all agent runners
    for (const agent of session.agents) {
      const runner = this.runners.get(agent.id);
      if (runner) {
        await runner.stop();
        this.runners.delete(agent.id);
      }
    }

    this.updateSessionStatus(sessionId, 'completed');
    this.boards.delete(sessionId);
  }

  /** Get session state */
  getSession(sessionId: string): TeamSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  /** Get all active sessions */
  getActiveSessions(): TeamSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.status === 'running');
  }

  /** Get all sessions for a conversation */
  getSessionsByConversation(conversationId: string): TeamSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.conversationId === conversationId);
  }

  // ── Internal workflow ──

  private async runSession(session: TeamSession, config: TeamConfig, board: TeamTaskBoard): Promise<void> {
    // Create the task
    const mission = board.createTask(session.objective);
    const missionId = mission.id;

    let workerOutput = '';
    let feedback: string | undefined;

    for (let iteration = 0; iteration < session.maxIterations; iteration++) {
      session.iterationCount = iteration + 1;
      session.updatedAt = Date.now();

      teamEventBus.publish('iteration_started', session.id, {
        missionId,
        data: { iteration: iteration + 1, maxIterations: session.maxIterations },
      });

      // ── Step 1: Worker ──
      const workerId = `${session.id}-worker-${iteration}`;
      const worker = new TeamAgentRunner({
        id: workerId,
        role: 'worker',
        sessionId: session.id,
        backend: config.backend,
        workingDir: config.workingDir,
        cliPath: config.cliPath,
      });

      this.runners.set(workerId, worker);
      this.addAgent(session, {
        id: workerId,
        role: 'worker',
        backend: config.backend,
        status: 'starting',
        currentMissionId: missionId,
        output: '',
      });

      try {
        await worker.start();
        this.updateAgentStatus(session, workerId, 'running');

        board.assignTask(missionId, workerId);

        const workerPrompt = buildWorkerPrompt(session.objective, mission.description, feedback);
        const workerResult = await worker.run(workerPrompt);

        workerOutput = workerResult.output;
        this.updateAgentOutput(session, workerId, workerOutput);

        if (workerResult.status === 'error') {
          this.updateAgentStatus(session, workerId, 'error');
          throw new Error(`Worker failed: ${workerResult.error}`);
        }

        this.updateAgentStatus(session, workerId, 'finished');
      } finally {
        await worker.stop();
        this.runners.delete(workerId);
      }

      // ── Step 2: Validator ──
      const validatorId = `${session.id}-validator-${iteration}`;
      const validator = new TeamAgentRunner({
        id: validatorId,
        role: 'manager',
        sessionId: session.id,
        backend: config.backend,
        workingDir: config.workingDir,
        cliPath: config.cliPath,
      });

      this.runners.set(validatorId, validator);
      this.addAgent(session, {
        id: validatorId,
        role: 'manager',
        backend: config.backend,
        status: 'starting',
        output: '',
      });

      let approved = false;

      try {
        await validator.start();
        this.updateAgentStatus(session, validatorId, 'running');

        teamEventBus.publish('validation_started', session.id, {
          agentId: validatorId,
          missionId,
        });

        const validatorPrompt = buildValidatorPrompt(session.objective, workerOutput, mission.description);
        const validatorResult = await validator.run(validatorPrompt);

        this.updateAgentOutput(session, validatorId, validatorResult.output);

        if (validatorResult.status === 'error') {
          this.updateAgentStatus(session, validatorId, 'error');
          throw new Error(`Validator failed: ${validatorResult.error}`);
        }

        this.updateAgentStatus(session, validatorId, 'finished');

        // Parse verdict
        const verdict = parseValidatorVerdict(validatorResult.output);
        approved = verdict.approved;
        feedback = verdict.feedback;

        if (approved) {
          teamEventBus.publish('validation_passed', session.id, { agentId: validatorId, missionId });
        } else {
          teamEventBus.publish('validation_failed', session.id, {
            agentId: validatorId,
            missionId,
            data: { feedback },
          });
        }
      } finally {
        await validator.stop();
        this.runners.delete(validatorId);
      }

      // ── Check result ──
      if (approved) {
        board.completeTask(missionId, validatorId);
        this.updateSessionStatus(session.id, 'completed');
        teamEventBus.publish('session_completed', session.id, {
          missionId,
          data: { iterations: iteration + 1, workerOutput, validatorFeedback: feedback },
        });
        return;
      }

      // Rejected — loop back to worker with feedback
      board.rejectTask(missionId, feedback ?? 'Validation failed');
    }

    // Exhausted iterations — force complete
    board.completeTask(missionId);
    this.updateSessionStatus(session.id, 'completed');
    teamEventBus.publish('session_completed', session.id, {
      missionId,
      data: {
        iterations: session.maxIterations,
        exhausted: true,
        workerOutput,
        validatorFeedback: feedback,
      },
    });
  }

  // ── Session state helpers ──

  private updateSessionStatus(sessionId: string, status: TeamSessionStatus): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
      session.updatedAt = Date.now();
    }
  }

  private addAgent(session: TeamSession, agent: TeamAgent): void {
    session.agents.push(agent);
    session.updatedAt = Date.now();
  }

  private updateAgentStatus(session: TeamSession, agentId: string, status: TeamAgent['status']): void {
    const agent = session.agents.find((a) => a.id === agentId);
    if (agent) {
      agent.status = status;
      session.updatedAt = Date.now();
    }
  }

  private updateAgentOutput(session: TeamSession, agentId: string, output: string): void {
    const agent = session.agents.find((a) => a.id === agentId);
    if (agent) {
      agent.output = output;
      session.updatedAt = Date.now();
    }
  }
}

/** Singleton orchestrator */
export const teamOrchestrator = new TeamOrchestrator();
