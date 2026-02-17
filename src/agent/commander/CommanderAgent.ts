/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IResponseMessage } from '@/common/ipcBridge';
import { uuid } from '@/common/utils';
import type { AcpBackend } from '@/types/acpTypes';
import { AcpAgent, type AcpAgentConfig } from '@/agent/acp';

/**
 * Commander step status
 */
type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Represents a single step in the commander's execution plan
 */
interface CommanderStep {
  id: string;
  instruction: string;
  status: StepStatus;
  result?: string;
  error?: string;
}

/**
 * Commander execution state
 */
type CommanderState = 'idle' | 'planning' | 'executing' | 'reviewing' | 'completed' | 'failed';

/**
 * Commander Agent configuration
 */
export interface CommanderAgentConfig {
  id: string;
  workspace: string;
  backend: AcpBackend;
  cliPath?: string;
  customArgs?: string[];
  customEnv?: Record<string, string>;
  yoloMode?: boolean;
  acpSessionId?: string;
  acpSessionUpdatedAt?: number;
  onStreamEvent: (data: IResponseMessage) => void;
  onSignalEvent?: (data: IResponseMessage) => void;
  onSessionIdUpdate?: (sessionId: string) => void;
}

/**
 * CommanderAgent - An autonomous orchestrator that controls an ACP agent session
 *
 * The Commander takes a high-level task from the user, breaks it into steps,
 * and sends commands to a worker ACP agent session one by one. It monitors
 * each response, decides next steps, and continues until the task is complete.
 *
 * Architecture:
 * - Uses AcpAgent internally as the "worker" that executes commands
 * - The Commander wraps the worker, intercepting all responses
 * - Maintains a step-based execution plan
 * - Autonomously sends the next command after each worker response
 *
 * Flow:
 * 1. User sends a task prompt to Commander
 * 2. Commander creates an execution plan (list of steps)
 * 3. Commander sends first step instruction to the worker ACP agent
 * 4. Worker executes and streams back responses
 * 5. Commander collects the response, evaluates result
 * 6. Commander sends next step or adjusts plan based on results
 * 7. Repeat until all steps complete or failure
 */
export class CommanderAgent {
  private readonly id: string;
  private readonly config: CommanderAgentConfig;
  private worker: AcpAgent | null = null;
  private state: CommanderState = 'idle';
  private steps: CommanderStep[] = [];
  private currentStepIndex: number = -1;
  private taskPrompt: string = '';
  private workerResponseBuffer: string = '';
  private isWorkerBusy: boolean = false;

  private readonly onStreamEvent: (data: IResponseMessage) => void;
  private readonly onSignalEvent?: (data: IResponseMessage) => void;

  constructor(config: CommanderAgentConfig) {
    this.id = config.id;
    this.config = config;
    this.onStreamEvent = config.onStreamEvent;
    this.onSignalEvent = config.onSignalEvent;
  }

  /**
   * Start the commander - initializes the worker ACP agent
   */
  async start(): Promise<void> {
    this.emitStatus('connecting');

    const workerConfig: AcpAgentConfig = {
      id: this.id,
      backend: this.config.backend,
      cliPath: this.config.cliPath,
      workingDir: this.config.workspace,
      customArgs: this.config.customArgs,
      customEnv: this.config.customEnv,
      extra: {
        workspace: this.config.workspace,
        backend: this.config.backend,
        cliPath: this.config.cliPath,
        customWorkspace: true,
        customArgs: this.config.customArgs,
        customEnv: this.config.customEnv,
        yoloMode: this.config.yoloMode ?? true, // Commander defaults to yolo mode
        acpSessionId: this.config.acpSessionId,
        acpSessionUpdatedAt: this.config.acpSessionUpdatedAt,
      },
      onStreamEvent: (message) => {
        this.handleWorkerStreamEvent(message);
      },
      onSignalEvent: (message) => {
        this.handleWorkerSignalEvent(message);
      },
      onSessionIdUpdate: this.config.onSessionIdUpdate,
    };

    this.worker = new AcpAgent(workerConfig);
    await this.worker.start();
    this.emitStatus('session_active');
  }

