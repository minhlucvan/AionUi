/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

export type {
  DualSessionConfig,
  DualSessionRole,
  DualSessionStatus,
  DualSessionTurn,
  DualSessionProgress,
  DualSessionResult,
  DualSessionStatusCallback,
  DualSessionEvent,
} from './types';
export { DUAL_SESSION_DEFAULTS, DUAL_SESSION_COMPLETION_SIGNAL, DUAL_SESSION_INSTRUCTION_PREFIX, DUAL_SESSION_REPORT_PREFIX } from './types';

export { DualSessionOrchestrator } from './DualSessionOrchestrator';
export type { CreateSessionFn } from './DualSessionOrchestrator';

export { buildDriverInitialPrompt, buildNavigatorInitialPrompt, buildRelayMessage, buildTurnsSummary } from './DualSessionPromptBuilder';
