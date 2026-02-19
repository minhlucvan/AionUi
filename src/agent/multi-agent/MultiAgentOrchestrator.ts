/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * MultiAgentOrchestrator — Generic topology-aware orchestrator.
 *
 * 1. Creates N agent nodes from the topology config
 * 2. Wires them onto the AgentBus
 * 3. Routes messages via TopologyRouter
 * 4. Detects completion (signal or max turns)
 * 5. Reports progress
 *
 * This is the generic engine; specific setups (pair, pipeline, star)
 * just provide different TopologyConfig values.
 */

import { uuid } from '@/common/utils';
import type AcpAgentManager from '@/process/task/AcpAgentManager';
import { AgentBus } from './AgentBus';
import { AgentNode } from './AgentNode';
import { BusLogger } from './BusLogger';
import { TopologyRouter } from './TopologyRouter';
import { buildNodeInitialPrompt } from './PromptBuilder';
import type { BusEvent, MultiAgentConfig, MultiAgentProgress, MultiAgentResult, MultiAgentStatus, MultiAgentTurn } from './types';
import { MULTI_AGENT_COMPLETION_SIGNAL, MULTI_AGENT_DEFAULTS } from './types';

/**
 * Factory function for creating an agent conversation.
 * Injected to avoid circular deps with the process layer.
 */
export type CreateNodeSessionFn = (params: { workspace: string; backend: string; yoloMode: boolean; customAgentId?: string; cliPath?: string; presetContext?: string; enabledSkills?: string[]; assistantHooksPath?: string }) => Promise<{ conversationId: string; task: AcpAgentManager }>;

export type MultiAgentStatusCallback = (progress: MultiAgentProgress) => void;

export class MultiAgentOrchestrator {
  private config: MultiAgentConfig;
  private createNodeSession: CreateNodeSessionFn;
  private onStatus: MultiAgentStatusCallback | undefined;

  readonly bus: AgentBus;
  private router: TopologyRouter;
  private logger: BusLogger;
  private nodes: Map<string, AgentNode> = new Map();
  private nodeConversationMap: Map<string, string> = new Map(); // nodeId -> conversationId

  private _status: MultiAgentStatus = 'idle';
  private _currentTurn = 0;
  private _turns: MultiAgentTurn[] = [];
  private _startedAt = 0;
  private _runId = '';

  private stopped = false;
  private runResolve: ((result: MultiAgentResult) => void) | null = null;
  private busUnsubscribe: (() => void) | null = null;

  constructor(createNodeSession: CreateNodeSessionFn, config: Partial<MultiAgentConfig> & { task: string; workspace: string; topology: MultiAgentConfig['topology']; logDir?: string }, onStatus?: MultiAgentStatusCallback) {
    this.config = {
      maxTurns: MULTI_AGENT_DEFAULTS.maxTurns,
      yoloMode: MULTI_AGENT_DEFAULTS.yoloMode,
      ...config,
    } as MultiAgentConfig;

    this.createNodeSession = createNodeSession;
    this.onStatus = onStatus;
    this.bus = new AgentBus();
    this.router = new TopologyRouter(this.config.topology);
    // Logger is created here but started in run() once we have a runId
    this.logger = new BusLogger('pending', this.bus, config.logDir);
  }

  get status(): MultiAgentStatus {
    return this._status;
  }

  get runId(): string {
    return this._runId;
  }

  get progress(): MultiAgentProgress {
    return {
      runId: this._runId,
      currentTurn: this._currentTurn,
      maxTurns: this.config.maxTurns,
      status: this._status,
      topology: this.config.topology.type,
      nodes: this.getNodeSummaries(),
      turns: [...this._turns],
      startedAt: this._startedAt,
      endedAt: this._status === 'running' ? undefined : Date.now(),
    };
  }

