/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Team Control Module
 *
 * Manager-Worker agent team that allows autonomous collaboration.
 * Workers execute tasks, managers validate results, shared event bus
 * and task board coordinate the workflow.
 */

export type {
  AgentRole,
  AgentRunResult,
  TeamAgent,
  TeamConfig,
  TeamEvent,
  TeamEventType,
  TeamSession,
  TeamSessionStatus,
} from './types';

export { teamEventBus } from './TeamEventBus';
export { TeamTaskBoard } from './TeamTaskBoard';
export { TeamAgentRunner } from './TeamAgentRunner';
export { teamOrchestrator } from './TeamOrchestrator';
export { buildWorkerPrompt, buildValidatorPrompt, parseValidatorVerdict } from './prompts';
