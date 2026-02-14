/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Agent Team Definition Types
 *
 * These types define the team structure in assistant.json / assistant presets.
 * At runtime, team assistants use Claude's native agent teams feature
 * (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS env var) — AionUi creates a single
 * ACP conversation with the team prompt and lets Claude handle spawning,
 * messaging, and task coordination internally.
 *
 * Member agent definitions can live in two places:
 * - {assistantPath}/agents/{id}.md  — Claude Code subagent .md files (preferred)
 * - teamMembers[].systemPrompt      — inline in assistant.json (fallback)
 *
 * When agents/ folder has a .md file for a member, the systemPrompt field
 * is optional — the file IS the agent definition.
 */

/**
 * Role of an agent team member
 */
export type AgentTeamMemberRole = 'lead' | 'member';

/**
 * Agent team member definition (stored in assistant.json / preset)
 *
 * For members: systemPrompt is optional when an agents/{id}.md file exists.
 * For lead: systemPrompt is used in the team prompt sent to Claude.
 */
export type IAgentTeamMemberDefinition = {
  id: string;
  name: string;
  role: AgentTeamMemberRole;
  /** Optional when agents/{id}.md file exists in the assistant directory */
  systemPrompt?: string;
  model?: string;
  skills?: string[];
};
