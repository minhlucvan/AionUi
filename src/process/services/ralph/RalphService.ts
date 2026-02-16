/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { uuid } from '@/common/utils';
import WorkerManage from '../../WorkerManage';
import type { IResponseMessage } from '@/common/ipcBridge';
import type { RalphConfig, RalphLoopState, RalphPrd, RalphProgressEvent, RalphStartParams } from './types';
import * as fs from 'fs';
import * as path from 'path';
import { parsePrdMarkdown } from './prdParser';

const DEFAULT_CONFIG: RalphConfig = {
  maxIterations: 10,
  autoCommit: true,
  qualityChecks: {
    typecheck: 'npm run typecheck',
    lint: 'npm run lint',
    test: 'npm test',
    build: null,
  },
  completionSignal: '<promise>COMPLETE</promise>',
  continueSignal: '<promise>CONTINUE</promise>',
  iterationDelayMs: 2000,
  retryOnFailure: true,
  maxRetries: 3,
};

/**
 * RalphService - Core autonomous loop engine
 *
 * Manages the Ralph autonomous iteration loop. Instead of a bash script
 * spawning CLI processes, this service uses AionUi's WorkerManage
 * to send messages to AI agents and monitor responses for completion signals.
 *
 * Flow:
 * 1. User starts a Ralph loop for a conversation with a PRD
 * 2. Service sends "continue" message to the agent
 * 3. Agent reads prd.json/progress.txt (via hooks), implements next story
 * 4. Service monitors response stream for COMPLETE/CONTINUE signals
 * 5. On CONTINUE: wait, then send next message (new iteration)
 * 6. On COMPLETE: stop loop, update state
 */
class RalphService {
  private loops: Map<string, RalphLoopState> = new Map();
  private responseBuffers: Map<string, string> = new Map();
  private streamListenerCleanups: Map<string, () => void> = new Map();

  /**
   * Start a new Ralph autonomous loop
   */
  async start(params: RalphStartParams): Promise<RalphLoopState> {
    const { conversationId, workspace, maxIterations } = params;

    // Check if loop already running for this conversation
    const existing = this.getLoopByConversation(conversationId);
    if (existing && existing.status === 'running') {
      throw new Error(`Ralph loop already running for conversation ${conversationId}`);
    }

    // Load and validate PRD
    const prd = this.loadPrd(workspace);
    if (!prd) {
      throw new Error('No prd.md found in workspace. Create a PRD first.');
    }

    // Load config
    const config = this.loadConfig(workspace);

    const loopId = `ralph_${uuid()}`;
    const totalStories = prd.userStories.length;
    const completedStories = prd.userStories.filter((s) => s.passes).length;

    if (completedStories === totalStories) {
      throw new Error('All stories are already complete. Nothing to do.');
    }

    const state: RalphLoopState = {
      id: loopId,
      conversationId,
      status: 'running',
      currentIteration: 0,
      maxIterations: maxIterations ?? config.maxIterations,
      totalStories,
      completedStories,
      currentStoryId: null,
      startedAt: Date.now(),
      lastIterationAt: null,
      error: null,
      workspace,
    };

    this.loops.set(loopId, state);

    // Start listening for responses from this conversation
    this.setupResponseListener(loopId, conversationId, config);

    // Begin first iteration
    void this.executeIteration(loopId, config);

    return state;
  }

  /**
   * Stop a running Ralph loop
   */
  async stop(loopId: string): Promise<RalphLoopState | null> {
    const state = this.loops.get(loopId);
    if (!state) return null;

    state.status = 'paused';

    // Clean up response listener
    this.cleanupListener(loopId);

    // Stop the conversation
    try {
      const task = WorkerManage.getTaskById(state.conversationId);
      if (task) {
        await task.stop();
      }
    } catch {
      // Ignore stop errors
    }

    this.emitProgress({
      loopId,
      conversationId: state.conversationId,
      type: 'loop_paused',
      data: {
        iteration: state.currentIteration,
        completedStories: state.completedStories,
        totalStories: state.totalStories,
      },
    });

    return state;
  }

  /**
   * Resume a paused Ralph loop
   */
  async resume(loopId: string): Promise<RalphLoopState | null> {
    const state = this.loops.get(loopId);
    if (!state || state.status !== 'paused') return null;

    state.status = 'running';

    const config = this.loadConfig(state.workspace);
    this.setupResponseListener(loopId, state.conversationId, config);

    void this.executeIteration(loopId, config);

    return state;
  }

