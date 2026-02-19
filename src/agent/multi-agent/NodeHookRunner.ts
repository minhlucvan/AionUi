/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * NodeHookRunner — Loads and executes per-node hooks for multi-agent.
 *
 * Follows the same patterns as the existing hook system
 * (ModuleLoader + HookExecutor) but scoped to multi-agent node events.
 *
 * Hook files live in a `hooks/` directory specified per-node:
 *   - Via AgentNodeConfig.nodeHooksPath
 *   - Falls back to {workspace}/.multi-agent/hooks/{nodeId}/
 *
 * Usage:
 *   const runner = new NodeHookRunner('/path/to/hooks');
 *   const result = await runner.run('onNodeResponse', context);
 *   // result.queueMessages  → enqueue into this agent
 *   // result.busMessages    → publish to bus for other agents
 *   // result.complete       → signal orchestration done
 */

import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
import type { NodeHookEvent, NodeHookContext, NodeHookResult, NodeHookConfig, NodeHookHandler, NodeHookModule, NodeHookUtils, NormalizedNodeHook } from './NodeHookTypes';
import type { AgentRole } from './types';

const nodeRequire = createRequire(__filename);

// ─── Module Loading ──────────────────────────────────────────

function normalizeConfig(config: NodeHookConfig | NodeHookHandler): Required<NodeHookConfig> {
  if (typeof config === 'function') {
    return { handler: config, priority: 50, enabled: true };
  }
  return {
    handler: config.handler,
    priority: config.priority ?? 50,
    enabled: config.enabled ?? true,
  };
}

function parseModule(moduleExports: NodeHookModule, moduleName: string): NormalizedNodeHook[] {
  const hooks: NormalizedNodeHook[] = [];

  for (const [eventName, hookConfig] of Object.entries(moduleExports)) {
    if (!hookConfig) continue;
    const config = normalizeConfig(hookConfig);
    hooks.push({
      event: eventName as NodeHookEvent,
      handler: config.handler,
      priority: config.priority,
      enabled: config.enabled,
      moduleName,
    });
  }

  return hooks;
}

function loadNodeHookModules(hooksDir: string): NormalizedNodeHook[] {
  if (!fs.existsSync(hooksDir)) {
    return [];
  }

  const allHooks: NormalizedNodeHook[] = [];
  const files = fs.readdirSync(hooksDir).filter((f) => f.endsWith('.js'));

  for (const fileName of files) {
    const modulePath = path.join(hooksDir, fileName);
    try {
      delete nodeRequire.cache[modulePath];
      const moduleExports: NodeHookModule = nodeRequire(modulePath);

      if (typeof moduleExports === 'object' && moduleExports !== null) {
        allHooks.push(...parseModule(moduleExports, fileName));
      } else {
        console.warn(`[NodeHooks] Invalid module format: ${fileName}`);
      }
    } catch (error) {
      console.error(`[NodeHooks] Failed to load ${fileName}:`, error);
    }
  }

  return allHooks;
}

// ─── Hook Execution ──────────────────────────────────────────

async function executeNodeHooks(event: NodeHookEvent, context: NodeHookContext, hooks: NormalizedNodeHook[]): Promise<NodeHookResult> {
  const applicable = hooks
    .filter((h) => h.event === event && h.enabled)
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.moduleName.localeCompare(b.moduleName);
    });

  let result: NodeHookResult = { content: context.content };

  for (const hook of applicable) {
    if (result.blocked) break;

    try {
      const output = await Promise.resolve(
        hook.handler({
          ...context,
          event,
          content: result.content ?? context.content,
        })
      );

      if (output) {
        // Accumulate queue and bus messages across all hooks
        const mergedQueue = [...(result.queueMessages || []), ...(output.queueMessages || [])];
        const mergedBus = [...(result.busMessages || []), ...(output.busMessages || [])];

        result = {
          content: output.content ?? result.content,
          blocked: output.blocked ?? result.blocked,
          complete: output.complete ?? result.complete,
          queueMessages: mergedQueue.length > 0 ? mergedQueue : undefined,
          busMessages: mergedBus.length > 0 ? mergedBus : undefined,
        };
      }
    } catch (error) {
      console.warn(`[NodeHooks] ${hook.moduleName}.${hook.event} failed:`, error);
    }
  }

  return result;
}

// ─── Utilities ───────────────────────────────────────────────

function createNodeHookUtils(feedPath: string): NodeHookUtils {
  return {
    readFile: async (filePath, encoding = 'utf-8') => {
      return fs.promises.readFile(filePath, encoding);
    },
    writeFile: async (filePath, content, encoding = 'utf-8') => {
      await fs.promises.writeFile(filePath, content, encoding);
    },
    exists: async (filePath) => {
      try {
        await fs.promises.access(filePath);
        return true;
      } catch {
        return false;
      }
    },
    ensureDir: async (dirPath) => {
      await fs.promises.mkdir(dirPath, { recursive: true });
    },
    join: (...paths) => path.join(...paths),
    readFeed: async () => {
      try {
        const raw = await fs.promises.readFile(feedPath, 'utf-8');
        if (!raw.trim()) return [];
        return raw
          .trim()
          .split('\n')
          .map((line) => JSON.parse(line));
      } catch {
        return [];
      }
    },
  };
}

// ─── Public API ──────────────────────────────────────────────

export type NodeHookRunnerConfig = {
  hooksPath: string;
  nodeId: string;
  role: AgentRole;
  workspace: string;
  relayDir: string;
  topologyType: string;
  maxTurns: number;
};

export class NodeHookRunner {
  private hooks: NormalizedNodeHook[];
  private config: NodeHookRunnerConfig;
  private utils: NodeHookUtils;

  constructor(config: NodeHookRunnerConfig) {
    this.config = config;
    this.hooks = loadNodeHookModules(config.hooksPath);
    const feedPath = path.join(config.relayDir, 'feed.jsonl');
    this.utils = createNodeHookUtils(feedPath);
  }

  /**
   * Whether any hooks were loaded.
   */
  hasHooks(): boolean {
    return this.hooks.length > 0;
  }

  /**
   * Run hooks for the given event.
   */
  async run(event: NodeHookEvent, extra?: Partial<NodeHookContext>): Promise<NodeHookResult> {
    if (this.hooks.length === 0) return {};

    const context: NodeHookContext = {
      event,
      nodeId: this.config.nodeId,
      role: this.config.role,
      turn: 0,
      maxTurns: this.config.maxTurns,
      topologyType: this.config.topologyType,
      workspace: this.config.workspace,
      relayDir: this.config.relayDir,
      feedPath: path.join(this.config.relayDir, 'feed.jsonl'),
      inboxDir: path.join(this.config.relayDir, this.config.nodeId, 'inbox'),
      outboxDir: path.join(this.config.relayDir, this.config.nodeId, 'outbox'),
      utils: this.utils,
      ...extra,
    };

    return executeNodeHooks(event, context, this.hooks);
  }
}