  /**
   * Run the multi-agent orchestration loop.
   */
  async run(): Promise<MultiAgentResult> {
    this._runId = uuid();
    this._status = 'starting';
    this._startedAt = Date.now();
    this.stopped = false;

    // Re-create logger with actual runId and start file + bus subscription
    this.logger = new BusLogger(this._runId, this.bus, (this.config as MultiAgentConfig & { logDir?: string }).logDir);
    this.logger.start();
    this.logger.logStart(this.config.topology, {
      task: this.config.task,
      workspace: this.config.workspace,
      maxTurns: this.config.maxTurns,
      yoloMode: this.config.yoloMode,
    });

    this.emitProgress();

    try {
      // 1. Create all agent nodes
      await this.createAllNodes();

      // 2. Subscribe to bus events for routing
      this.subscribeToBus();

      this._status = 'running';
      this.emitProgress();

      // 3. Send initial prompts to all nodes
      await this.sendInitialPrompts();

      // 4. Wait for completion
      return await new Promise<MultiAgentResult>((resolve) => {
        this.runResolve = resolve;
      });
    } catch (error) {
      this._status = 'failed';
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.logError(errMsg);
      this.cleanup();
      this.emitProgress();

      return this.buildResult(false, errMsg);
    }
  }

  /**
   * Stop the orchestration.
   */
  stop(): void {
    this.stopped = true;
    this._status = 'stopped';
    this.logger.logEvent('orchestrator:stop', { turn: this._currentTurn });
    this.cleanup();
    this.emitProgress();

    if (this.runResolve) {
      this.runResolve(this.buildResult(false, 'Stopped by user'));
      this.runResolve = null;
    }
  }

  /**
   * Get a node by ID.
   */
  getNode(nodeId: string): AgentNode | undefined {
    return this.nodes.get(nodeId);
  }

  // ─── Internal ───────────────────────────────────────────────

  private async createAllNodes(): Promise<void> {
    const createPromises = this.config.topology.nodes.map(async (nodeConfig) => {
      const node = new AgentNode(nodeConfig, this.bus);

      const session = await this.createNodeSession({
        workspace: this.config.workspace,
        backend: nodeConfig.backend,
        yoloMode: this.config.yoloMode,
        customAgentId: nodeConfig.customAgentId,
        cliPath: nodeConfig.cliPath,
        presetContext: nodeConfig.systemContext,
        enabledSkills: nodeConfig.enabledSkills,
        assistantHooksPath: nodeConfig.assistantHooksPath,
      });

      node.attach(session.conversationId, session.task);
      this.nodes.set(nodeConfig.id, node);
      this.nodeConversationMap.set(nodeConfig.id, session.conversationId);

      this.logger.logNodeCreated(nodeConfig.id, nodeConfig.role, nodeConfig.backend, session.conversationId);
      console.log(`[MultiAgent] Node "${nodeConfig.id}" (${nodeConfig.role}) -> conversation ${session.conversationId}`);
    });

    await Promise.all(createPromises);
  }

  private async sendInitialPrompts(): Promise<void> {
    const topology = this.config.topology;
    const nodeConfigs = topology.nodes;

    // Determine the "starter" node — first in pair/pipeline, hub in star, all in mesh
    const starterIds = this.getStarterNodeIds();

    for (const nodeConfig of nodeConfigs) {
      const node = this.nodes.get(nodeConfig.id);
      if (!node) continue;

      const isStarter = starterIds.includes(nodeConfig.id);
      const targets = this.router.getTargets(nodeConfig.id);
      const prompt = buildNodeInitialPrompt(this.config, nodeConfig, isStarter, targets);

      this.logger.logInitialPrompt(nodeConfig.id, prompt, isStarter);
      await node.sendInitialPrompt(prompt);
    }
  }

  /**
   * Subscribe to bus 'agent:response' events and route messages.
   */
  private subscribeToBus(): void {
    this.busUnsubscribe = this.bus.onEvent('agent:response', (event: BusEvent) => {
      if (this.stopped || !event.message) return;
      void this.onAgentResponse(event);
    });
  }

