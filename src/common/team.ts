/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AcpBackend } from '@/types/acpTypes';

// ==================== Team Definition Types ====================

/**
 * Role of a team member
 */
export type TeamMemberRole = 'lead' | 'member';

/**
 * Team member definition (stored in team definition)
 */
export type ITeamMemberDefinition = {
  id: string;
  name: string;
  role: TeamMemberRole;
  systemPrompt: string;
  backend?: AcpBackend;
  model?: string;
  presetAssistantId?: string;
  skills?: string[];
};

/**
 * Team definition (reusable template)
 * Used at runtime when creating team sessions from assistant presets.
 */
export type ITeamDefinition = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  members: ITeamMemberDefinition[];
  defaultWorkspace?: string;
  createdAt: number;
  updatedAt: number;
};

// ==================== Team Session Types (Runtime) ====================

/**
 * Team session status
 */
export type TeamSessionStatus = 'active' | 'completed' | 'cancelled';

/**
 * Runtime team session (active team instance)
 */
export type ITeamSession = {
  id: string;
  teamDefinitionId: string;
  name: string;
  workspace: string;
  /** Map of member definition ID -> conversation ID */
  memberConversations: Record<string, string>;
  status: TeamSessionStatus;
  createdAt: number;
  updatedAt: number;
};

// ==================== Team Message Types ====================

/**
 * A cross-member message routed by the team system
 */
export type ITeamMessage = {
  id: string;
  sessionId: string;
  fromMemberId: string;
  toMemberId?: string; // undefined = broadcast
  content: string;
  timestamp: number;
};

// ==================== Database Row Types ====================

/**
 * Team session stored in database (serialized format)
 */
export type ITeamSessionRow = {
  id: string;
  team_definition_id: string;
  name: string;
  workspace: string;
  member_conversations: string; // JSON string of Record<string, string>
  status: TeamSessionStatus;
  created_at: number;
  updated_at: number;
};

/**
 * Convert ITeamSession to database row
 */
export function teamSessionToRow(session: ITeamSession): ITeamSessionRow {
  return {
    id: session.id,
    team_definition_id: session.teamDefinitionId,
    name: session.name,
    workspace: session.workspace,
    member_conversations: JSON.stringify(session.memberConversations),
    status: session.status,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  };
}

/**
 * Convert database row to ITeamSession
 */
export function rowToTeamSession(row: ITeamSessionRow): ITeamSession {
  return {
    id: row.id,
    teamDefinitionId: row.team_definition_id,
    name: row.name,
    workspace: row.workspace,
    memberConversations: JSON.parse(row.member_conversations),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

