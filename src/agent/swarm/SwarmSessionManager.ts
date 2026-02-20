/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { SwarmFeedManager } from './SwarmFeedManager';
import { SwarmTurnController } from './SwarmTurnController';
import { runSwarmHooks } from './SwarmHookRunner';
import type { SwarmConfig, SwarmAgentConfig, SwarmFeedEntry } from './types';
import type AcpAgentManager from '@/process/task/AcpAgentManager';
import { ConversationService } from '@/process/services/conversationService';
import WorkerManage from '@/process/WorkerManage';

type SwarmAgentHandle = {
  role: string;
  config: SwarmAgentConfig;
  backend: string;
  conversationId: string;
  manager: AcpAgentManager;
  hooksPath: string;
  systemPromptPath: string;
};

/**
 * Read a JSON file and parse it.
 */
function readJson<T = any>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * Read the system prompt .md file for an agent role.
 * Supports i18n: {role}.{locale}.md → {role}.md fallback.
 */
function readPromptMd(agentDir: string, role: string): string {
  // Try locale-specific first
  const locale = process.env.LANG?.split('.')[0]?.replace('_', '-') || 'en-US';
  const localePath = path.join(agentDir, `${role}.${locale}.md`);
  if (fs.existsSync(localePath)) {
    return fs.readFileSync(localePath, 'utf-8');
  }
  // Fallback to default
  const defaultPath = path.join(agentDir, `${role}.md`);
  if (fs.existsSync(defaultPath)) {
    return fs.readFileSync(defaultPath, 'utf-8');
  }
  return '';
}

/**
 * Thin orchestrator that spawns each swarm agent as a regular AionUi conversation
 * via the existing ConversationService → createAcpAgent → AcpAgentManager pipeline.
 */
export class SwarmSessionManager {
  private feedManager: SwarmFeedManager;
  private turnController: SwarmTurnController;
  private agents: Map<string, SwarmAgentHandle> = new Map();
  private config: SwarmConfig;
  private parentConversationId: string;
  private defaultBackend: string;
  private workspace: string;
  private assistantId: string;
  private assistantDir: string;
  private running: boolean = false;

  constructor(config: SwarmConfig, parentConversationId: string, workspace: string, defaultBackend: string, assistantId: string, assistantDir: string) {
    this.config = config;
    this.parentConversationId = parentConversationId;
    this.workspace = workspace;
    this.defaultBackend = defaultBackend;
    this.assistantId = assistantId;
    this.assistantDir = assistantDir;
    this.feedManager = new SwarmFeedManager(workspace, config.feedPath);
    this.turnController = new SwarmTurnController(config.turnStrategy, config.agents, config.maxTurns);
  }

  /**
   * Initialize: spawn each agent as a regular conversation via existing pipeline.
   */
  async init(userMessage: string): Promise<void> {
    this.feedManager.init();
    this.running = true;

    for (const agentName of this.config.agents) {
      const agentDir = path.join(this.assistantDir, 'swarm', agentName);
      const agentConfig: SwarmAgentConfig = readJson(path.join(agentDir, 'agent.json'));
      const resolvedBackend = agentConfig.presetAgentType || this.defaultBackend;
      const systemPrompt = readPromptMd(agentDir, agentConfig.role);
      const hooksPath = path.join(agentDir, 'hooks');

      // Reuse existing pipeline: spawn as a regular conversation
      const result = await ConversationService.createConversation({
        type: 'acp',
        model: {
          id: resolvedBackend,
          platform: resolvedBackend,
          name: resolvedBackend,
          baseUrl: '',
          apiKey: '',
          useModel: '',
        },
        extra: {
          workspace: this.workspace,
          backend: resolvedBackend as any,
          presetAssistantId: this.assistantId,
          presetContext: systemPrompt,
          enabledSkills: agentConfig.defaultEnabledSkills || [],
          agentName: agentConfig.name,
        },
        name: `${this.assistantId}/${agentConfig.role}`,
        source: 'aionui' as any,
      });

      if (!result.success || !result.conversation) {
        throw new Error(`Failed to spawn swarm agent "${agentConfig.role}": ${result.error}`);
      }

      const manager = WorkerManage.getTaskById(result.conversation.id) as AcpAgentManager;

      this.agents.set(agentConfig.role, {
        role: agentConfig.role,
        config: agentConfig,
        backend: resolvedBackend,
        conversationId: result.conversation.id,
        manager,
        hooksPath,
        systemPromptPath: path.join(agentDir, `${agentConfig.role}.md`),
      });
    }

    // Fire onSwarmInit for each agent → collects seed queueMessages
    for (const [role, handle] of this.agents) {
      const result = await runSwarmHooks('onSwarmInit', {
        role,
        agentConfig: handle.config,
        feedManager: this.feedManager,
        turnNumber: 0,
        maxTurns: this.config.maxTurns,
        turnStrategy: this.config.turnStrategy,
        peers: this.getPeers(role),
        workspace: this.workspace,
        assistantHooksPath: handle.hooksPath,
        content: userMessage,
      });

      if (result.queueMessages?.length) {
        for (const msg of result.queueMessages) {
          await handle.manager.sendMessage({ content: msg.content, files: msg.files });
        }
      }
    }

    // Start the first agent's turn
    const firstRole = this.turnController.next();
    await this.startTurn(firstRole);
  }

