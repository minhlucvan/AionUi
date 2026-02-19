/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * MultiAgentSession — Simplified hooks-driven multi-agent orchestration.
 *
 * Instead of layering AgentBus + AgentNode + TopologyRouter, this class
 * directly holds AcpAgentManager instances and uses:
 *
 *   - channelEventBus  → listen for agent responses
 *   - FileRelay        → shared feed file for coordination
 *   - NodeHookRunner   → per-node hooks drive the workflow
 *   - enqueueMessages  → route messages between agents via their queues
 *
 * Architecture:
 *   ┌─────────────────────────────────────────┐
 *   │            MultiAgentSession            │
 *   │                                         │
 *   │  agents:  Map<nodeId, AcpAgentManager>  │
 *   │  hooks:   Map<nodeId, NodeHookRunner>   │
 *   │  feed:    FileRelay (shared)            │
 *   │                                         │
 *   │  channelEventBus ──► onNodeFinish()     │
 *   │    └─► run hooks                        │
 *   │    └─► write feed                       │
 *   │    └─► route to targets via enqueue     │
 *   └─────────────────────────────────────────┘
 *
 * Hooks control everything: routing, completion, side-effects.
 * Default routing (topology-based) kicks in when hooks don't route.
 */

import { channelEventBus, type IAgentMessageEvent } from '@/channels/agent/ChannelEventBus';
import { uuid } from '@/common/utils';
import type AcpAgentManager from '@/process/task/AcpAgentManager';
import { FileRelay } from './FileRelay';
import { NodeHookRunner } from './NodeHookRunner';
import { buildNodeInitialPrompt } from './PromptBuilder';
import type { AgentNodeConfig, MultiAgentConfig, MultiAgentProgress, MultiAgentResult, MultiAgentStatus, MultiAgentTurn } from './types';
import { MULTI_AGENT_COMPLETION_SIGNAL, MULTI_AGENT_DEFAULTS } from './types';

// ─── Public types ────────────────────────────────────────────

export type CreateSessionFn = (params: { workspace: string; backend: string; yoloMode: boolean; customAgentId?: string; cliPath?: string; presetContext?: string; enabledSkills?: string[]; assistantHooksPath?: string }) => Promise<{ conversationId: string; task: AcpAgentManager }>;

export type StatusCallback = (progress: MultiAgentProgress) => void;

// ─── Session class ───────────────────────────────────────────

export class MultiAgentSession {
  private config: MultiAgentConfig;
  private createSession: CreateSessionFn;
  private onStatus: StatusCallback | undefined;

  // Core state: just agents, hooks, and feed
  private agents = new Map<string, AcpAgentManager>();
  private hookRunners = new Map<string, NodeHookRunner>();
  private feed: FileRelay | null = null;

  // Mapping: conversationId → nodeId
  private convToNode = new Map<string, string>();
  // Accumulated streaming content per conversation
  private accumulated = new Map<string, string>();
  // Simple routing table: nodeId → target nodeIds
  private routes = new Map<string, string[]>();

  private _status: MultiAgentStatus = 'idle';
  private _turn = 0;
  private _turns: MultiAgentTurn[] = [];
  private _startedAt = 0;
  private _runId = '';
  private _nodeInfo: Array<{ id: string; role: string; conversationId: string }> = [];

