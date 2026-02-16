/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { randomUUID } from 'crypto';
import { sprintEventBus } from './SprintEventBus';
import { SprintTaskManager } from './SprintTaskManager';
import { SprintAgentRunner } from './SprintAgentRunner';
import { buildPlannerPrompt, buildWorkerPrompt, buildJudgePrompt, parsePlannerOutput, parseJudgeVerdict } from './prompts';
import type { SprintConfig, SprintSession, SprintAgent, SprintSessionStatus, JudgeVerdict } from './types';

/**
 * SprintOrchestrator — Coordinates the Planner-Worker-Judge sprint loop.
 *
 * Core Sprint Loop:
 *
 * ┌──────────────────────────────────────────────────┐
 * │                  SPRINT LOOP                      │
 * │                                                   │
 * │  1. PLAN   → Planner decomposes objective         │
 * │             → Produces sprint backlog              │
 * │                      ↓                            │
 * │  2. EXECUTE → Workers pick tasks from backlog     │
 * │             → Concurrent execution (max N)         │
 * │             → Dependencies respected               │
 * │                      ↓                            │
 * │  3. JUDGE  → Judge reviews all completed work     │
 * │             → Per-task feedback                    │
 * │             → Overall verdict                     │
 * │                      ↓                            │
 * │  4. DECIDE → Approved? → SESSION COMPLETE         │
 * │             → Rejected? → Back to PLAN (re-plan)  │
 * │             → Max sprints? → FORCE COMPLETE       │
 * └──────────────────────────────────────────────────┘
 *
 * Each session is independent. Multiple sessions can run in parallel.
 */
export class SprintOrchestrator {
  private sessions = new Map<string, SprintSession>();
  private runners = new Map<string, SprintAgentRunner>();
  private taskManagers = new Map<string, SprintTaskManager>();

  /** Start a new sprint session */
  async startSession(config: SprintConfig): Promise<SprintSession> {
    const sessionId = randomUUID();

    const session: SprintSession = {
      id: sessionId,
      conversationId: config.conversationId,
      objective: config.objective,
      status: 'planning',
      agents: [],
      backend: config.backend,
      workingDir: config.workingDir,
      plans: [],
      currentSprint: 1,
      maxSprints: config.maxSprints ?? 5,
      maxWorkers: config.maxWorkers ?? 3,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.sessions.set(sessionId, session);

    const taskManager = new SprintTaskManager(sessionId, config.conversationId);
    this.taskManagers.set(sessionId, taskManager);

    sprintEventBus.publish('session_started', sessionId, {
      data: { objective: config.objective, backend: config.backend, maxSprints: session.maxSprints },
    });

    // Run the sprint loop asynchronously
    this.runSprintLoop(session, config, taskManager).catch((err) => {
      this.updateSessionStatus(sessionId, 'error');
      sprintEventBus.publish('session_error', sessionId, {
        data: { error: err instanceof Error ? err.message : String(err) },
      });
    });

    return session;
  }

  /** Stop a running session */
  async stopSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    for (const agent of session.agents) {
      const runner = this.runners.get(agent.id);
      if (runner) {
        await runner.stop();
        this.runners.delete(agent.id);
      }
    }

    this.updateSessionStatus(sessionId, 'completed');
    this.taskManagers.delete(sessionId);
  }

