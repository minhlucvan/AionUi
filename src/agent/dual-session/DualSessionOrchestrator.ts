/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DualSessionOrchestrator
 *
 * Spawns two ACP agent sessions (Driver + Navigator) and relays messages
 * between them via the channelEventBus hook mechanism. The sessions
 * communicate autonomously until the task is complete or max turns reached.
 *
 * Architecture:
 *   ┌──────────┐   channelEventBus   ┌──────────────┐
 *   │ Driver   │ ──────────────────► │ Orchestrator │
 *   │ Session  │ ◄────────────────── │              │
 *   └──────────┘   sendMessage()     │   Listens to │
 *                                    │   both via   │
 *   ┌──────────┐   channelEventBus   │   event bus  │
 *   │Navigator │ ──────────────────► │              │
 *   │ Session  │ ◄────────────────── │              │
 *   └──────────┘   sendMessage()     └──────────────┘
 *
 * When Session A emits a 'finish' signal via channelEventBus, the orchestrator:
 * 1. Captures the accumulated response content
 * 2. Formats it as a relay message
 * 3. Sends it to Session B via task.sendMessage()
 * 4. Session B processes and responds
 * 5. On Session B's 'finish', the cycle repeats back to A
 */

import { channelEventBus, type IAgentMessageEvent } from '@/channels/agent/ChannelEventBus';
import { uuid } from '@/common/utils';
import type AcpAgentManager from '@/process/task/AcpAgentManager';
import type { DualSessionConfig, DualSessionProgress, DualSessionResult, DualSessionRole, DualSessionStatus, DualSessionStatusCallback, DualSessionTurn } from './types';
import { DUAL_SESSION_COMPLETION_SIGNAL, DUAL_SESSION_DEFAULTS } from './types';
import { buildDriverInitialPrompt, buildNavigatorInitialPrompt, buildRelayMessage } from './DualSessionPromptBuilder';

/**
 * Function to create a conversation and return the task manager.
 * Injected by the service layer to avoid circular dependencies.
 */
export type CreateSessionFn = (params: {
  workspace: string;
  backend: string;
  yoloMode: boolean;
  customAgentId?: string;
  cliPath?: string;
  presetContext?: string;
  enabledSkills?: string[];
  assistantHooksPath?: string;
}) => Promise<{ conversationId: string; task: AcpAgentManager }>;

export class DualSessionOrchestrator {
  private config: DualSessionConfig;
  private createSession: CreateSessionFn;
  private onStatus: DualSessionStatusCallback | undefined;

  private _status: DualSessionStatus = 'idle';
  private _currentTurn = 0;
  private _turns: DualSessionTurn[] = [];
  private _startedAt = 0;

  private driverConversationId = '';
  private navigatorConversationId = '';
  private driverTask: AcpAgentManager | null = null;
  private navigatorTask: AcpAgentManager | null = null;

  /** Accumulated content from the session currently responding */
  private accumulatedContent: Map<string, string> = new Map();
  /** Track which session we're waiting for */
  private waitingFor: DualSessionRole | null = null;
  /** Unsubscribe function for channelEventBus listener */
  private unsubscribe: (() => void) | null = null;
  /** Resolve function for the run() promise */
  private runResolve: ((result: DualSessionResult) => void) | null = null;
  /** Whether the orchestrator has been stopped externally */
  private stopped = false;

  constructor(createSession: CreateSessionFn, config: Partial<DualSessionConfig> & { task: string; workspace: string }, onStatus?: DualSessionStatusCallback) {
    this.config = { ...DUAL_SESSION_DEFAULTS, ...config } as DualSessionConfig;
    this.createSession = createSession;
    this.onStatus = onStatus;
  }

  get status(): DualSessionStatus {
    return this._status;
  }

