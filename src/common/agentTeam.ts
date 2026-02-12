/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AcpBackend } from '@/types/acpTypes';

// ==================== Agent Team Definition Types ====================

/**
 * Role of an agent team member
 */
export type AgentTeamMemberRole = 'lead' | 'member';

/**
 * Agent team member definition (stored in agent team definition)
 */
export type IAgentTeamMemberDefinition = {
  id: string;
  name: string;
  role: AgentTeamMemberRole;
  systemPrompt: string;
  backend?: AcpBackend;
  model?: string;
  presetAssistantId?: string;
  skills?: string[];
};

/**
 * Agent team definition (reusable template)
 * Used at runtime when creating agent team sessions from assistant presets.
 */
export type IAgentTeamDefinition = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  members: IAgentTeamMemberDefinition[];
  defaultWorkspace?: string;
  createdAt: number;
  updatedAt: number;
};

// ==================== Agent Team Session Types (Runtime) ====================

/**
 * Agent team session status
 */
export type AgentTeamSessionStatus = 'active' | 'completed' | 'cancelled';

/**
 * Runtime agent team session (active agent team instance)
 */
export type IAgentTeamSession = {
  id: string;
  agentTeamDefinitionId: string;
  name: string;
  workspace: string;
  /** Map of member definition ID -> conversation ID */
  memberConversations: Record<string, string>;
  status: AgentTeamSessionStatus;
  createdAt: number;
  updatedAt: number;
};

// ==================== Agent Team Message Types ====================

/**
 * A cross-member message routed by the agent team system
 */
export type IAgentTeamMessage = {
  id: string;
  sessionId: string;
  fromMemberId: string;
  toMemberId?: string; // undefined = broadcast
  content: string;
  timestamp: number;
};

// ==================== Database Row Types ====================

/**
 * Agent team session stored in database (serialized format)
 */
export type IAgentTeamSessionRow = {
  id: string;
  agent_team_definition_id: string;
  name: string;
  workspace: string;
  member_conversations: string; // JSON string of Record<string, string>
  status: AgentTeamSessionStatus;
  created_at: number;
  updated_at: number;
};

/**
 * Convert IAgentTeamSession to database row
 */
export function agentTeamSessionToRow(session: IAgentTeamSession): IAgentTeamSessionRow {
  return {
    id: session.id,
    agent_team_definition_id: session.agentTeamDefinitionId,
    name: session.name,
    workspace: session.workspace,
    member_conversations: JSON.stringify(session.memberConversations),
    status: session.status,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  };
}

/**
 * Convert database row to IAgentTeamSession
 */
export function rowToAgentTeamSession(row: IAgentTeamSessionRow): IAgentTeamSession {
  return {
    id: row.id,
    agentTeamDefinitionId: row.agent_team_definition_id,
    name: row.name,
    workspace: row.workspace,
    memberConversations: JSON.parse(row.member_conversations),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
