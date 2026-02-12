/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Team Monitor Types
 *
 * Shared types for monitoring Claude's native agent teams.
 * Teams are enabled via CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 env var.
 * Team state is stored in ~/.claude/teams/ and ~/.claude/tasks/.
 */

/** Task state in the shared task list */
export type TeamTaskState = 'pending' | 'in_progress' | 'completed';

/** A task in the agent team task list */
export type TeamTask = {
  id: string;
  subject: string;
  description?: string;
  state: TeamTaskState;
  assignee?: string;
  dependencies?: string[];
};

/** A team member discovered from config */
export type TeamMember = {
  name: string;
  agentId?: string;
  agentType?: string;
  role?: 'lead' | 'member';
  status: 'idle' | 'active' | 'finished';
  currentTask?: string;
};

/** Full team state */
export type TeamState = {
  teamName: string;
  members: TeamMember[];
  tasks: TeamTask[];
};

/** Subagent transcript entry (simplified) */
export type TranscriptEntry = {
  role: 'user' | 'assistant';
  timestamp?: number;
  text: string;
  toolName?: string;
  toolInput?: string;
};

/** Agent output from transcript reading */
export type AgentOutput = {
  agentName: string;
  entries: TranscriptEntry[];
  lastActivity?: number;
};

/** Events emitted by TeamMonitorService */
export type TeamMonitorEvent =
  | { type: 'team_config'; data: { teamName: string; members: TeamMember[] } }
  | { type: 'task_update'; data: { teamName: string; tasks: TeamTask[] } }
  | { type: 'agent_output'; data: AgentOutput };

/** Parameters for starting team monitoring */
export type TeamMonitorStartParams = {
  conversationId: string;
  teamName?: string;
};
