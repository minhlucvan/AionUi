/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { randomUUID } from 'crypto';
import { sprintEventBus } from './SprintEventBus';
import type { SprintTask, SprintTaskStatus, SprintTaskPriority, SprintPlan } from './types';

type TaskDefinition = {
  title: string;
  description: string;
  priority?: SprintTaskPriority;
  dependencies?: string[];
};

/**
 * SprintTaskManager — Manages the sprint backlog and task lifecycle.
 *
 * Responsibilities:
 * 1. Parse planner output into structured sprint tasks
 * 2. Track task state transitions (todo → in_progress → done/rejected)
 * 3. Respect task dependencies (only ready tasks are assignable)
 * 4. Provide task queries for orchestrator and workers
 * 5. Apply judge feedback to individual tasks
 *
 * Each SprintTaskManager is scoped to a single session.
 */
export class SprintTaskManager {
  private tasks = new Map<string, SprintTask>();
  private plans: SprintPlan[] = [];

  constructor(
    private readonly sessionId: string,
    private readonly conversationId: string
  ) {}

  /** Create a sprint plan from planner output, returning the plan and tasks */
  // prettier-ignore
  createPlan(sprintNumber: number, goal: string, reasoning: string, taskDefinitions: TaskDefinition[]): SprintPlan {
    const now = Date.now();
    const tasks: SprintTask[] = [];

    for (const def of taskDefinitions) {
      const task: SprintTask = {
        id: randomUUID(),
        title: def.title,
        description: def.description,
        status: 'todo',
        priority: def.priority ?? 'medium',
        dependencies: def.dependencies ?? [],
        sprintNumber,
        createdAt: now,
        updatedAt: now,
      };

      tasks.push(task);
      this.tasks.set(task.id, task);
    }

    // Resolve dependency names to IDs (dependencies can reference task titles)
    for (const task of tasks) {
      task.dependencies = task.dependencies.map((dep) => {
        const byTitle = tasks.find((t) => t.title.toLowerCase() === dep.toLowerCase());
        return byTitle?.id ?? dep;
      });
    }

    const plan: SprintPlan = {
      sprintNumber,
      goal,
      tasks,
      reasoning,
      createdAt: now,
    };

    this.plans.push(plan);
    return plan;
  }

  /** Get all tasks */
  getAllTasks(): SprintTask[] {
    return Array.from(this.tasks.values());
  }

  /** Get tasks for a specific sprint */
  getSprintTasks(sprintNumber: number): SprintTask[] {
    return this.getAllTasks().filter((t) => t.sprintNumber === sprintNumber);
  }

  /** Get tasks that are ready to be assigned (todo + all deps are done) */
  getReadyTasks(sprintNumber: number): SprintTask[] {
    return this.getSprintTasks(sprintNumber).filter((task) => {
      if (task.status !== 'todo') return false;
      return this.areDependenciesMet(task);
    });
  }

  /** Get tasks currently in progress */
  getInProgressTasks(sprintNumber: number): SprintTask[] {
    return this.getSprintTasks(sprintNumber).filter((t) => t.status === 'in_progress');
  }

  /** Get completed tasks for a sprint */
  getCompletedTasks(sprintNumber: number): SprintTask[] {
    return this.getSprintTasks(sprintNumber).filter((t) => t.status === 'done');
  }

  /** Check if all tasks in a sprint are done */
  isSprintComplete(sprintNumber: number): boolean {
    const tasks = this.getSprintTasks(sprintNumber);
    return tasks.length > 0 && tasks.every((t) => t.status === 'done' || t.status === 'rejected');
  }

  /** Assign a task to a worker */
  assignTask(taskId: string, workerId: string): SprintTask | null {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'todo') return null;

    if (!this.areDependenciesMet(task)) return null;

    task.status = 'in_progress';
    task.assigneeId = workerId;
    task.updatedAt = Date.now();

    sprintEventBus.publish('task_assigned', this.sessionId, {
      taskId,
      sprintNumber: task.sprintNumber,
      agentId: workerId,
      data: { title: task.title },
    });

