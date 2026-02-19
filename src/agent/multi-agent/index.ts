/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

// Types
export type { BusMessage, BusEventType, BusEvent, AgentRole, AgentNodeConfig, TopologyType, RoutingEdge, TopologyConfig, MultiAgentConfig, MultiAgentStatus, MultiAgentTurn, MultiAgentProgress, MultiAgentResult } from './types';
export { MULTI_AGENT_DEFAULTS, MULTI_AGENT_COMPLETION_SIGNAL } from './types';

// Core
export { AgentBus } from './AgentBus';
export type { BusListener } from './AgentBus';
export { AgentNode } from './AgentNode';
export type { NodeHookCallback } from './AgentNode';
export { BusLogger } from './BusLogger';
export type { LogEventKind, LogEntry } from './BusLogger';
export { FileRelay } from './FileRelay';
export type { FeedEntry } from './FileRelay';
export { NodeHookRunner } from './NodeHookRunner';
export type { NodeHookRunnerConfig } from './NodeHookRunner';
export type { NodeHookEvent, NodeHookContext, NodeHookResult, NodeHookHandler, NodeHookConfig, NodeHookModule, NodeHookUtils, NormalizedNodeHook } from './NodeHookTypes';
export { TopologyRouter } from './TopologyRouter';
export { MultiAgentOrchestrator } from './MultiAgentOrchestrator';
export type { CreateNodeSessionFn, MultiAgentStatusCallback } from './MultiAgentOrchestrator';

// Simplified session (hooks-driven)
export { MultiAgentSession } from './MultiAgentSession';
export type { CreateSessionFn, StatusCallback } from './MultiAgentSession';

// Prompt builder
export { buildNodeInitialPrompt } from './PromptBuilder';

// Topology factories
export { createPairTopology, createReviewPipelineTopology, createStarTopology, createDebateTopology, createCustomTopology } from './topologies';
