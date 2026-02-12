/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IAgentTeamDefinition, IAgentTeamMemberDefinition, IAgentTeamSession, IAgentTeamSessionRow } from '@/common/agentTeam';
import { rowToAgentTeamSession, agentTeamSessionToRow } from '@/common/agentTeam';
import type { ICreateConversationParams } from '@/common/ipcBridge';
import { uuid } from '@/common/utils';
import { getDatabase } from '@process/database';
import { ConversationService } from './conversationService';
import WorkerManage from '../WorkerManage';
import type AcpAgentManager from '../task/AcpAgentManager';

/**
 * Access the underlying better-sqlite3 instance from AionUIDatabase.
 * The `db` property is private, so we use a cast to access it.
 * This is safe because AgentTeamManager runs in the same main process.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getRawDb(): any {
  return (getDatabase() as any).db;
}

/**
 * AgentTeamManager orchestrates multi-agent team sessions.
 * Each team member is an independent ACP (Claude Code) conversation
 * managed by AionUi, following the patterns from Claude Agent Teams.
 *
 * Team and task management is fully internal and automatic —
 * agents coordinate via the communication protocol without user intervention.
 */
class AgentTeamManager {
  /**
   * Create a new team session from a definition
   */
  async createSession(definition: IAgentTeamDefinition, workspace: string): Promise<IAgentTeamSession> {
    const session: IAgentTeamSession = {
      id: uuid(16),
      agentTeamDefinitionId: definition.id,
      name: definition.name,
      workspace,
      memberConversations: {},
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Persist to database
    this.saveSession(session);

    // Spawn all members
    for (const memberDef of definition.members) {
      await this.spawnMember(session, memberDef, definition);
    }

    // Save updated session with member conversations
    this.saveSession(session);

    console.log(`[AgentTeamManager] Created team session: ${session.id} with ${definition.members.length} members`);
    return session;
  }

  /**
   * Spawn a single team member as an ACP conversation
   */
  async spawnMember(session: IAgentTeamSession, memberDef: IAgentTeamMemberDefinition, teamDef: IAgentTeamDefinition): Promise<string> {
    const teamContext = this.buildTeamSystemPrompt(memberDef, teamDef);

    // Build params compatible with ICreateConversationParams
    const params: ICreateConversationParams = {
      type: 'acp',
      model: { id: '', useModel: '' } as any,
      extra: {
        workspace: session.workspace,
        backend: (memberDef.backend || 'claude') as any,
        customWorkspace: true,
        presetContext: teamContext,
        enabledSkills: memberDef.skills,
        presetAssistantId: memberDef.presetAssistantId,
      },
      name: `[${session.name}] ${memberDef.name}`,
    };

    const result = await ConversationService.createConversation({
      ...params,
      source: 'aionui',
    });

    if (!result.success || !result.conversation) {
      throw new Error(`Failed to spawn team member "${memberDef.name}": ${result.error}`);
    }

    const conversationId = result.conversation.id;

    // Update conversation extra with team metadata
    const db = getDatabase();
    const existingConv = db.getConversation(conversationId);
    if (existingConv.success && existingConv.data) {
      const updatedExtra = {
        ...existingConv.data.extra,
        agentTeamSessionId: session.id,
        agentTeamMemberId: memberDef.id,
        agentTeamMemberName: memberDef.name,
        agentTeamRole: memberDef.role,
      };
      db.updateConversation(conversationId, { extra: updatedExtra } as any);
    }

    session.memberConversations[memberDef.id] = conversationId;
    session.updatedAt = Date.now();

    console.log(`[AgentTeamManager] Spawned member "${memberDef.name}" (${memberDef.role}) -> conversation: ${conversationId}`);
    return conversationId;
  }

  /**
   * Build system prompt for a team member with team context.
   * Team coordination and task management are handled automatically
   * through the communication protocol between agents.
   */
  private buildTeamSystemPrompt(member: IAgentTeamMemberDefinition, team: IAgentTeamDefinition): string {
    const roleDesc = member.role === 'lead' ? 'Team Lead - coordinate work, delegate tasks, and synthesize results' : 'Team Member';

    const membersList = team.members
      .map((m) => {
        const marker = m.id === member.id ? ' (you)' : '';
        return `- **${m.id}** — ${m.name}${marker} [${m.role}]: ${m.systemPrompt.slice(0, 120)}...`;
      })
      .join('\n');

    const otherMemberIds = team.members
      .filter((m) => m.id !== member.id)
      .map((m) => `"${m.id}"`)
      .join(', ');

    return `## Team Context

You are "${member.name}" (id: ${member.id}) on the "${team.name}" team.
Your role: ${roleDesc}

### Your Instructions
${member.systemPrompt}

### Team Members
${membersList}

### Communication Protocol
When you need to communicate with a teammate, include a message in this format at the end of your response.
**IMPORTANT**: Use the member **id** (not name) in the TO field. Available ids: ${otherMemberIds}

\`\`\`team-message
TO: <member-id>
<your message>
\`\`\`

To broadcast to all teammates:
\`\`\`team-broadcast
<your message>
\`\`\`

The team orchestrator will route your messages automatically. Coordinate tasks and share progress through these messages.
`;
  }

  /**
   * Send a message from one member to another by injecting it into the target's conversation
   */
  async sendTeamMessage(sessionId: string, fromMemberId: string, toMemberId: string, content: string): Promise<void> {
    const session = this.getSession(sessionId);
    if (!session) throw new Error(`Team session not found: ${sessionId}`);

    const fromName = fromMemberId;
    const toConversationId = session.memberConversations[toMemberId];
    if (!toConversationId) throw new Error(`Member not found in session: ${toMemberId}`);

    const message = `[Team message from ${fromName}]: ${content}`;

    try {
      const task = (await WorkerManage.getTaskByIdRollbackBuild(toConversationId)) as AcpAgentManager;
      if (task && task.type === 'acp') {
        await task.sendMessage({ content: message, msg_id: uuid() });
      }
    } catch (error) {
      console.error(`[AgentTeamManager] Failed to route message to ${toMemberId}:`, error);
    }
  }

  /**
   * Broadcast a message from one member to all others
   */
  async broadcastTeamMessage(sessionId: string, fromMemberId: string, content: string): Promise<void> {
    const session = this.getSession(sessionId);
    if (!session) throw new Error(`Team session not found: ${sessionId}`);

    const memberIds = Object.keys(session.memberConversations).filter((id) => id !== fromMemberId);

    for (const memberId of memberIds) {
      await this.sendTeamMessage(sessionId, fromMemberId, memberId, content);
    }
  }

  /**
   * Shutdown a single team member
   */
  async shutdownMember(sessionId: string, memberId: string): Promise<void> {
    const session = this.getSession(sessionId);
    if (!session) return;

    const conversationId = session.memberConversations[memberId];
    if (conversationId) {
      WorkerManage.kill(conversationId);
      console.log(`[AgentTeamManager] Shutdown member ${memberId} (conversation: ${conversationId})`);
    }
  }

  /**
   * Destroy a team session and kill all member conversations
   */
  async destroySession(sessionId: string): Promise<void> {
    const session = this.getSession(sessionId);
    if (!session) return;

    // Kill all member conversations
    const conversationIds = Object.keys(session.memberConversations).map((k) => session.memberConversations[k]);
    for (const conversationId of conversationIds) {
      WorkerManage.kill(conversationId);
    }

    // Update status
    session.status = 'cancelled';
    session.updatedAt = Date.now();
    this.saveSession(session);

    console.log(`[AgentTeamManager] Destroyed team session: ${sessionId}`);
  }

  /**
   * Get a team session by ID
   */
  getSession(sessionId: string): IAgentTeamSession | undefined {
    try {
      const db = getRawDb();
      const row = db.prepare('SELECT * FROM agent_team_sessions WHERE id = ?').get(sessionId) as IAgentTeamSessionRow | undefined;
      if (row) return rowToAgentTeamSession(row);
    } catch (error) {
      console.error(`[AgentTeamManager] Failed to get session ${sessionId}:`, error);
    }
    return undefined;
  }

  /**
   * List all active team sessions
   */
  getActiveSessions(): IAgentTeamSession[] {
    try {
      const db = getRawDb();
      const rows = db.prepare('SELECT * FROM agent_team_sessions WHERE status = ? ORDER BY updated_at DESC').all('active') as IAgentTeamSessionRow[];
      return rows.map(rowToAgentTeamSession);
    } catch (error) {
      console.error('[AgentTeamManager] Failed to list active sessions:', error);
      return [];
    }
  }

  /**
   * List all team sessions (any status)
   */
  getAllSessions(): IAgentTeamSession[] {
    try {
      const db = getRawDb();
      const rows = db.prepare('SELECT * FROM agent_team_sessions ORDER BY updated_at DESC').all() as IAgentTeamSessionRow[];
      return rows.map(rowToAgentTeamSession);
    } catch (error) {
      console.error('[AgentTeamManager] Failed to list sessions:', error);
      return [];
    }
  }

  /**
   * Save team session to database
   */
  private saveSession(session: IAgentTeamSession): void {
    try {
      const db = getRawDb();
      const row = agentTeamSessionToRow(session);

      db.prepare(
        `INSERT OR REPLACE INTO agent_team_sessions (id, agent_team_definition_id, name, workspace, member_conversations, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(row.id, row.agent_team_definition_id, row.name, row.workspace, row.member_conversations, row.status, row.created_at, row.updated_at);
    } catch (error) {
      console.error(`[AgentTeamManager] Failed to save session ${session.id}:`, error);
    }
  }
}

// Singleton instance
export const agentTeamManager = new AgentTeamManager();