  /**
   * Send a task to the commander for autonomous execution
   */
  async sendMessage(data: { content: string; msg_id?: string }): Promise<{ success: boolean; msg?: string }> {
    if (!this.worker) {
      return { success: false, msg: 'Commander not started' };
    }

    this.taskPrompt = data.content;
    this.state = 'planning';

    // Emit start event
    this.onStreamEvent({
      type: 'start',
      conversation_id: this.id,
      msg_id: data.msg_id || uuid(),
      data: null,
    });

    // Build the execution plan
    this.buildPlan(data.content);

    // Emit the plan to UI
    this.emitPlan();

    // Emit commander thinking message
    this.emitCommanderMessage(
      `**Commander**: Received task. Breaking it down into ${this.steps.length} steps.\n\n` +
        this.steps.map((s, i) => `${i + 1}. ${s.instruction}`).join('\n')
    );

    // Start executing the first step
    this.state = 'executing';
    await this.executeNextStep();

    return { success: true };
  }

  /**
   * Build execution plan from the task prompt.
   * The commander creates a structured plan of commands to send to the worker.
   *
   * This builds a plan that wraps the original task into a structured
   * commander workflow: analyze -> execute -> verify -> summarize
   */
  private buildPlan(taskPrompt: string): void {
    this.steps = [
      {
        id: uuid(),
        instruction: `Analyze the following task and create a plan. Do NOT execute anything yet, just analyze and respond with your plan:\n\n${taskPrompt}`,
        status: 'pending',
      },
      {
        id: uuid(),
        instruction: `Now execute the plan you created. Work through each step carefully. Here is the original task for reference:\n\n${taskPrompt}`,
        status: 'pending',
      },
      {
        id: uuid(),
        instruction: 'Review what you have done. List any issues found, files changed, and confirm the task is complete. If there are remaining issues, fix them now.',
        status: 'pending',
      },
      {
        id: uuid(),
        instruction: 'Provide a final summary of everything that was done, including all files modified and any important notes for the user.',
        status: 'pending',
      },
    ];
    this.currentStepIndex = -1;
  }

  /**
   * Execute the next step in the plan
   */
  private async executeNextStep(): Promise<void> {
    this.currentStepIndex++;

    if (this.currentStepIndex >= this.steps.length) {
      // All steps completed
      this.state = 'completed';
      this.emitCommanderMessage('**Commander**: All steps completed successfully.');
      this.emitFinish();
      return;
    }

    const step = this.steps[this.currentStepIndex];
    step.status = 'running';

    // Update plan UI
    this.emitPlan();

    // Emit commander message about current step
    this.emitCommanderMessage(
      `**Commander**: Step ${this.currentStepIndex + 1}/${this.steps.length} - ${step.instruction.split('\n')[0]}`
    );

    // Reset response buffer
    this.workerResponseBuffer = '';
    this.isWorkerBusy = true;

    // Send the instruction to the worker
    try {
      await this.worker!.sendMessage({
        content: step.instruction,
        msg_id: uuid(),
      });
    } catch (error) {
      step.status = 'failed';
      step.error = error instanceof Error ? error.message : String(error);
      this.emitCommanderMessage(`**Commander**: Step ${this.currentStepIndex + 1} failed: ${step.error}`);
      this.emitPlan();
      this.state = 'failed';
      this.emitFinish();
    }
  }

  /**
   * Handle streaming events from the worker agent.
   * We forward all worker events to the UI, but also buffer text content
   * for the commander to analyze when the turn ends.
   */
  private handleWorkerStreamEvent(message: IResponseMessage): void {
    // Buffer text content for commander analysis
    if (message.type === 'content' && typeof message.data === 'string') {
      this.workerResponseBuffer += message.data;
    }

    // Forward all worker events to the UI
    this.onStreamEvent(message);
  }