  get progress(): DualSessionProgress {
    return {
      currentTurn: this._currentTurn,
      maxTurns: this.config.maxTurns,
      status: this._status,
      driverConversationId: this.driverConversationId,
      navigatorConversationId: this.navigatorConversationId,
      turns: [...this._turns],
      startedAt: this._startedAt,
      endedAt: this._status === 'running' ? undefined : Date.now(),
    };
  }

  /**
   * Run the dual-session loop.
   *
   * 1. Creates both sessions
   * 2. Sends initial prompt to Driver
   * 3. Subscribes to channelEventBus for relay
   * 4. Returns when complete or max turns reached
   */
  async run(): Promise<DualSessionResult> {
    this._status = 'starting';
    this._startedAt = Date.now();
    this.stopped = false;
    this.emitProgress();

    try {
      // Create both sessions
      const [driverSession, navigatorSession] = await Promise.all([
        this.createSession({
          workspace: this.config.workspace,
          backend: this.config.driverBackend,
          yoloMode: this.config.yoloMode,
          customAgentId: this.config.driverCustomAgentId,
          cliPath: this.config.driverCliPath,
          presetContext: this.config.driverContext,
          enabledSkills: this.config.driverSkills,
          assistantHooksPath: this.config.assistantHooksPath,
        }),
        this.createSession({
          workspace: this.config.workspace,
          backend: this.config.navigatorBackend,
          yoloMode: this.config.yoloMode,
          customAgentId: this.config.navigatorCustomAgentId,
          cliPath: this.config.navigatorCliPath,
          presetContext: this.config.navigatorContext,
          enabledSkills: this.config.navigatorSkills,
          assistantHooksPath: this.config.assistantHooksPath,
        }),
      ]);

      this.driverConversationId = driverSession.conversationId;
      this.navigatorConversationId = navigatorSession.conversationId;
      this.driverTask = driverSession.task;
      this.navigatorTask = navigatorSession.task;

      console.log(`[DualSession] Driver: ${this.driverConversationId}, Navigator: ${this.navigatorConversationId}`);

      // Subscribe to channelEventBus for response events from both sessions
      this.subscribeToEvents();

      this._status = 'running';
      this.emitProgress();

      // Send initial prompts to both sessions
      const driverPrompt = buildDriverInitialPrompt(this.config);
      const navigatorPrompt = buildNavigatorInitialPrompt(this.config);

      // Send navigator prompt first (it will wait for instructions)
      await this.navigatorTask.sendMessage({
        content: navigatorPrompt,
        msg_id: uuid(),
      });

      // The Driver starts first - when it finishes, the relay begins
      this.waitingFor = 'driver';
      await this.driverTask.sendMessage({
        content: driverPrompt,
        msg_id: uuid(),
      });

      // Wait for the relay loop to complete
      return await new Promise<DualSessionResult>((resolve) => {
        this.runResolve = resolve;
      });
    } catch (error) {
      this._status = 'failed';
      this.cleanup();
      this.emitProgress();

      return {
        status: 'failed',
        totalTurns: this._currentTurn,
        taskCompleted: false,
        turns: this._turns,
        duration: Date.now() - this._startedAt,
        driverConversationId: this.driverConversationId,
        navigatorConversationId: this.navigatorConversationId,
        finalOutput: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Stop the dual-session run.
   */
  stop(): void {
    this.stopped = true;
    this._status = 'stopped';
    this.cleanup();
    this.emitProgress();

    if (this.runResolve) {
      this.runResolve({
        status: 'stopped',
        totalTurns: this._currentTurn,
        taskCompleted: false,
        turns: this._turns,
        duration: Date.now() - this._startedAt,
        driverConversationId: this.driverConversationId,
        navigatorConversationId: this.navigatorConversationId,
        finalOutput: 'Stopped by user',
      });
      this.runResolve = null;
    }
  }

  /**
   * Subscribe to the channelEventBus to capture response events
   * from both sessions. This is the "hooks" communication mechanism.
   */
  private subscribeToEvents(): void {
    this.unsubscribe = channelEventBus.onAgentMessage((event: IAgentMessageEvent) => {
      if (this.stopped) return;

      const isDriver = event.conversation_id === this.driverConversationId;
      const isNavigator = event.conversation_id === this.navigatorConversationId;

      if (!isDriver && !isNavigator) return;

      const conversationId = event.conversation_id;

      // Accumulate content from streaming events
      if (event.type === 'content' && typeof event.data === 'string') {
        const current = this.accumulatedContent.get(conversationId) || '';
        this.accumulatedContent.set(conversationId, current + event.data);
      }

      // On finish, relay to the other session
      if (event.type === 'finish') {
        const from: DualSessionRole = isDriver ? 'driver' : 'navigator';
        const content = this.accumulatedContent.get(conversationId) || '';
        this.accumulatedContent.delete(conversationId);

        // Only relay if this is the session we were waiting for
        if (this.waitingFor === from) {
          void this.onSessionFinished(from, content);
        }
      }
    });
  }

  /**
   * Called when a session finishes responding.
   * Handles the relay logic: check for completion, then forward to the other session.
   */
  private async onSessionFinished(from: DualSessionRole, content: string): Promise<void> {
    if (this.stopped) return;

    this._currentTurn++;
    const to: DualSessionRole = from === 'driver' ? 'navigator' : 'driver';

    // Record the turn
    const turn: DualSessionTurn = {
      turn: this._currentTurn,
      from,
      to,
      content,
      timestamp: Date.now(),
    };
    this._turns.push(turn);
    this.emitProgress();

    console.log(`[DualSession] Turn ${this._currentTurn}/${this.config.maxTurns}: ${from} -> ${to} (${content.length} chars)`);

    // Check for completion signal
    if (content.includes(DUAL_SESSION_COMPLETION_SIGNAL)) {
      console.log('[DualSession] Completion signal detected');
      this.complete(true, content);
      return;
    }

    // Check max turns
    if (this._currentTurn >= this.config.maxTurns) {
      console.log('[DualSession] Max turns reached');
      this._status = 'max_turns_reached';
      this.complete(false, content);
      return;
    }

    // Relay to the other session
    const relayMessage = buildRelayMessage(from, to, content, this._currentTurn, this.config.maxTurns);

    this.waitingFor = to;
    const targetTask = to === 'driver' ? this.driverTask : this.navigatorTask;

    if (!targetTask) {
      console.error(`[DualSession] Target task for ${to} is null`);
      this._status = 'failed';
      this.complete(false, `Target task for ${to} is not available`);
      return;
    }

    try {
      await targetTask.sendMessage({
        content: relayMessage,
        msg_id: uuid(),
      });
    } catch (error) {
      console.error(`[DualSession] Failed to relay to ${to}:`, error);
      this._status = 'failed';
      this.complete(false, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Complete the dual-session run and resolve the promise.
   */
  private complete(taskCompleted: boolean, finalOutput: string): void {
    if (this._status === 'running' || this._status === 'max_turns_reached') {
      this._status = taskCompleted ? 'completed' : this._status === 'max_turns_reached' ? 'max_turns_reached' : 'failed';
    }

    this.cleanup();
    this.emitProgress();

    if (this.runResolve) {
      this.runResolve({
        status: this._status,
        totalTurns: this._currentTurn,
        taskCompleted,
        turns: this._turns,
        duration: Date.now() - this._startedAt,
        driverConversationId: this.driverConversationId,
        navigatorConversationId: this.navigatorConversationId,
        finalOutput,
      });
      this.runResolve = null;
    }
  }

  /**
   * Clean up event subscriptions.
   */
  private cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.accumulatedContent.clear();
    this.waitingFor = null;
  }

  /**
   * Emit progress update to the status callback.
   */
  private emitProgress(): void {
    this.onStatus?.(this.progress);
  }
}
