/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Ralph autonomous agent loop types
 */

export interface RalphUserStory {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority: number;
  passes: boolean;
  notes: string;
}

export interface RalphPrd {
  project: string;
  branchName: string;
  description: string;
  userStories: RalphUserStory[];
}

export interface RalphConfig {
  maxIterations: number;
  autoCommit: boolean;
  qualityChecks: {
    typecheck: string | null;
    lint: string | null;
    test: string | null;
    build: string | null;
  };
  completionSignal: string;
  continueSignal: string;
  iterationDelayMs: number;
  retryOnFailure: boolean;
  maxRetries: number;
}

export type RalphLoopStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'max_iterations_reached';

export interface RalphLoopState {
  id: string;
  conversationId: string;
  status: RalphLoopStatus;
  currentIteration: number;
  maxIterations: number;
  totalStories: number;
  completedStories: number;
  currentStoryId: string | null;
  startedAt: number;
  lastIterationAt: number | null;
  error: string | null;
  workspace: string;
}

export interface RalphStartParams {
  conversationId: string;
  workspace: string;
  maxIterations?: number;
}

export interface RalphProgressEvent {
  loopId: string;
  conversationId: string;
  type: 'iteration_start' | 'iteration_end' | 'story_complete' | 'loop_complete' | 'loop_error' | 'loop_paused';
  data: {
    iteration?: number;
    storyId?: string;
    storyTitle?: string;
    completedStories?: number;
    totalStories?: number;
    error?: string;
  };
}
