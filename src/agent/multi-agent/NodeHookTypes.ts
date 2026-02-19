/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Node Hooks — Per-agent hook system for multi-agent orchestration.
 *
 * Each node in a multi-agent topology can have its own hooks directory.
 * Hooks receive multi-agent context (feed, relay, turn info) and can:
 *   - Queue messages into the agent's own AcpMessageQueue
 *   - Publish messages onto the bus for routing to other agents
 *   - Signal completion of the orchestration
 *   - Transform incoming/outgoing content
 *   - Read/write files in the workspace and relay directory
 *
 * Hook files are plain `.js` modules, same format as assistant hooks:
 *
 *   module.exports = {
 *     onNodeResponse: {
 *       handler: async (ctx) => {
 *         // ctx has multi-agent context: nodeId, role, turn, relayDir, ...
 *         const prd = JSON.parse(await ctx.utils.readFile(ctx.utils.join(ctx.relayDir, 'prd.json')));
 *         return {
 *           queueMessages: [{ content: '/implement next-story' }],
 *         };
 *       },
 *       priority: 50,
 *     },
 *   };
 */

import type { AgentRole } from './types';

// ─── Hook Events ─────────────────────────────────────────────

/**
 * Events that fire during a node's lifecycle in a multi-agent run.
 */
export type NodeHookEvent =
  /** After node is created and attached, before initial prompt */
  | 'onNodeInit'
  /** After the agent finishes a turn and content is published to the bus */
  | 'onNodeResponse'
  /** When a message arrives from the bus, before enqueuing to the agent */
  | 'onNodeReceive'
  /** When the orchestration completes (for this node) */
  | 'onNodeComplete';

// ─── Hook Context ────────────────────────────────────────────

/**
 * Context passed to every node hook.
 */
export type NodeHookContext = {
  event: NodeHookEvent;
  /** This node's ID */
  nodeId: string;
  /** This node's role */
  role: AgentRole;
  /** Current orchestration turn */
  turn: number;
  /** Maximum turns allowed */
  maxTurns: number;
  /** Topology type (pair, pipeline, star, mesh, custom) */
  topologyType: string;
  /** Shared workspace directory */
  workspace: string;
  /** Path to the file relay directory for this run */
  relayDir: string;
  /** Path to feed.jsonl */
  feedPath: string;
  /** Path to this node's inbox directory */
  inboxDir: string;
  /** Path to this node's outbox directory */
  outboxDir: string;
  /** Content: agent response (onNodeResponse) or bus message (onNodeReceive) */
  content?: string;
  /** Who sent the message (onNodeReceive) */
  from?: string;
  /** File and path utility functions */
  utils: NodeHookUtils;
};

/**
 * Utility functions available to node hooks.
 * Simplified subset — no skill operations needed for multi-agent.
 */
export type NodeHookUtils = {
  readFile: (filePath: string, encoding?: BufferEncoding) => Promise<string>;
  writeFile: (filePath: string, content: string, encoding?: BufferEncoding) => Promise<void>;
  exists: (filePath: string) => Promise<boolean>;
  ensureDir: (dirPath: string) => Promise<void>;
  join: (...paths: string[]) => string;
  /** Read and parse feed.jsonl entries */
  readFeed: () => Promise<Array<Record<string, unknown>>>;
};

// ─── Hook Result ─────────────────────────────────────────────

/**
 * What a node hook returns.
 */
export type NodeHookResult = {
  /** Messages to enqueue into this agent's own queue */
  queueMessages?: Array<{
    content: string;
    files?: string[];
    priority?: 'normal' | 'high';
  }>;
  /** Messages to publish onto the bus for routing to other agents */
  busMessages?: Array<{
    /** Target node ID */
    to: string;
    /** Message content */
    content: string;
  }>;
  /** Transform the content (onNodeReceive: modify before enqueuing) */
  content?: string;
  /** Signal orchestration completion */
  complete?: boolean;
  /** Block the operation (onNodeReceive: don't deliver to this agent) */
  blocked?: boolean;
};

// ─── Hook Handler ────────────────────────────────────────────

export type NodeHookHandler = (context: NodeHookContext) => NodeHookResult | Promise<NodeHookResult>;

export type NodeHookConfig = {
  handler: NodeHookHandler;
  priority?: number;
  enabled?: boolean;
};

/**
 * What a node hook module file exports.
 */
export type NodeHookModule = {
  onNodeInit?: NodeHookConfig | NodeHookHandler;
  onNodeResponse?: NodeHookConfig | NodeHookHandler;
  onNodeReceive?: NodeHookConfig | NodeHookHandler;
  onNodeComplete?: NodeHookConfig | NodeHookHandler;
  [key: string]: NodeHookConfig | NodeHookHandler | undefined;
};

/**
 * Internal normalized hook ready for execution.
 */
export type NormalizedNodeHook = {
  event: NodeHookEvent;
  handler: NodeHookHandler;
  priority: number;
  enabled: boolean;
  moduleName: string;
};