  /** Called when an agent finishes its turn */
  async onAgentFinished(role: string, output: string): Promise<void> {
    if (!this.running) return;

    const handle = this.agents.get(role)!;

    // 1. Fire onSwarmTurnEnd — hook writes to feed, detects done
    const turnEndResult = await runSwarmHooks('onSwarmTurnEnd', {
      role,
      agentConfig: handle.config,
      feedManager: this.feedManager,
      turnNumber: this.turnController.getTurnCount(),
      maxTurns: this.config.maxTurns,
      turnStrategy: this.config.turnStrategy,
      peers: this.getPeers(role),
      workspace: this.workspace,
      assistantHooksPath: handle.hooksPath,
      agentOutput: output,
    });

    // 2. Check termination
    if (turnEndResult.done || this.feedManager.isDone() || this.turnController.isExhausted()) {
      this.terminate();
      return;
    }

    // 3. Determine next agent
    const nextRole = turnEndResult.nextAgent || this.turnController.next();
    const nextHandle = this.agents.get(nextRole)!;

    // 4. Read new feed entries for the next agent
    const newEntries = this.feedManager.readNewFor(nextRole);

    // 5. Fire onSwarmFeedMessage for the next agent
    const feedResult = await runSwarmHooks('onSwarmFeedMessage', {
      role: nextRole,
      agentConfig: nextHandle.config,
      feedManager: this.feedManager,
      turnNumber: this.turnController.getTurnCount(),
      maxTurns: this.config.maxTurns,
      turnStrategy: this.config.turnStrategy,
      peers: this.getPeers(nextRole),
      workspace: this.workspace,
      assistantHooksPath: nextHandle.hooksPath,
      feedEntries: newEntries,
    });

    // 6. Enqueue messages into the agent's existing message queue
    if (feedResult.queueMessages?.length) {
      for (const msg of feedResult.queueMessages) {
        await nextHandle.manager.sendMessage({ content: msg.content, files: msg.files });
      }
    }

    await this.startTurn(nextRole);
  }

  /** Route a feed entry to the target agent's message queue */
  routeToAgent(entry: SwarmFeedEntry): void {
    const handle = this.agents.get(entry.to);
    if (handle) {
      void handle.manager.sendMessage({ content: entry.content, files: entry.files });
    }
  }

  private async startTurn(role: string): Promise<void> {
    const handle = this.agents.get(role)!;

    await runSwarmHooks('onSwarmTurnStart', {
      role,
      agentConfig: handle.config,
      feedManager: this.feedManager,
      turnNumber: this.turnController.getTurnCount(),
      maxTurns: this.config.maxTurns,
      turnStrategy: this.config.turnStrategy,
      peers: this.getPeers(role),
      workspace: this.workspace,
      assistantHooksPath: handle.hooksPath,
    });
  }

  private getPeers(role: string): string[] {
    return [...this.agents.keys()].filter((r) => r !== role);
  }

  /** Pause all agents */
  pause(): void {
    this.running = false;
  }

  /** Resume all agents */
  resume(): void {
    this.running = true;
  }

  /** Terminate the swarm session */
  terminate(): void {
    this.running = false;
    for (const handle of this.agents.values()) {
      handle.manager.kill();
    }
    console.log(`[SwarmSessionManager] Swarm terminated for parent conversation ${this.parentConversationId}`);
  }

  /** Check if the task is complete */
  isDone(): boolean {
    return this.feedManager.isDone() || this.turnController.isExhausted();
  }

  /** Get the parent conversation ID */
  getParentConversationId(): string {
    return this.parentConversationId;
  }

  /** Get agent handles (for UI integration) */
  getAgents(): Map<string, SwarmAgentHandle> {
    return this.agents;
  }
}
