/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { agentTeamManager } from './AgentTeamManager';

/**
 * Parsed team command from agent output
 */
export type TeamCommand =
  | { type: 'message'; to: string; content: string }
  | { type: 'broadcast'; content: string };

/**
 * Regex patterns for team communication protocol
 */
const TEAM_MESSAGE_REGEX = /```team-message\s*\nTO:\s*(.+?)\n([\s\S]*?)```/g;
const TEAM_BROADCAST_REGEX = /```team-broadcast\s*\n([\s\S]*?)```/g;

/**
 * AgentTeamMessageRouter parses team commands from agent output
 * and routes them automatically to the appropriate team members.
 * All team coordination is internal — no user intervention needed.
 */
export class AgentTeamMessageRouter {
  /**
   * Parse all team commands from agent output text
   */
  static parseTeamCommands(content: string): TeamCommand[] {
    const commands: TeamCommand[] = [];

    // Parse direct messages
    let match: RegExpExecArray | null;
    const msgRegex = new RegExp(TEAM_MESSAGE_REGEX.source, 'g');
    while ((match = msgRegex.exec(content)) !== null) {
      commands.push({
        type: 'message',
        to: match[1].trim(),
        content: match[2].trim(),
      });
    }

    // Parse broadcasts
    const bcastRegex = new RegExp(TEAM_BROADCAST_REGEX.source, 'g');
    while ((match = bcastRegex.exec(content)) !== null) {
      commands.push({
        type: 'broadcast',
        content: match[1].trim(),
      });
    }

    return commands;
  }

  /**
   * Check if content contains any team commands
   */
  static hasTeamCommands(content: string): boolean {
    return /```team-(message|broadcast)\s*\n/.test(content);
  }

  /**
   * Process team commands from a member's output.
   * Routes messages automatically between team members.
   *
   * @param sessionId - Team session ID
   * @param fromMemberId - ID of the member who produced the output
   * @param content - The output text to parse for team commands
   * @param memberNameToIdMap - Map of member name -> member definition ID
   */
  static async processCommands(sessionId: string, fromMemberId: string, content: string, memberNameToIdMap: Record<string, string>): Promise<void> {
    const commands = this.parseTeamCommands(content);
    if (commands.length === 0) return;

    console.log(`[AgentTeamMessageRouter] Processing ${commands.length} commands from member ${fromMemberId}`);

    for (const cmd of commands) {
      try {
        switch (cmd.type) {
          case 'message': {
            // Resolve member name/id to definition ID (try exact, then case-insensitive)
            const toMemberId = memberNameToIdMap[cmd.to] || memberNameToIdMap[cmd.to.toLowerCase()] || cmd.to;
            await agentTeamManager.sendTeamMessage(sessionId, fromMemberId, toMemberId, cmd.content);
            break;
          }
          case 'broadcast': {
            await agentTeamManager.broadcastTeamMessage(sessionId, fromMemberId, cmd.content);
            break;
          }
        }
      } catch (error) {
        console.error(`[AgentTeamMessageRouter] Failed to process command:`, cmd, error);
      }
    }
  }
}
