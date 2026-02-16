/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Research Team Module
 *
 * Independent agents that run in the background and communicate
 * through events (broadcasts) and commands (directed messages).
 * All activity flows into a unified feed for observability.
 *
 * Key differences from Team Control:
 * - Agents run concurrently, not sequentially
 * - No built-in validation loop — agents collaborate freely
 * - Communication via events/commands, not fixed prompts
 * - Feed provides full observability of all activity
 */

export type { FeedEntry, FeedEntryKind, ResearchAgent, ResearchAgentConfig, ResearchAgentRole, ResearchAgentStatus, ResearchCommand, ResearchCommandType, ResearchEvent, ResearchEventType, ResearchSession, ResearchSessionConfig, ResearchSessionStatus } from './types';

export { researchEventBus } from './ResearchEventBus';
export { ResearchAgentRunner } from './ResearchAgentRunner';
export { researchTeamManager } from './ResearchTeamManager';
export { feedStore } from './FeedStore';
