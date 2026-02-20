/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { SwarmFeedManager } from './SwarmFeedManager';
import { SwarmMessageQueue } from './SwarmMessageQueue';
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
  mq: SwarmMessageQueue;
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
  const locale = process.env.LANG?.split('.')[0]?.replace('_', '-') || 'en-US';
  const localePath = path.join(agentDir, `${role}.${locale}.md`);
  if (fs.existsSync(localePath)) {
    const content = fs.readFileSync(localePath, 'utf-8');
    console.log(`[readPromptMd] Reading from locale path: ${localePath}`);
    console.log(`[readPromptMd] First 300 chars: ${content.substring(0, 300)}`);
    return content;
  }
  const defaultPath = path.join(agentDir, `${role}.md`);
  if (fs.existsSync(defaultPath)) {
    const content = fs.readFileSync(defaultPath, 'utf-8');
    console.log(`[readPromptMd] Reading from default path: ${defaultPath}`);
    console.log(`[readPromptMd] First 300 chars: ${content.substring(0, 300)}`);
    return content;
  }
  console.log(`[readPromptMd] No prompt file found for ${role} in ${agentDir}`);
  return '';
}

/**
 * Thin orchestrator that spawns each swarm agent as a regular AionUi conversation
 * via the existing ConversationService → createAcpAgent → AcpAgentManager pipeline.
 *
 * Source of truth: all state lives in .swarm/ files
 *   .swarm/feed.jsonl       — shared message bus between agents
 *   .swarm/{role}-mq.jsonl  — per-agent message queue with status tracking
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
  private initialized = false;

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

  get isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Initialize: spawn each agent as a regular conversation via existing pipeline.
   */
  async init(userMessage: string): Promise<void> {
    if (this.initialized) {
      console.warn('[SwarmSessionManager] Already initialized, skipping');
      return;
    }

    this.feedManager.init();
    this.running = true;

    for (const agentName of this.config.agents) {
      const agentDir = path.join(this.assistantDir, 'swarm', agentName);
      const agentConfig: SwarmAgentConfig = readJson(path.join(agentDir, 'agent.json'));
      const resolvedBackend = agentConfig.presetAgentType || this.defaultBackend;
      const systemPrompt = readPromptMd(agentDir, agentConfig.role);

      // Detailed logging to verify prompt content
      console.log(`[SwarmSessionManager] ===== LOADING SYSTEM PROMPT FOR ${agentConfig.role} =====`);
      console.log(`[SwarmSessionManager] Prompt file path: ${path.join(agentDir, agentConfig.role + '.md')}`);
      console.log(`[SwarmSessionManager] Total length: ${systemPrompt.length} characters`);
      console.log(`[SwarmSessionManager] First 300 chars: ${systemPrompt.substring(0, 300)}`);

      // Verify critical sections exist
      const hasCriticalRequirement = systemPrompt.includes('CRITICAL REQUIREMENT');
      const hasDirectiveTag = systemPrompt.includes('<directive>');
      const hasPlanTag = systemPrompt.includes('<plan>');
      const hasReportTag = systemPrompt.includes('<report>');

      console.log(`[SwarmSessionManager] Validation:`);
      console.log(`[SwarmSessionManager]   - Has CRITICAL REQUIREMENT section: ${hasCriticalRequirement}`);
      console.log(`[SwarmSessionManager]   - Has <directive> tag docs: ${hasDirectiveTag}`);
      console.log(`[SwarmSessionManager]   - Has <plan> tag docs: ${hasPlanTag}`);
      console.log(`[SwarmSessionManager]   - Has <report> tag docs: ${hasReportTag}`);

      if (!hasCriticalRequirement) {
        console.error(`[SwarmSessionManager] ⚠️  WARNING: Missing CRITICAL REQUIREMENT section for ${agentConfig.role}!`);
      }
      console.log(`[SwarmSessionManager] ===== END SYSTEM PROMPT VALIDATION =====\n`);

      const hooksPath = path.join(agentDir, 'hooks');

      // Create persistent message queue for this agent
      const mq = new SwarmMessageQueue(this.workspace, agentConfig.role);
      mq.init();

      // Reuse existing pipeline: spawn as a regular ACP conversation
      // NOTE: Do NOT pass presetAssistantId here because that would cause
      // ConversationService to detect this as a swarm and create another swarm instead of ACP.
      // Instead, we use presetContext to provide the agent's system prompt.
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

      console.log(`[SwarmSessionManager] Created agent conversation ${result.conversation.id} for role ${agentConfig.role}`);
      const manager = WorkerManage.getTaskById(result.conversation.id) as AcpAgentManager;
      console.log(`[SwarmSessionManager] Got manager for ${agentConfig.role}:`, !!manager);

      if (!manager) {
        throw new Error(`Failed to get task manager for swarm agent "${agentConfig.role}" (conversation ${result.conversation.id})`);
      }

      this.agents.set(agentConfig.role, {
        role: agentConfig.role,
        config: agentConfig,
        backend: resolvedBackend,
        conversationId: result.conversation.id,
        manager,
        mq,
        hooksPath,
        systemPromptPath: path.join(agentDir, `${agentConfig.role}.md`),
      });
    }

    // Fire onSwarmInit for each agent → hook returns queueMessages → persist to MQ → deliver
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
          this.enqueueAndDeliver(handle, msg);
        }
      }
    }

    // Start the first agent's turn
    const firstRole = this.turnController.next();
    await this.startTurn(firstRole);

    this.initialized = true;
    console.log(`[SwarmSessionManager] Swarm initialized for ${this.parentConversationId}`);
  }

  /** Called when an agent finishes its turn */
  async onAgentFinished(role: string, output: string): Promise<void> {
    if (!this.running) return;

    const handle = this.agents.get(role)!;

    // Mark all delivered MQ entries as processed for this agent
    for (const entry of handle.mq.getRecoverable()) {
      handle.mq.markProcessed(entry.id);
    }

    // 1. Fire onSwarmTurnEnd — hook parses output, writes to feed
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

    // 4. Read new feed entries for the next agent, mark as delivered
    const newEntries = this.feedManager.readNewFor(nextRole);
    this.feedManager.markDelivered(newEntries);

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

    // 6. Persist to MQ then deliver
    if (feedResult.queueMessages?.length) {
      for (const msg of feedResult.queueMessages) {
        this.enqueueAndDeliver(nextHandle, msg);
      }
    }

    await this.startTurn(nextRole);
  }

  /**
   * Persist a message to the agent's MQ file, then deliver to the agent process.
   * MQ file is the source of truth — if delivery fails, the message stays pending.
   */
  private enqueueAndDeliver(handle: SwarmAgentHandle, msg: { content: string; files?: string[] }): void {
    const entry = handle.mq.enqueue({
      content: msg.content,
      source: 'hook',
      files: msg.files,
    });

    try {
      void handle.manager.sendMessage({ content: msg.content, files: msg.files });
      handle.mq.markDelivered(entry.id);
    } catch (err) {
      console.error(`[SwarmSessionManager] Failed to deliver message to ${handle.role}:`, err);
      handle.mq.markError(entry.id);
    }
  }

  /** Route a feed entry to the target agent's message queue */
  routeToAgent(entry: SwarmFeedEntry): void {
    const handle = this.agents.get(entry.to);
    if (handle) {
      this.enqueueAndDeliver(handle, { content: entry.content, files: entry.files });
      this.feedManager.markProcessed(entry.id);
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