  /**
   * Handle signal events from the worker agent.
   * The key event is 'finish' which indicates the worker has completed its turn.
   * The commander then decides what to do next.
   */
  private handleWorkerSignalEvent(message: IResponseMessage): void {
    if (message.type === 'finish') {
      this.isWorkerBusy = false;

      // Mark current step as completed
      if (this.currentStepIndex >= 0 && this.currentStepIndex < this.steps.length) {
        const step = this.steps[this.currentStepIndex];
        step.status = 'completed';
        step.result = this.workerResponseBuffer;
        this.emitPlan();
      }

      // Autonomously proceed to next step
      if (this.state === 'executing') {
        // Small delay to let UI update
        setTimeout(() => {
          this.executeNextStep().catch((error) => {
            console.error('[CommanderAgent] Failed to execute next step:', error);
            this.state = 'failed';
            this.emitFinish();
          });
        }, 1000);
        return; // Don't forward finish signal yet - we're continuing
      }
    }

    // Forward permission requests to UI
    if (message.type === 'acp_permission') {
      this.onSignalEvent?.(message);
      return;
    }

    // Forward other signals
    if (this.state === 'completed' || this.state === 'failed') {
      this.onSignalEvent?.(message);
    }
  }

  /**
   * Emit a commander-level message to the UI
   */
  private emitCommanderMessage(content: string): void {
    this.onStreamEvent({
      type: 'content',
      conversation_id: this.id,
      msg_id: uuid(),
      data: content + '\n\n---\n\n',
    });
  }

  /**
   * Emit the current execution plan to the UI
   */
  private emitPlan(): void {
    const planData = {
      entries: this.steps.map((step) => ({
        content: step.instruction.split('\n')[0], // First line as title
        status: step.status === 'running' ? 'in_progress' : step.status,
      })),
    };

    this.onStreamEvent({
      type: 'plan',
      conversation_id: this.id,
      msg_id: 'commander-plan',
      data: planData,
    });
  }

  /**
   * Emit status message
   */
  private emitStatus(status: string): void {
    this.onStreamEvent({
      type: 'agent_status',
      conversation_id: this.id,
      msg_id: 'commander-status',
      data: { backend: 'commander', status },
    });
  }

  /**
   * Emit finish signal
   */
  private emitFinish(): void {
    this.onSignalEvent?.({
      type: 'finish',
      conversation_id: this.id,
      msg_id: uuid(),
      data: null,
    });
  }

  /**
   * Confirm a permission request (delegates to worker)
   */
  async confirmMessage(data: { confirmKey: string; callId: string }): Promise<{ success: boolean }> {
    if (!this.worker) {
      return { success: false };
    }
    return this.worker.confirmMessage(data);
  }

  /**
   * Stop the commander and its worker
   */
  async stop(): Promise<void> {
    this.state = 'idle';
    if (this.worker) {
      await this.worker.stop();
    }
  }

  /**
   * Kill the commander
   */
  kill(): void {
    this.stop().catch((error) => {
      console.error('[CommanderAgent] Error stopping:', error);
    });
  }

  get isConnected(): boolean {
    return this.worker?.isConnected ?? false;
  }

  get hasActiveSession(): boolean {
    return this.worker?.hasActiveSession ?? false;
  }

  get currentSessionId(): string | null {
    return this.worker?.currentSessionId ?? null;
  }

  /**
   * Compatibility with BaseAgentManager
   */
  postMessagePromise(action: string, data: unknown): Promise<any> {
    switch (action) {
      case 'send.message':
        return this.sendMessage(data as { content: string; msg_id?: string });
      case 'stop.stream':
        return this.stop();
      default:
        return Promise.reject(new Error(`Unknown action: ${action}`));
    }
  }
}
