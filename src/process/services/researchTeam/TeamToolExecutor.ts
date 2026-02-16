/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TeamToolExecutor — Executes the 3 team coordination tools.
 *
 * Tools:
 *   board_update → Updates the agent's entry on the shared board file
 *   board_read   → Returns the current board state as markdown
 *   notify       → Sends a notification to a specific agent or broadcasts
 *
 * The executor works with BoardManager for board operations and
 * routes notifications through the ResearchEventBus.
 */

import type { TeamToolCall, TeamToolResult } from './TeamToolDefinitions';
import { parseBoardUpdateContent } from './TeamToolDefinitions';
import type { BoardManager, AgentBoardStatus } from './BoardManager';
import { researchEventBus } from './ResearchEventBus';

const VALID_STATUSES = new Set<string>(['working', 'blocked', 'reviewing', 'done', 'idle']);

type AgentLookup = {
  /** Resolve agent name → agent ID */
  resolveAgentId: (name: string) => string | null;
  /** Get all agent info for status queries */
  getAgents: () => Array<{ id: string; name: string; role: string; status: string }>;
};

export class TeamToolExecutor {
  constructor(
    private readonly sessionId: string,
    private readonly agentLookup: AgentLookup,
    private readonly board: BoardManager
  ) {}

  /** Execute a parsed tool call and return the result */
  execute(call: TeamToolCall, sourceAgentId: string): TeamToolResult {
    switch (call.name) {
      case 'board_update':
        return this.handleBoardUpdate(call, sourceAgentId);
      case 'board_read':
        return this.handleBoardRead();
      case 'notify':
        return this.handleNotify(call, sourceAgentId);
      default:
        return { success: false, message: `Unknown tool: ${call.name}` };
    }
  }

  private handleBoardUpdate(call: TeamToolCall, sourceAgentId: string): TeamToolResult {
    const parsed = parseBoardUpdateContent(call.content);

    // Validate status if provided
    if (parsed.status && !VALID_STATUSES.has(parsed.status)) {
      return {
        success: false,
        message: `Invalid status "${parsed.status}". Use: working, blocked, reviewing, done, idle`,
      };
    }

    this.board.updateAgent(sourceAgentId, {
      status: parsed.status as AgentBoardStatus | undefined,
      message: parsed.message,
      artifacts: parsed.artifacts,
    });

    // Emit event for feed observability
    const agentName = this.getAgentName(sourceAgentId);
    researchEventBus.emitEvent('progress_updated', this.sessionId, {
      agentId: sourceAgentId,
      summary: `${agentName} updated board: ${parsed.message?.slice(0, 100) ?? parsed.status ?? 'update'}`,
      data: {
        status: parsed.status,
        message: parsed.message,
        artifacts: parsed.artifacts,
      },
    });

    const parts = [];
    if (parsed.status) parts.push(`status → ${parsed.status}`);
    if (parsed.artifacts?.length) parts.push(`${parsed.artifacts.length} artifact(s) registered`);

    return {
      success: true,
      message: `Board updated. ${parts.join(', ')}. Board file: ${this.board.getBoardFilePath()}`,
    };
  }

  private handleBoardRead(): TeamToolResult {
    const boardContent = this.board.readBoard();
    return {
      success: true,
      message: boardContent,
    };
  }

  private handleNotify(call: TeamToolCall, sourceAgentId: string): TeamToolResult {
    const agentName = this.getAgentName(sourceAgentId);

    if (call.target) {
      // Directed notification
      const targetId = this.agentLookup.resolveAgentId(call.target);
      if (!targetId) {
        return { success: false, message: `Agent "${call.target}" not found` };
      }

      researchEventBus.emitCommand('send_message', this.sessionId, {
        sourceAgentId,
        targetAgentId: targetId,
        data: { content: `[Notification from ${agentName}] ${call.content}` },
        summary: `${agentName} → ${call.target}: ${call.content.slice(0, 100)}`,
      });

      return { success: true, message: `Notification sent to ${call.target}` };
    } else {
      // Broadcast notification
      researchEventBus.emitCommand('send_message', this.sessionId, {
        sourceAgentId,
        targetAgentId: null,
        data: { content: `[Notification from ${agentName}] ${call.content}` },
        summary: `${agentName} (broadcast): ${call.content.slice(0, 100)}`,
      });

      return { success: true, message: 'Notification broadcast to all teammates' };
    }
  }

  private getAgentName(agentId: string): string {
    const agents = this.agentLookup.getAgents();
    const agent = agents.find((a) => a.id === agentId);
    return agent?.name ?? agentId.slice(0, 8);
  }
}
