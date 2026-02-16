/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IResponseMessage } from '@/common/ipcBridge';
import type { AcpBackend } from '@/types/acpTypes';
import { sprintEventBus } from './SprintEventBus';
import type { SprintAgentRole, AgentRunResult } from './types';

/**
 * SprintAgentRunner — Manages a single agent process within a sprint team.
 *
 * Used for all three roles (planner, worker, judge). Each runner:
 * 1. Spawns an AcpAgent with role-specific configuration
 * 2. Sends a prompt and waits for the agent to finish
 * 3. Collects text output from the stream
 * 4. Publishes events to SprintEventBus
 *
 * AcpAgent is loaded lazily to avoid pulling Electron at import time.
 */
export class SprintAgentRunner {
  readonly id: string;
  readonly role: SprintAgentRole;
  readonly sessionId: string;

  private agent: unknown = null;
  private output = '';
  private finished = false;

  constructor(
    private readonly config: {
      id: string;
      role: SprintAgentRole;
      sessionId: string;
      backend: AcpBackend;
      workingDir: string;
      cliPath?: string;
    }
  ) {
    this.id = config.id;
    this.role = config.role;
    this.sessionId = config.sessionId;
  }

  /** Start the agent process */
  async start(): Promise<void> {
    const { AcpAgent } = await import('@/agent/acp');

    const agent = new AcpAgent({
      id: this.id,
      backend: this.config.backend,
      cliPath: this.config.cliPath,
      workingDir: this.config.workingDir,
      extra: {
        workspace: this.config.workingDir,
        backend: this.config.backend,
        cliPath: this.config.cliPath,
      },
      onStreamEvent: (data: IResponseMessage) => this.handleStreamEvent(data),
    });

    this.agent = agent;
    await agent.start();

    sprintEventBus.publish('agent_started', this.sessionId, {
      agentId: this.id,
      data: { role: this.role, backend: this.config.backend },
    });
  }

  /**
   * Send a prompt and wait for the agent to finish processing.
   * Returns the collected text output.
   */
  async run(prompt: string): Promise<AgentRunResult> {
    if (!this.agent) {
      return { output: '', status: 'error', error: 'Agent not started' };
    }

    this.output = '';
    this.finished = false;

    try {
      const finishPromise = this.waitForFinish();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (this.agent as any).sendMessage({ content: prompt });

      await finishPromise;

      sprintEventBus.publish('agent_finished', this.sessionId, {
        agentId: this.id,
        data: { outputLength: this.output.length, role: this.role },
      });

      return { output: this.output, status: 'completed' };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      sprintEventBus.publish('agent_error', this.sessionId, {
        agentId: this.id,
        data: { error, role: this.role },
      });
      return { output: this.output, status: 'error', error };
    }
  }

  /** Stop the agent process */
  async stop(): Promise<void> {
    if (this.agent) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (this.agent as any).stop();
      } catch {
        // Best-effort stop
      }
      this.agent = null;
    }
  }

  /** Get the accumulated output so far */
  getOutput(): string {
    return this.output;
  }

  private handleStreamEvent(data: IResponseMessage): void {
    if (data.type === 'content' && typeof data.data === 'string') {
      this.output += data.data;
      sprintEventBus.publish('agent_output', this.sessionId, {
        agentId: this.id,
        data: { chunk: data.data, role: this.role },
      });
    } else if (data.type === 'finish') {
      this.finished = true;
    }
  }

  private waitForFinish(): Promise<void> {
    if (this.finished) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => {
          reject(new Error(`Agent ${this.id} (${this.role}) timed out (10 minutes)`));
        },
        10 * 60 * 1000
      );

      const check = () => {
        if (this.finished) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(check, 500);
        }
      };
      check();
    });
  }
}
