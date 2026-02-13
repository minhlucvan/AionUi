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
 */

/**
 * Role of an agent team member
 */
export type AgentTeamMemberRole = 'lead' | 'member';

/**
 * Agent team member definition (stored in assistant.json / preset)
 */
export type IAgentTeamMemberDefinition = {
  id: string;
  name: string;
  role: AgentTeamMemberRole;
  systemPrompt: string;
  model?: string;
  skills?: string[];
};