    return task;
  }

  /** Mark a task as completed with its result */
  completeTask(taskId: string, result: string): SprintTask | null {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'in_progress') return null;

    task.status = 'done';
    task.result = result;
    task.completedAt = Date.now();
    task.updatedAt = Date.now();

    sprintEventBus.publish('task_completed', this.sessionId, {
      taskId,
      sprintNumber: task.sprintNumber,
      agentId: task.assigneeId,
      data: { title: task.title, resultLength: result.length },
    });

    return task;
  }

  /** Mark a task as failed */
  failTask(taskId: string, error: string): SprintTask | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    task.status = 'blocked';
    task.feedback = error;
    task.updatedAt = Date.now();

    sprintEventBus.publish('task_failed', this.sessionId, {
      taskId,
      sprintNumber: task.sprintNumber,
      agentId: task.assigneeId,
      data: { title: task.title, error },
    });

    return task;
  }

  /** Apply judge feedback to a task (reject with feedback) */
  rejectTask(taskId: string, feedback: string): SprintTask | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    task.status = 'rejected';
    task.feedback = feedback;
    task.updatedAt = Date.now();

    return task;
  }

  /** Reset rejected tasks back to todo for re-planning */
  resetRejectedTasks(sprintNumber: number): void {
    for (const task of this.getSprintTasks(sprintNumber)) {
      if (task.status === 'rejected') {
        task.status = 'todo';
        task.assigneeId = undefined;
        task.result = undefined;
        task.updatedAt = Date.now();
      }
    }
  }

  /** Get a task by ID */
  getTask(taskId: string): SprintTask | null {
    return this.tasks.get(taskId) ?? null;
  }

  /** Get all plans */
  getPlans(): SprintPlan[] {
    return this.plans;
  }

  /** Get the latest plan */
  getLatestPlan(): SprintPlan | null {
    return this.plans.length > 0 ? this.plans[this.plans.length - 1] : null;
  }

  /** Generate a sprint backlog summary for prompts */
  generateBacklogSummary(sprintNumber: number): string {
    const tasks = this.getSprintTasks(sprintNumber);
    if (tasks.length === 0) return 'No tasks in current sprint.';

    const lines: string[] = [`## Sprint ${sprintNumber} Backlog`, ''];

    const priorityOrder: SprintTaskPriority[] = ['critical', 'high', 'medium', 'low'];

    for (const priority of priorityOrder) {
      const priorityTasks = tasks.filter((t) => t.priority === priority);
      if (priorityTasks.length === 0) continue;

      lines.push(`### ${priority.toUpperCase()}`);
      for (const task of priorityTasks) {
        const statusIcon = STATUS_ICONS[task.status] ?? '?';
        const assignee = task.assigneeId ? ` [assigned: ${task.assigneeId.slice(0, 8)}]` : '';
        const deps = task.dependencies.length > 0 ? ` (deps: ${task.dependencies.map((d) => this.tasks.get(d)?.title ?? d.slice(0, 8)).join(', ')})` : '';
        lines.push(`- ${statusIcon} **${task.title}** — ${task.status}${assignee}${deps}`);
        if (task.feedback) {
          lines.push(`  - Feedback: ${task.feedback.slice(0, 200)}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /** Generate a results summary for judge review */
  generateResultsSummary(sprintNumber: number): string {
    const tasks = this.getSprintTasks(sprintNumber);
    if (tasks.length === 0) return 'No tasks completed.';

    const lines: string[] = [`## Sprint ${sprintNumber} Results`, ''];

    for (const task of tasks) {
      lines.push(`### Task: ${task.title}`);
      lines.push(`- Status: ${task.status}`);
      lines.push(`- Priority: ${task.priority}`);
      if (task.result) {
        lines.push(`- Result:\n${task.result}`);
      }
      if (task.feedback) {
        lines.push(`- Feedback: ${task.feedback}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /** Check if all dependencies for a task are met */
  private areDependenciesMet(task: SprintTask): boolean {
    if (task.dependencies.length === 0) return true;

    return task.dependencies.every((depId) => {
      const dep = this.tasks.get(depId);
      return dep?.status === 'done';
    });
  }
}

const STATUS_ICONS: Record<SprintTaskStatus, string> = {
  todo: '[ ]',
  in_progress: '[~]',
  done: '[x]',
  blocked: '[!]',
  rejected: '[-]',
};