  private async onAgentResponse(event: BusEvent): Promise<void> {
    if (!event.message) return;
    const { from, content } = event.message;

    // Resolve targets from topology
    const targets = this.router.getTargets(from);
    if (targets.length === 0) {
      console.warn(`[MultiAgent] No targets for node "${from}"`);
      return;
    }

    this._currentTurn++;

    // Record turn for each target
    for (const targetId of targets) {
      this._turns.push({
        turn: this._currentTurn,
        from,
        to: targetId,
        content,
        timestamp: Date.now(),
      });
    }

    this.emitProgress();
    this.logger.logRoute(this._currentTurn, from, targets, content.length);
    console.log(`[MultiAgent] Turn ${this._currentTurn}/${this.config.maxTurns}: ${from} -> [${targets.join(', ')}] (${content.length} chars)`);

    // Check completion
    const completionPattern = this.config.completionPattern || MULTI_AGENT_COMPLETION_SIGNAL;
    if (content.includes(completionPattern)) {
      this.logger.logCompletion(this._currentTurn, from);
      console.log('[MultiAgent] Completion signal detected');
      this.finish(true, content);
      return;
    }

    // Check max turns
    if (this._currentTurn >= this.config.maxTurns) {
      this.logger.logMaxTurns(this._currentTurn, this.config.maxTurns);
      console.log('[MultiAgent] Max turns reached');
      this._status = 'max_turns_reached';
      this.finish(false, content);
      return;
    }

    // Route to targets
    const turnsRemaining = this.config.maxTurns - this._currentTurn;
    const relayContent = this.formatRelay(from, content, turnsRemaining);

    for (const targetId of targets) {
      const targetNode = this.nodes.get(targetId);
      if (!targetNode) {
        console.warn(`[MultiAgent] Target node "${targetId}" not found`);
        continue;
      }

      try {
        await targetNode.deliver({
          ...event.message,
          id: uuid(),
          from,
          to: targetId,
          content: relayContent,
          timestamp: Date.now(),
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.logError(errMsg, { context: 'deliver', targetId, turn: this._currentTurn });
        console.error(`[MultiAgent] Failed to deliver to "${targetId}":`, err);
        this.bus.error(targetId, errMsg);
      }
    }
  }

  private formatRelay(from: string, content: string, turnsRemaining: number): string {
    const fromNode = this.nodes.get(from);
    const fromLabel = fromNode?.label || from;

    let relay = `[Message from ${fromLabel} (${from}), Turn ${this._currentTurn}/${this.config.maxTurns}]\n\n${content}`;

    if (turnsRemaining <= 3) {
      relay += `\n\n---\n**Note:** ${turnsRemaining} turn(s) remaining. Please wrap up.`;
      relay += `\nTo signal completion: ${this.config.completionPattern || MULTI_AGENT_COMPLETION_SIGNAL}`;
    }

    return relay;
  }

  private finish(taskCompleted: boolean, finalOutput: string): void {
    if (this._status === 'running' || this._status === 'max_turns_reached') {
      this._status = taskCompleted ? 'completed' : this._status === 'max_turns_reached' ? 'max_turns_reached' : 'failed';
    }

    const result = this.buildResult(taskCompleted, finalOutput);
    this.logger.logFinish({
      status: result.status,
      totalTurns: result.totalTurns,
      taskCompleted: result.taskCompleted,
      duration: result.duration,
      logFile: this.logger.getFilePath(),
    });

    this.cleanup();
    this.emitProgress();

    if (taskCompleted) {
      this.bus.complete({ totalTurns: this._currentTurn });
    }

    if (this.runResolve) {
      this.runResolve(result);
      this.runResolve = null;
    }
  }

  private cleanup(): void {
    this.logger.stop();
    if (this.busUnsubscribe) {
      this.busUnsubscribe();
      this.busUnsubscribe = null;
    }
    for (const node of this.nodes.values()) {
      node.detach();
    }
  }

  private buildResult(taskCompleted: boolean, finalOutput: string): MultiAgentResult {
    return {
      status: this._status,
      totalTurns: this._currentTurn,
      taskCompleted,
      turns: this._turns,
      duration: Date.now() - this._startedAt,
      nodes: this.getNodeSummaries(),
      finalOutput,
      logFile: this.logger.getFilePath(),
    };
  }

  private getNodeSummaries() {
    return Array.from(this.nodes.entries()).map(([id, node]) => ({
      id,
      role: node.role,
      conversationId: node.getConversationId(),
    }));
  }

  private getStarterNodeIds(): string[] {
    const topo = this.config.topology;
    switch (topo.type) {
      case 'pair':
        // First node starts
        return [topo.nodes[0]?.id].filter(Boolean);
      case 'pipeline':
        return [topo.pipelineOrder?.[0] || topo.nodes[0]?.id].filter(Boolean);
      case 'star':
        return [topo.hubNodeId || topo.nodes[0]?.id].filter(Boolean);
      case 'mesh':
        // All nodes start
        return topo.nodes.map((n) => n.id);
      default:
        return [topo.nodes[0]?.id].filter(Boolean);
    }
  }

  private emitProgress(): void {
    this.onStatus?.(this.progress);
  }
}