  /** Get session state */
  getSession(sessionId: string): SprintSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  /** Get all active sessions */
  getActiveSessions(): SprintSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.status !== 'completed' && s.status !== 'error');
  }

  /** Get sessions for a conversation */
  getSessionsByConversation(conversationId: string): SprintSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.conversationId === conversationId);
  }

  /** Get the task manager for a session */
  getTaskManager(sessionId: string): SprintTaskManager | null {
    return this.taskManagers.get(sessionId) ?? null;
  }

  // ── Core Sprint Loop ──

  private async runSprintLoop(session: SprintSession, config: SprintConfig, taskManager: SprintTaskManager): Promise<void> {
    let judgeFeedback: string | undefined;
    let previousResults: string | undefined;

    for (let sprint = 1; sprint <= session.maxSprints; sprint++) {
      session.currentSprint = sprint;
      session.updatedAt = Date.now();

      sprintEventBus.publish('sprint_started', session.id, {
        sprintNumber: sprint,
        data: { maxSprints: session.maxSprints },
      });

      // ── Phase 1: PLAN ──
      this.updateSessionStatus(session.id, sprint > 1 ? 'replanning' : 'planning');

      const plan = await this.runPlanningPhase(session, config, taskManager, sprint, judgeFeedback, previousResults);

      if (!plan) {
        throw new Error(`Planner failed to produce a valid plan for sprint ${sprint}`);
      }

      sprintEventBus.publish('planning_completed', session.id, {
        sprintNumber: sprint,
        data: { taskCount: plan.tasks.length, goal: plan.goal },
      });

      // ── Phase 2: EXECUTE ──
      this.updateSessionStatus(session.id, 'executing');

      await this.runExecutionPhase(session, config, taskManager, sprint);

      // ── Phase 3: JUDGE ──
      this.updateSessionStatus(session.id, 'judging');

      const verdict = await this.runJudgingPhase(session, config, taskManager, sprint);

      sprintEventBus.publish('judging_completed', session.id, {
        sprintNumber: sprint,
        data: { approved: verdict.approved, summary: verdict.summary },
      });

      // ── Phase 4: DECIDE ──
      if (verdict.approved) {
        sprintEventBus.publish('judge_approved', session.id, {
          sprintNumber: sprint,
          data: { summary: verdict.summary },
        });

        this.updateSessionStatus(session.id, 'completed');
        sprintEventBus.publish('session_completed', session.id, {
          sprintNumber: sprint,
          data: {
            totalSprints: sprint,
            approved: true,
            summary: verdict.summary,
          },
        });
        return;
      }

      // Rejected — prepare feedback for re-planning
      sprintEventBus.publish('judge_rejected', session.id, {
        sprintNumber: sprint,
        data: { summary: verdict.summary, suggestions: verdict.suggestions },
      });

      // Apply per-task feedback
      for (const [taskTitle, feedback] of Object.entries(verdict.taskFeedback)) {
        const sprintTasks = taskManager.getSprintTasks(sprint);
        const task = sprintTasks.find((t) => t.title === taskTitle);
        if (task && !feedback.approved) {
          taskManager.rejectTask(task.id, feedback.feedback);
        }
      }

      judgeFeedback = [verdict.summary, verdict.suggestions].filter(Boolean).join('\n\n');
      previousResults = taskManager.generateResultsSummary(sprint);
    }

    // Exhausted all sprints — force complete
    this.updateSessionStatus(session.id, 'completed');
    sprintEventBus.publish('session_completed', session.id, {
      sprintNumber: session.currentSprint,
      data: {
        totalSprints: session.maxSprints,
        exhausted: true,
        approved: false,
      },
    });
  }

  // ── Planning Phase ──

  private async runPlanningPhase(session: SprintSession, config: SprintConfig, taskManager: SprintTaskManager, sprintNumber: number, judgeFeedback?: string, previousResults?: string): Promise<ReturnType<SprintTaskManager['createPlan']> | null> {
    const plannerId = `${session.id}-planner-${sprintNumber}`;

    sprintEventBus.publish(sprintNumber > 1 ? 'replanning_started' : 'planning_started', session.id, {
      agentId: plannerId,
      sprintNumber,
    });

    const planner = new SprintAgentRunner({
      id: plannerId,
      role: 'planner',
      sessionId: session.id,
      backend: config.backend,
      workingDir: config.workingDir,
      cliPath: config.cliPath,
    });

    this.runners.set(plannerId, planner);
    this.addAgent(session, {
      id: plannerId,
      role: 'planner',
      backend: config.backend,
      status: 'starting',
      output: '',
      startedAt: Date.now(),
    });

    try {
      await planner.start();
      this.updateAgentStatus(session, plannerId, 'running');

      const backlog = taskManager.getAllTasks().length > 0 ? taskManager.generateBacklogSummary(sprintNumber - 1) : undefined;

      const prompt = buildPlannerPrompt(session.objective, sprintNumber, {
        previousFeedback: judgeFeedback,
        previousResults,
        backlog,
      });

      const result = await planner.run(prompt);
      this.updateAgentOutput(session, plannerId, result.output);

      if (result.status === 'error') {
        this.updateAgentStatus(session, plannerId, 'error');
        throw new Error(`Planner failed: ${result.error}`);
      }

      this.updateAgentStatus(session, plannerId, 'finished');

      // Parse the plan from planner output
      const parsed = parsePlannerOutput(result.output);
      if (!parsed) {
        throw new Error('Planner output could not be parsed into a valid plan');
      }

      // Create the plan in the task manager
      const plan = taskManager.createPlan(sprintNumber, parsed.goal, parsed.reasoning, parsed.tasks);
      session.plans.push(plan);

      return plan;
    } finally {
      await planner.stop();
      this.runners.delete(plannerId);
    }
  }

  // ── Execution Phase ──

  private async runExecutionPhase(session: SprintSession, config: SprintConfig, taskManager: SprintTaskManager, sprintNumber: number): Promise<void> {
    const plan = taskManager.getPlans().find((p) => p.sprintNumber === sprintNumber);
    if (!plan) throw new Error(`No plan found for sprint ${sprintNumber}`);

    // Process tasks respecting dependencies, running up to maxWorkers concurrently
    while (!taskManager.isSprintComplete(sprintNumber)) {
      const readyTasks = taskManager.getReadyTasks(sprintNumber);
      const inProgress = taskManager.getInProgressTasks(sprintNumber);

      // If no tasks are ready and none in progress, we're stuck (dependency deadlock)
      if (readyTasks.length === 0 && inProgress.length === 0) {
        const remaining = taskManager.getSprintTasks(sprintNumber).filter((t) => t.status === 'todo' || t.status === 'blocked');
        if (remaining.length > 0) {
          // Force-complete blocked tasks to avoid deadlock
          for (const task of remaining) {
            taskManager.failTask(task.id, 'Dependency deadlock — could not resolve');
          }
        }
        break;
      }

      // If nothing is ready but tasks are in progress, wait for them
      if (readyTasks.length === 0 && inProgress.length > 0) {
        await this.sleep(1000);
        continue;
      }

      // Pick tasks to run (up to maxWorkers - currently running)
      const slotsAvailable = session.maxWorkers - inProgress.length;
      const tasksToRun = readyTasks.slice(0, Math.max(1, slotsAvailable));

      // Run workers concurrently
      const workerPromises = tasksToRun.map((task) => this.runWorkerForTask(session, config, taskManager, task.id, sprintNumber, plan.goal));

      // Wait for at least one to complete before checking for more ready tasks
      await Promise.race(workerPromises);

      // Brief pause to let state settle
      await this.sleep(100);
    }
  }

  /** Run a single worker for a specific task */
  private async runWorkerForTask(session: SprintSession, config: SprintConfig, taskManager: SprintTaskManager, taskId: string, sprintNumber: number, sprintGoal: string): Promise<void> {
    const task = taskManager.getTask(taskId);
    if (!task) return;

    const workerId = `${session.id}-worker-${sprintNumber}-${taskId.slice(0, 8)}`;

    // Assign the task
    const assigned = taskManager.assignTask(taskId, workerId);
    if (!assigned) return;

    const worker = new SprintAgentRunner({
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
      currentTask: task.title,
      output: '',
      startedAt: Date.now(),
    });

    try {
      await worker.start();
      this.updateAgentStatus(session, workerId, 'running');

      sprintEventBus.publish('task_started', session.id, {
        taskId,
        sprintNumber,
        agentId: workerId,
        data: { title: task.title, priority: task.priority },
      });

      // Build context from completed dependent tasks
      let relatedResults: string | undefined;
      if (task.dependencies.length > 0) {
        const depResults = task.dependencies
          .map((depId) => {
            const dep = taskManager.getTask(depId);
            return dep ? `### ${dep.title}\n${dep.result ?? 'No result recorded'}` : null;
          })
          .filter(Boolean);

        if (depResults.length > 0) {
          relatedResults = depResults.join('\n\n');
        }
      }

      const prompt = buildWorkerPrompt(task.title, task.description, sprintGoal, {
        relatedTaskResults: relatedResults,
        feedback: task.feedback,
      });

      const result = await worker.run(prompt);
      this.updateAgentOutput(session, workerId, result.output);

      if (result.status === 'error') {
        this.updateAgentStatus(session, workerId, 'error');
        taskManager.failTask(taskId, result.error ?? 'Worker execution failed');
      } else {
        this.updateAgentStatus(session, workerId, 'finished');
        taskManager.completeTask(taskId, result.output);
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.updateAgentStatus(session, workerId, 'error');
      taskManager.failTask(taskId, error);
    } finally {
      await worker.stop();
      this.runners.delete(workerId);
    }
  }

  // ── Judging Phase ──

  private async runJudgingPhase(session: SprintSession, config: SprintConfig, taskManager: SprintTaskManager, sprintNumber: number): Promise<JudgeVerdict> {
    const judgeId = `${session.id}-judge-${sprintNumber}`;
    const plan = taskManager.getPlans().find((p) => p.sprintNumber === sprintNumber);
    const sprintGoal = plan?.goal ?? session.objective;

    sprintEventBus.publish('judging_started', session.id, {
      agentId: judgeId,
      sprintNumber,
    });

    const judge = new SprintAgentRunner({
      id: judgeId,
      role: 'judge',
      sessionId: session.id,
      backend: config.backend,
      workingDir: config.workingDir,
      cliPath: config.cliPath,
    });

    this.runners.set(judgeId, judge);
    this.addAgent(session, {
      id: judgeId,
      role: 'judge',
      backend: config.backend,
      status: 'starting',
      output: '',
      startedAt: Date.now(),
    });

    try {
      await judge.start();
      this.updateAgentStatus(session, judgeId, 'running');

      const sprintResults = taskManager.generateResultsSummary(sprintNumber);
      const prompt = buildJudgePrompt(session.objective, sprintGoal, sprintResults, sprintNumber);

      const result = await judge.run(prompt);
      this.updateAgentOutput(session, judgeId, result.output);

      if (result.status === 'error') {
        this.updateAgentStatus(session, judgeId, 'error');
        // On judge error, default to approved to avoid infinite loops
        return { approved: true, summary: `Judge error: ${result.error}`, taskFeedback: {} };
      }

      this.updateAgentStatus(session, judgeId, 'finished');
      return parseJudgeVerdict(result.output);
    } finally {
      await judge.stop();
      this.runners.delete(judgeId);
    }
  }

  // ── Session state helpers ──

  private updateSessionStatus(sessionId: string, status: SprintSessionStatus): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
      session.updatedAt = Date.now();
    }
  }

  private addAgent(session: SprintSession, agent: SprintAgent): void {
    session.agents.push(agent);
    session.updatedAt = Date.now();
  }

  private updateAgentStatus(session: SprintSession, agentId: string, status: SprintAgent['status']): void {
    const agent = session.agents.find((a) => a.id === agentId);
    if (agent) {
      agent.status = status;
      if (status === 'finished' || status === 'error') {
        agent.finishedAt = Date.now();
      }
      session.updatedAt = Date.now();
    }
  }

  private updateAgentOutput(session: SprintSession, agentId: string, output: string): void {
    const agent = session.agents.find((a) => a.id === agentId);
    if (agent) {
      agent.output = output;
      session.updatedAt = Date.now();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/** Singleton orchestrator */
export const sprintOrchestrator = new SprintOrchestrator();