  /**
   * Get loop state by ID
   */
  getLoop(loopId: string): RalphLoopState | null {
    return this.loops.get(loopId) ?? null;
  }

  /**
   * Get loop by conversation ID
   */
  getLoopByConversation(conversationId: string): RalphLoopState | null {
    for (const state of this.loops.values()) {
      if (state.conversationId === conversationId) {
        return state;
      }
    }
    return null;
  }

  /**
   * List all loops
   */
  listLoops(): RalphLoopState[] {
    return Array.from(this.loops.values());
  }

  /**
   * Get PRD from workspace
   */
  getPrd(workspace: string): RalphPrd | null {
    return this.loadPrd(workspace);
  }

  /**
   * Cleanup all loops
   */
  cleanup(): void {
    for (const loopId of this.loops.keys()) {
      this.cleanupListener(loopId);
    }
    this.loops.clear();
    this.responseBuffers.clear();
  }

  // ---- Private methods ----

  /**
   * Execute a single iteration of the Ralph loop
   */
  private async executeIteration(loopId: string, _config: RalphConfig): Promise<void> {
    const state = this.loops.get(loopId);
    if (!state || state.status !== 'running') return;

    state.currentIteration++;
    state.lastIterationAt = Date.now();

    // Check max iterations
    if (state.currentIteration > state.maxIterations) {
      state.status = 'max_iterations_reached';
      this.cleanupListener(loopId);
      this.emitProgress({
        loopId,
        conversationId: state.conversationId,
        type: 'loop_error',
        data: {
          iteration: state.currentIteration,
          error: `Max iterations (${state.maxIterations}) reached`,
          completedStories: state.completedStories,
          totalStories: state.totalStories,
        },
      });
      return;
    }

    // Reload PRD to get current story state
    const prd = this.loadPrd(state.workspace);
    if (prd) {
      const nextStory = prd.userStories.filter((s) => !s.passes).sort((a, b) => a.priority - b.priority)[0];

      if (nextStory) {
        state.currentStoryId = nextStory.id;
      }

      state.totalStories = prd.userStories.length;
      state.completedStories = prd.userStories.filter((s) => s.passes).length;
    }

    this.emitProgress({
      loopId,
      conversationId: state.conversationId,
      type: 'iteration_start',
      data: {
        iteration: state.currentIteration,
        storyId: state.currentStoryId ?? undefined,
        completedStories: state.completedStories,
        totalStories: state.totalStories,
      },
    });

    // Reset response buffer for this conversation
    this.responseBuffers.set(state.conversationId, '');

    try {
      // Get or build the agent task with yoloMode for autonomous operation
      // IMPORTANT: Reuse existing task to avoid breaking message queues
      let task = WorkerManage.getTaskById(state.conversationId);

      if (!task) {
        // Create task only if it doesn't exist
        task = await WorkerManage.getTaskByIdRollbackBuild(state.conversationId, {
          yoloMode: true,
        });

        if (!task) {
          throw new Error('Could not create agent task for conversation');
        }
      }

      const msgId = uuid();
      const iterationMessage = `[RALPH:ITERATION ${state.currentIteration}/${state.maxIterations}] Execute the next incomplete user story.`;

      // Send message - the hooks will inject PRD context
      if (task.type === 'codex' || task.type === 'acp') {
        await task.sendMessage({
          content: iterationMessage,
          msg_id: msgId,
          files: [],
        });
      } else {
        await task.sendMessage({
          input: iterationMessage,
          msg_id: msgId,
          files: [],
        });
      }
    } catch (error) {
      state.status = 'failed';
      state.error = error instanceof Error ? error.message : String(error);
      this.cleanupListener(loopId);

      this.emitProgress({
        loopId,
        conversationId: state.conversationId,
        type: 'loop_error',
        data: {
          iteration: state.currentIteration,
          error: state.error,
        },
      });
    }
  }

