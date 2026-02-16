/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Research Team Module — Kanban-style multi-agent collaboration.
 *
 * Agents run concurrently and coordinate through:
 * - A shared board file (.team/board.md) for status and artifacts index
 * - Artifact files (.team/artifacts/) for substantive content sharing
 * - 3 team tools: board_update, board_read, notify
 *
 * All activity flows into a unified feed for observability.
 */

export type { FeedEntry, FeedEntryKind, ResearchAgent, ResearchAgentConfig, ResearchAgentRole, ResearchAgentStatus, ResearchCommand, ResearchCommandType, ResearchEvent, ResearchEventType, ResearchSession, ResearchSessionConfig, ResearchSessionStatus } from './types';

export type { TeamToolCall, TeamToolResult, TeamToolName } from './TeamToolDefinitions';

export { researchEventBus } from './ResearchEventBus';
export { ResearchAgentRunner } from './ResearchAgentRunner';
export { researchTeamManager } from './ResearchTeamManager';
export { feedStore } from './FeedStore';
export { BoardManager } from './BoardManager';
export { TEAM_TOOLS, buildTeamToolsPrompt, parseBoardUpdateContent } from './TeamToolDefinitions';
export { StreamingToolParser, parseToolCalls } from './TeamToolParser';
export { TeamToolExecutor } from './TeamToolExecutor';
