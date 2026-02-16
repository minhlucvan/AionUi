/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IResponseMessage } from '@/common/ipcBridge';
import type { AcpBackend } from '@/types/acpTypes';
import { teamEventBus } from './TeamEventBus';
import type { AgentRole, AgentRunResult } from './types';

/**
 * TeamAgentRunner — Manages a single agent process within a team.
 *
 * Wraps AcpAgent to:
 * 1. Spawn the agent with role-specific configuration
 * 2. Collect text output from the stream
 * 3. Resolve a Promise when the agent finishes
 * 4. Publish events to TeamEventBus
 *
 * AcpAgent is loaded lazily to avoid pulling Electron at import time.
 */
export class TeamAgentRunner {
  readonly id: string;
  readonly role: AgentRole;
  readonly sessionId: string;

  private agent: unknown = null; // AcpAgent — typed as unknown to avoid import-time Electron dep
  private output = '';
  private finished = false;

  constructor(
    private readonly config: {
      id: string;
      role: AgentRole;
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

  /** Start the agent process (connect to CLI) */
  async start(): Promise<void> {
    // Lazy import to avoid Electron dependency at module load time
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

    teamEventBus.publish('agent_started', this.sessionId, {
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

      // Send the prompt — this triggers the agent to work
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (this.agent as any).sendMessage({ content: prompt });

      // Wait for the 'finish' event that signals the agent is done
      await finishPromise;

      teamEventBus.publish('agent_finished', this.sessionId, {
        agentId: this.id,
        data: { outputLength: this.output.length },
      });

      return { output: this.output, status: 'completed' };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      teamEventBus.publish('agent_error', this.sessionId, {
        agentId: this.id,
        data: { error },
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
      teamEventBus.publish('agent_output', this.sessionId, {
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
      const timeout = setTimeout(() => {
        reject(new Error(`Agent ${this.id} timed out (10 minutes)`));
      }, 10 * 60 * 1000);

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