  /**
   * Set up a listener on the response stream to detect completion signals
   */
  private setupResponseListener(loopId: string, conversationId: string, config: RalphConfig): void {
    // Clean up any existing listener
    this.cleanupListener(loopId);

    const handler = (msg: IResponseMessage) => {
      if (msg.conversation_id !== conversationId) return;

      const state = this.loops.get(loopId);
      if (!state || state.status !== 'running') return;

      // Accumulate response content
      if (msg.type === 'content' && typeof msg.data === 'string') {
        const buffer = (this.responseBuffers.get(conversationId) ?? '') + msg.data;
        this.responseBuffers.set(conversationId, buffer);
      }

      // Check for finish signal from the agent
      if (msg.type === 'finish') {
        const buffer = this.responseBuffers.get(conversationId) ?? '';

        // Check for completion signal
        if (buffer.includes(config.completionSignal)) {
          // All stories complete!
          this.handleLoopComplete(loopId);
        } else if (buffer.includes(config.continueSignal)) {
          // Stories remain - schedule next iteration
          this.handleIterationComplete(loopId, config);
        } else {
          // No signal detected - treat as continue (the agent may not always
          // output the signal, but we can check the PRD directly)
          this.handleIterationComplete(loopId, config);
        }
      }
    };

    // Subscribe to the response stream
    const cleanup = ipcBridge.conversation.responseStream.on(handler);
    this.streamListenerCleanups.set(loopId, cleanup);
  }

  /**
   * Handle successful loop completion
   */
  private handleLoopComplete(loopId: string): void {
    const state = this.loops.get(loopId);
    if (!state) return;

    // Reload PRD for final counts
    const prd = this.loadPrd(state.workspace);
    if (prd) {
      state.completedStories = prd.userStories.filter((s) => s.passes).length;
      state.totalStories = prd.userStories.length;
    }

    state.status = 'completed';
    this.cleanupListener(loopId);

    this.emitProgress({
      loopId,
      conversationId: state.conversationId,
      type: 'loop_complete',
      data: {
        iteration: state.currentIteration,
        completedStories: state.completedStories,
        totalStories: state.totalStories,
      },
    });
  }

  /**
   * Handle iteration completion (stories remain)
   */
  private handleIterationComplete(loopId: string, config: RalphConfig): void {
    const state = this.loops.get(loopId);
    if (!state || state.status !== 'running') return;

    // Reload PRD and check if actually complete
    const prd = this.loadPrd(state.workspace);
    if (prd) {
      state.completedStories = prd.userStories.filter((s) => s.passes).length;
      state.totalStories = prd.userStories.length;

      // Double check - maybe all stories are complete even without the signal
      if (state.completedStories === state.totalStories) {
        this.handleLoopComplete(loopId);
        return;
      }

      // Find what was just completed
      const completedStory = prd.userStories.find((s) => s.id === state.currentStoryId && s.passes);
      if (completedStory) {
        this.emitProgress({
          loopId,
          conversationId: state.conversationId,
          type: 'story_complete',
          data: {
            storyId: completedStory.id,
            storyTitle: completedStory.title,
            completedStories: state.completedStories,
            totalStories: state.totalStories,
          },
        });
      }
    }

    this.emitProgress({
      loopId,
      conversationId: state.conversationId,
      type: 'iteration_end',
      data: {
        iteration: state.currentIteration,
        completedStories: state.completedStories,
        totalStories: state.totalStories,
      },
    });

    // Schedule next iteration after delay
    setTimeout(() => {
      void this.executeIteration(loopId, config);
    }, config.iterationDelayMs);
  }

  /**
   * Clean up response listener for a loop
   */
  private cleanupListener(loopId: string): void {
    const cleanup = this.streamListenerCleanups.get(loopId);
    if (cleanup) {
      cleanup();
      this.streamListenerCleanups.delete(loopId);
    }
  }

  /**
   * Load PRD from workspace (supports prd.md with prd.json fallback)
   */
  private loadPrd(workspace: string): RalphPrd | null {
    // Prefer prd.md (markdown format)
    const mdPath = path.join(workspace, 'prd.md');
    try {
      if (fs.existsSync(mdPath)) {
        const content = fs.readFileSync(mdPath, 'utf-8');
        return parsePrdMarkdown(content);
      }
    } catch {
      // Fall through to JSON fallback
    }

    // Fallback: prd.json (legacy format)
    const jsonPath = path.join(workspace, 'prd.json');
    try {
      if (!fs.existsSync(jsonPath)) return null;
      const content = fs.readFileSync(jsonPath, 'utf-8');
      return JSON.parse(content) as RalphPrd;
    } catch {
      return null;
    }
  }

  /**
   * Load Ralph config from workspace
   */
  private loadConfig(workspace: string): RalphConfig {
    const configPath = path.join(workspace, '.ralph', 'config.json');
    try {
      if (!fs.existsSync(configPath)) return DEFAULT_CONFIG;
      const content = fs.readFileSync(configPath, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(content) };
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  /**
   * Emit progress event via IPC
   */
  private emitProgress(event: RalphProgressEvent): void {
    ipcBridge.ralph.onProgress.emit(event);
  }
}

// Singleton instance
export const ralphService = new RalphService();
