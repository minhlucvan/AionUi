/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { teamManager } from './TeamManager';

/**
 * Parsed team command from agent output
 */
export type TeamCommand =
  | { type: 'message'; to: string; content: string }
  | { type: 'broadcast'; content: string }
  | { type: 'task'; title: string; status: string };

/**
 * Regex patterns for team communication protocol
 */
const TEAM_MESSAGE_REGEX = /```team-message\s*\nTO:\s*(.+?)\n([\s\S]*?)```/g;
const TEAM_BROADCAST_REGEX = /```team-broadcast\s*\n([\s\S]*?)```/g;
const TEAM_TASK_REGEX = /```team-task\s*\nTASK:\s*(.+?)\nSTATUS:\s*(.+?)\s*```/g;

/**
 * TeamMessageRouter parses team commands from agent output
 * and routes them to the appropriate team members.
 */
export class TeamMessageRouter {
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

    // Parse task updates
    const taskRegex = new RegExp(TEAM_TASK_REGEX.source, 'g');
    while ((match = taskRegex.exec(content)) !== null) {
      commands.push({
        type: 'task',
        title: match[1].trim(),
        status: match[2].trim().toLowerCase(),
      });
    }

    return commands;
  }

  /**
   * Check if content contains any team commands
   */
  static hasTeamCommands(content: string): boolean {
    return /```team-(message|broadcast|task)\s*\n/.test(content);
  }

  /**
   * Process team commands from a member's output
   *
   * @param sessionId - Team session ID
   * @param fromMemberId - ID of the member who produced the output
   * @param content - The output text to parse for team commands
   * @param memberNameToIdMap - Map of member name -> member definition ID
   */
  static async processCommands(sessionId: string, fromMemberId: string, content: string, memberNameToIdMap: Record<string, string>): Promise<void> {
    const commands = this.parseTeamCommands(content);
    if (commands.length === 0) return;

    console.log(`[TeamMessageRouter] Processing ${commands.length} commands from member ${fromMemberId}`);

    for (const cmd of commands) {
      try {
        switch (cmd.type) {
          case 'message': {
            // Resolve member name to ID
            const toMemberId = memberNameToIdMap[cmd.to] || cmd.to;
            await teamManager.sendTeamMessage(sessionId, fromMemberId, toMemberId, cmd.content);
            break;
          }
          case 'broadcast': {
            await teamManager.broadcastTeamMessage(sessionId, fromMemberId, cmd.content);
            break;
          }
          case 'task': {
            // Try to find existing task and update, or create new
            const session = teamManager.getSession(sessionId);
            if (session) {
              const existingTask = session.tasks.find((t) => t.title.toLowerCase() === cmd.title.toLowerCase());
              const validStatuses: string[] = ['pending', 'in_progress', 'completed', 'blocked'];
              if (existingTask) {
                const status = validStatuses.indexOf(cmd.status) >= 0 ? (cmd.status as any) : undefined;
                if (status) {
                  teamManager.updateTask(sessionId, existingTask.id, { status });
                }
              } else {
                // Create new task
                const status = validStatuses.indexOf(cmd.status) >= 0 ? cmd.status : 'pending';
                teamManager.addTask(sessionId, cmd.title, undefined, status === 'in_progress' ? fromMemberId : undefined);
              }
            }
            break;
          }
        }
      } catch (error) {
        console.error(`[TeamMessageRouter] Failed to process command:`, cmd, error);
      }
    }
  }
}
