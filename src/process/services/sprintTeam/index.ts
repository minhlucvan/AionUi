/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Sprint Team Module
 *
 * Planner-Worker-Judge agent team with a structured sprint loop.
 *
 * - Planner decomposes objectives into sprint tasks
 * - Workers execute tasks concurrently (respecting dependencies)
 * - Judge reviews completed work and provides verdicts
 * - Loop continues until approved or max sprints reached
 */

export type { SprintAgentRole, SprintAgent, SprintTask, SprintTaskStatus, SprintTaskPriority, SprintPlan, SprintSession, SprintSessionStatus, SprintConfig, SprintEvent, SprintEventType, AgentRunResult, JudgeVerdict } from './types';

export { sprintEventBus } from './SprintEventBus';
export type { SprintFeedEntry } from './SprintEventBus';
export { SprintTaskManager } from './SprintTaskManager';
export { SprintAgentRunner } from './SprintAgentRunner';
export { sprintOrchestrator } from './SprintOrchestrator';
export { buildPlannerPrompt, buildReplanPrompt, buildWorkerPrompt, buildJudgePrompt, parsePlannerOutput, parseJudgeVerdict } from './prompts';
