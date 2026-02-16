/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TeamToolExecutor — Executes team tool calls by routing through the event bus.
 *
 * When an agent outputs a `<team_tool>` block, the parser extracts it and
 * the executor handles it:
 * - send_message → sends a command to the target agent
 * - broadcast → sends a command to all agents
 * - assign_task → sends an assign_task command
 * - report_finding → emits a finding_reported event
 * - request_review → sends a review request command
 * - share_context → sends a share_context command
 * - get_status → returns current agent statuses
 */

import type { ResearchSession } from './types';
import type { TeamToolCall, TeamToolResult } from './TeamToolDefinitions';
import { researchEventBus } from './ResearchEventBus';

type AgentLookup = {
  /** Resolve agent name → agent ID */
  resolveAgentId: (name: string) => string | null;
  /** Get all agent info for status queries */
  getAgents: () => Array<{ id: string; name: string; role: string; status: string }>;
};

export class TeamToolExecutor {
  constructor(
    private readonly sessionId: string,
    private readonly agentLookup: AgentLookup
  ) {}

  /** Execute a parsed tool call and return the result */
  execute(call: TeamToolCall, sourceAgentId: string): TeamToolResult {
    switch (call.name) {
      case 'send_message':
        return this.handleSendMessage(call, sourceAgentId);
      case 'broadcast':
        return this.handleBroadcast(call, sourceAgentId);
      case 'assign_task':
        return this.handleAssignTask(call, sourceAgentId);
      case 'report_finding':
        return this.handleReportFinding(call, sourceAgentId);
      case 'request_review':
        return this.handleRequestReview(call, sourceAgentId);
      case 'share_context':
        return this.handleShareContext(call, sourceAgentId);
      case 'get_status':
        return this.handleGetStatus();
      default:
        return { success: false, message: `Unknown tool: ${call.name}` };
    }
  }

  private handleSendMessage(call: TeamToolCall, sourceAgentId: string): TeamToolResult {
    if (!call.target) {
      return { success: false, message: 'send_message requires a target agent name' };
    }

    const targetId = this.agentLookup.resolveAgentId(call.target);
    if (!targetId) {
      return { success: false, message: `Agent "${call.target}" not found` };
    }

    researchEventBus.emitCommand('send_message', this.sessionId, {
      sourceAgentId,
      targetAgentId: targetId,
      data: { content: call.content },
      summary: `Message from ${this.getAgentName(sourceAgentId)} to ${call.target}`,
    });

    return { success: true, message: `Message sent to ${call.target}` };
  }

  private handleBroadcast(call: TeamToolCall, sourceAgentId: string): TeamToolResult {
    researchEventBus.emitCommand('send_message', this.sessionId, {
      sourceAgentId,
      targetAgentId: null, // broadcast
      data: { content: call.content },
      summary: `Broadcast from ${this.getAgentName(sourceAgentId)}`,
    });

    return { success: true, message: 'Message broadcast to all agents' };
  }

  private handleAssignTask(call: TeamToolCall, sourceAgentId: string): TeamToolResult {
    if (!call.target) {
      return { success: false, message: 'assign_task requires a target agent name' };
    }

    const targetId = this.agentLookup.resolveAgentId(call.target);
    if (!targetId) {
      return { success: false, message: `Agent "${call.target}" not found` };
    }

    researchEventBus.emitCommand('assign_task', this.sessionId, {
      sourceAgentId,
      targetAgentId: targetId,
      data: { task: call.content },
      summary: `Task assigned to ${call.target}: ${call.content.slice(0, 100)}`,
    });

    return { success: true, message: `Task assigned to ${call.target}` };
  }

  private handleReportFinding(call: TeamToolCall, sourceAgentId: string): TeamToolResult {
    researchEventBus.emitEvent('finding_reported', this.sessionId, {
      agentId: sourceAgentId,
      data: { finding: call.content },
      summary: `Finding from ${this.getAgentName(sourceAgentId)}: ${call.content.slice(0, 200)}`,
    });

    return { success: true, message: 'Finding reported to team feed' };
  }

  private handleRequestReview(call: TeamToolCall, sourceAgentId: string): TeamToolResult {
    if (!call.target) {
      return { success: false, message: 'request_review requires a target agent name' };
    }

    const targetId = this.agentLookup.resolveAgentId(call.target);
    if (!targetId) {
      return { success: false, message: `Agent "${call.target}" not found` };
    }

    researchEventBus.emitCommand('request_review', this.sessionId, {
      sourceAgentId,
      targetAgentId: targetId,
      data: { content: call.content },
      summary: `Review requested from ${call.target} by ${this.getAgentName(sourceAgentId)}`,
    });

    return { success: true, message: `Review request sent to ${call.target}` };
  }

  private handleShareContext(call: TeamToolCall, sourceAgentId: string): TeamToolResult {
    const targetId = call.target ? this.agentLookup.resolveAgentId(call.target) : null;

    researchEventBus.emitCommand('share_context', this.sessionId, {
      sourceAgentId,
      targetAgentId: targetId,
      data: { context: call.content },
      summary: `Context shared by ${this.getAgentName(sourceAgentId)}${call.target ? ` with ${call.target}` : ' (team-wide)'}`,
    });

    return { success: true, message: call.target ? `Context shared with ${call.target}` : 'Context shared with team' };
  }

  private handleGetStatus(): TeamToolResult {
    const agents = this.agentLookup.getAgents();
    const statusLines = agents.map((a) => `- ${a.name} (${a.role}): ${a.status}`);
    const statusText = statusLines.join('\n');

    return {
      success: true,
      message: `Team status:\n${statusText}`,
      data: agents,
    };
  }

  private getAgentName(agentId: string): string {
    const agents = this.agentLookup.getAgents();
    const agent = agents.find((a) => a.id === agentId);
    return agent?.name ?? agentId.slice(0, 8);
  }
}