  private stopped = false;
  private resolveRun: ((result: MultiAgentResult) => void) | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(createSession: CreateSessionFn, config: Partial<MultiAgentConfig> & { task: string; workspace: string; topology: MultiAgentConfig['topology'] }, onStatus?: StatusCallback) {
    this.config = {
      maxTurns: MULTI_AGENT_DEFAULTS.maxTurns,
      yoloMode: MULTI_AGENT_DEFAULTS.yoloMode,
      ...config,
    } as MultiAgentConfig;
    this.createSession = createSession;
    this.onStatus = onStatus;
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
      currentTurn: this._turn,
      maxTurns: this.config.maxTurns,
      status: this._status,
      topology: this.config.topology.type,
      nodes: [...this._nodeInfo] as MultiAgentProgress['nodes'],
      turns: [...this._turns],
      startedAt: this._startedAt,
      endedAt: this._status === 'running' ? undefined : Date.now(),
    };
  }

  // ─── Run ─────────────────────────────────────────────────

  async run(): Promise<MultiAgentResult> {
    this._runId = uuid();
    this._status = 'starting';
    this._startedAt = Date.now();
    this.stopped = false;

    // Shared feed for all agents
    const nodeIds = this.config.topology.nodes.map((n) => n.id);
    this.feed = new FileRelay(this.config.workspace, this._runId);
    this.feed.start(nodeIds);

    // Build routing table from topology
    this.buildRoutes();

    this.emitProgress();

    try {
      // 1. Create all agents
      await this.createAgents();

      // 2. Subscribe to channelEventBus for all agents
      this.subscribe();

      this._status = 'running';
      this.emitProgress();

      // 3. Send initial prompts
      await this.sendInitialPrompts();

      // 4. Wait for completion
      return await new Promise<MultiAgentResult>((resolve) => {
        this.resolveRun = resolve;
      });
    } catch (error) {
      this._status = 'failed';
      this.cleanup();
      this.emitProgress();
      return this.buildResult(false, error instanceof Error ? error.message : String(error));
    }
  }

  stop(): void {
    this.stopped = true;
    this._status = 'stopped';
    this.cleanup();
    this.emitProgress();

    if (this.resolveRun) {
      this.resolveRun(this.buildResult(false, 'Stopped by user'));
      this.resolveRun = null;
    }
  }

  // ─── Internals ───────────────────────────────────────────

  private async createAgents(): Promise<void> {
    const promises = this.config.topology.nodes.map(async (nodeConfig) => {
      const session = await this.createSession({
        workspace: this.config.workspace,
        backend: nodeConfig.backend,
        yoloMode: this.config.yoloMode,
        customAgentId: nodeConfig.customAgentId,
        cliPath: nodeConfig.cliPath,
        presetContext: nodeConfig.systemContext,
        enabledSkills: nodeConfig.enabledSkills,
        assistantHooksPath: nodeConfig.assistantHooksPath,
      });

      this.agents.set(nodeConfig.id, session.task);
      this.convToNode.set(session.conversationId, nodeConfig.id);
      this._nodeInfo.push({ id: nodeConfig.id, role: nodeConfig.role, conversationId: session.conversationId });

      // Create hook runner if hooks configured
      if (nodeConfig.nodeHooksPath && this.feed) {
        const runner = new NodeHookRunner({
          hooksPath: nodeConfig.nodeHooksPath,
          nodeId: nodeConfig.id,
          role: nodeConfig.role,
          workspace: this.config.workspace,
          relayDir: this.feed.getRootDir(),
          topologyType: this.config.topology.type,
          maxTurns: this.config.maxTurns,
        });
        if (runner.hasHooks()) {
          this.hookRunners.set(nodeConfig.id, runner);
        }
      }

      console.log(`[MultiAgent] Node "${nodeConfig.id}" (${nodeConfig.role}) -> conversation ${session.conversationId}`);
    });

    await Promise.all(promises);
  }

  private async sendInitialPrompts(): Promise<void> {
    const starterIds = this.getStarterNodeIds();

    for (const nodeConfig of this.config.topology.nodes) {
      const agent = this.agents.get(nodeConfig.id);
      if (!agent) continue;

      const isStarter = starterIds.includes(nodeConfig.id);
      const targets = this.routes.get(nodeConfig.id) || [];
      const prompt = buildNodeInitialPrompt(this.config, nodeConfig, isStarter, targets);

      // Write to feed
      this.feed?.writeInitialPrompt(nodeConfig.id, prompt);

      // Run onNodeInit hooks
      const runner = this.hookRunners.get(nodeConfig.id);
      if (runner) {
        const hookResult = await runner.run('onNodeInit');
        this.applyHookResult(nodeConfig.id, hookResult);
      }

      await agent.sendMessage({ content: prompt, msg_id: uuid() });
    }
  }

  /**
   * Subscribe to channelEventBus — one listener for ALL agents.
   */
  private subscribe(): void {
    this.unsubscribe = channelEventBus.onAgentMessage((event: IAgentMessageEvent) => {
      if (this.stopped) return;

      const nodeId = this.convToNode.get(event.conversation_id);
      if (!nodeId) return;

      // Accumulate streaming text
      if (event.type === 'content' && typeof event.data === 'string') {
        const prev = this.accumulated.get(event.conversation_id) || '';
        this.accumulated.set(event.conversation_id, prev + event.data);
      }

      // On finish: run hooks, write feed, route
      if (event.type === 'finish') {
        const content = this.accumulated.get(event.conversation_id) || '';
        this.accumulated.set(event.conversation_id, '');

        if (content) {
          void this.onNodeFinish(nodeId, content);
        }
      }
    });
  }

  /**
   * Core routing: when a node finishes, decide what happens next.
   * Hooks get first say. Default topology routing is the fallback.
   */
  private async onNodeFinish(nodeId: string, content: string): Promise<void> {
    this._turn++;
    const turn = this._turn;

    // Write to feed
    this.feed?.writeOutbox(nodeId, turn, content);
    this.feed?.appendFeed({ type: 'node:finish', nodeId, turn, contentLength: content.length });

    console.log(`[MultiAgent] Turn ${turn}/${this.config.maxTurns}: ${nodeId} finished (${content.length} chars)`);

    // Always record the turn for default routing targets
    const targets = this.routes.get(nodeId) || [];
    for (const targetId of targets) {
      this._turns.push({ turn, from: nodeId, to: targetId, content, timestamp: Date.now() });
    }
    this.emitProgress();

    // Check completion signal
    const completionPattern = this.config.completionPattern || MULTI_AGENT_COMPLETION_SIGNAL;
    if (content.includes(completionPattern)) {
      console.log('[MultiAgent] Completion signal detected');
      this.finish(true, content);
      return;
    }

    // Check max turns
    if (turn >= this.config.maxTurns) {
      console.log('[MultiAgent] Max turns reached');
      this._status = 'max_turns_reached';
      this.finish(false, content);
      return;
    }

    // Run onNodeResponse hooks
    let hookHandledRouting = false;
    const runner = this.hookRunners.get(nodeId);
    if (runner) {
      const hookResult = await runner.run('onNodeResponse', { turn, content });

      // Hook-driven completion
      if (hookResult.complete) {
        console.log(`[MultiAgent] Hook completion from "${nodeId}"`);
        this.finish(true, content);
        return;
      }

      // Hook-driven routing via busMessages
      if (hookResult.busMessages?.length) {
        hookHandledRouting = true;
        for (const msg of hookResult.busMessages) {
          this.routeToAgent(nodeId, msg.to, msg.content, turn);
        }
      }

      // Hook can also queue messages into the node's own queue
      this.applyHookResult(nodeId, hookResult);
    }

    // Default routing: deliver to topology targets (turns already recorded above)
    if (!hookHandledRouting) {
      if (targets.length === 0) {
        console.warn(`[MultiAgent] No targets for node "${nodeId}"`);
        return;
      }

      const turnsRemaining = this.config.maxTurns - turn;
      const relayContent = this.formatRelay(nodeId, content, turn, turnsRemaining);

      for (const targetId of targets) {
        this.deliverToAgent(targetId, relayContent, turn, nodeId);
      }
    }
  }

  /**
   * Route a hook-driven message: record the turn and deliver.
   */
  private routeToAgent(from: string, to: string, content: string, turn: number): void {
    this._turns.push({ turn, from, to, content, timestamp: Date.now() });
    this.emitProgress();
    this.deliverToAgent(to, content, turn, from);
  }

  /**
   * Deliver a message to an agent via its queue (no turn recording).
   */
  private deliverToAgent(to: string, content: string, turn: number, from: string): void {
    const targetAgent = this.agents.get(to);
    if (!targetAgent) {
      console.warn(`[MultiAgent] Target "${to}" not found`);
      return;
    }

    // Write to feed
    this.feed?.writeInbox(to, turn, from, content);

    // Run onNodeReceive hooks on the target
    const targetRunner = this.hookRunners.get(to);
    if (targetRunner) {
      void targetRunner.run('onNodeReceive', { turn, content, from }).then((hookResult) => {
        if (hookResult.blocked) return;

        const finalContent = hookResult.content ?? content;
        targetAgent.enqueueMessages([{ content: finalContent, priority: 'normal', source: 'system' }]);

        this.applyHookResult(to, hookResult);
      });
    } else {
      // No hooks — just enqueue directly
      targetAgent.enqueueMessages([{ content, priority: 'normal', source: 'system' }]);
    }

    console.log(`[MultiAgent] Turn ${turn}: ${from} -> ${to} (${content.length} chars)`);
  }

  /**
   * Apply hook side-effects: queue messages into the node's own queue.
   */
  private applyHookResult(nodeId: string, result: { queueMessages?: Array<{ content: string; files?: string[]; priority?: 'normal' | 'high' }> }): void {
    if (!result.queueMessages?.length) return;
    const agent = this.agents.get(nodeId);
    if (!agent) return;

    agent.enqueueMessages(
      result.queueMessages.map((m) => ({
        content: m.content,
        files: m.files,
        priority: m.priority || 'normal',
        source: 'system' as const,
      }))
    );
  }

  private formatRelay(from: string, content: string, turn: number, turnsRemaining: number): string {
    const nodeConfig = this.config.topology.nodes.find((n) => n.id === from);
    const label = nodeConfig?.label || from;

    let relay = `[Message from ${label} (${from}), Turn ${turn}/${this.config.maxTurns}]\n\n${content}`;

    if (turnsRemaining <= 3) {
      relay += `\n\n---\n**Note:** ${turnsRemaining} turn(s) remaining. Please wrap up.`;
      relay += `\nTo signal completion: ${this.config.completionPattern || MULTI_AGENT_COMPLETION_SIGNAL}`;
    }

    return relay;
  }

  // ─── Routing table ───────────────────────────────────────

  /**
   * Build a simple routing table from topology config.
   * This replaces TopologyRouter entirely — just a map of edges.
   */
  private buildRoutes(): void {
    const topo = this.config.topology;
    const nodes = topo.nodes;
    this.routes.clear();

    // Initialize all nodes
    for (const n of nodes) {
      this.routes.set(n.id, []);
    }

    let edges: Array<{ from: string; to: string }> = [];

    switch (topo.type) {
      case 'pair':
        if (nodes.length >= 2) {
          edges = [
            { from: nodes[0].id, to: nodes[1].id },
            { from: nodes[1].id, to: nodes[0].id },
          ];
        }
        break;

      case 'pipeline': {
        const order = topo.pipelineOrder || nodes.map((n) => n.id);
        for (let i = 0; i < order.length; i++) {
          edges.push({ from: order[i], to: order[(i + 1) % order.length] });
        }
        break;
      }

      case 'star': {
        const hubId = topo.hubNodeId || nodes[0]?.id;
        for (const n of nodes) {
          if (n.id !== hubId) {
            edges.push({ from: hubId, to: n.id });
            edges.push({ from: n.id, to: hubId });
          }
        }
        break;
      }

      case 'mesh':
        for (const a of nodes) {
          for (const b of nodes) {
            if (a.id !== b.id) {
              edges.push({ from: a.id, to: b.id });
            }
          }
        }
        break;

      case 'custom':
        edges = topo.edges || [];
        break;
    }

    for (const edge of edges) {
      const targets = this.routes.get(edge.from);
      if (targets && !targets.includes(edge.to)) {
        targets.push(edge.to);
      }
    }
  }

  private getStarterNodeIds(): string[] {
    const topo = this.config.topology;
    switch (topo.type) {
      case 'pair':
        return [topo.nodes[0]?.id].filter(Boolean);
      case 'pipeline':
        return [topo.pipelineOrder?.[0] || topo.nodes[0]?.id].filter(Boolean);
      case 'star':
        return [topo.hubNodeId || topo.nodes[0]?.id].filter(Boolean);
      case 'mesh':
        return topo.nodes.map((n) => n.id);
      default:
        return [topo.nodes[0]?.id].filter(Boolean);
    }
  }

  // ─── Lifecycle ───────────────────────────────────────────

  private finish(taskCompleted: boolean, finalOutput: string): void {
    if (this._status === 'running' || this._status === 'max_turns_reached') {
      this._status = taskCompleted ? 'completed' : this._status === 'max_turns_reached' ? 'max_turns_reached' : 'failed';
    }

    const result = this.buildResult(taskCompleted, finalOutput);

    // Write summary
    if (this.feed) {
      this.feed.writeSummary({
        runId: this._runId,
        status: result.status,
        totalTurns: result.totalTurns,
        taskCompleted: result.taskCompleted,
        duration: result.duration,
        topology: this.config.topology.type,
        nodes: result.nodes.map((n) => n.id),
        task: this.config.task,
      });
    }

    // Run onNodeComplete hooks
    for (const [nodeId, runner] of this.hookRunners) {
      void runner.run('onNodeComplete', { turn: this._turn });
    }

    this.cleanup();
    this.emitProgress();

    if (this.resolveRun) {
      this.resolveRun(result);
      this.resolveRun = null;
    }
  }

  private cleanup(): void {
    if (this.feed) {
      this.feed.stop();
    }
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  private buildResult(taskCompleted: boolean, finalOutput: string): MultiAgentResult {
    return {
      status: this._status,
      totalTurns: this._turn,
      taskCompleted,
      turns: this._turns,
      duration: Date.now() - this._startedAt,
      nodes: [...this._nodeInfo] as MultiAgentResult['nodes'],
      finalOutput,
      relayDir: this.feed?.getRootDir(),
    };
  }

  private emitProgress(): void {
    this.onStatus?.(this.progress);
  }
}
