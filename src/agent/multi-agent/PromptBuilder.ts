/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PromptBuilder — Generates initial prompts for nodes in any topology.
 */

import type { AgentNodeConfig, MultiAgentConfig } from './types';
import { MULTI_AGENT_COMPLETION_SIGNAL } from './types';

/**
 * Build the initial prompt for a node based on its role in the topology.
 */
export function buildNodeInitialPrompt(config: MultiAgentConfig, nodeConfig: AgentNodeConfig, isStarter: boolean, targetNodeIds: string[]): string {
  const sections: string[] = [];

  sections.push(`# Multi-Agent Session — ${nodeConfig.label || nodeConfig.id}`);
  sections.push('');

  // Role
  sections.push('## Your Role');
  sections.push(`You are **${nodeConfig.label || nodeConfig.id}** (role: ${nodeConfig.role}) in a multi-agent system.`);
  sections.push(`Topology: **${config.topology.type}**`);
  sections.push('');

  // Peers
  const peers = config.topology.nodes.filter((n) => n.id !== nodeConfig.id);
  if (peers.length > 0) {
    sections.push('## Your Peers');
    for (const peer of peers) {
      const isTarget = targetNodeIds.includes(peer.id);
      sections.push(`- **${peer.label || peer.id}** (${peer.role})${isTarget ? ' — you send messages to this agent' : ''}`);
    }
    sections.push('');
  }

  // Communication
  sections.push('## Communication');
  sections.push('You communicate with other agents through a message relay system.');
  sections.push('When you finish responding, your output is automatically delivered to the next agent(s) in the topology.');
  sections.push('You will receive messages from other agents as input to your conversation.');
  sections.push('');

  // Role-specific instructions
  sections.push(getRoleInstructions(nodeConfig.role));
  sections.push('');

  // Completion
  sections.push('## Completion');
  sections.push(`When the ENTIRE task is complete, output this signal on its own line:`);
  sections.push(`\`${MULTI_AGENT_COMPLETION_SIGNAL}\``);
  sections.push('');

  // Workspace
  sections.push('## Workspace');
  sections.push(`- **Directory:** ${config.workspace}`);
  sections.push('');

  // Custom system context
  if (nodeConfig.systemContext) {
    sections.push('## Additional Context');
    sections.push(nodeConfig.systemContext);
    sections.push('');
  }

  // Task
  sections.push('## Task');
  sections.push(config.task);
  sections.push('');

  // Starter instruction
  sections.push('---');
  if (isStarter) {
    sections.push('You are the **starter** of this session. Begin by analyzing the task and producing your first output.');
  } else {
    sections.push('Wait for input from another agent. You will receive the first message shortly.');
  }

  return sections.join('\n');
}

function getRoleInstructions(role: string): string {
  switch (role) {
    case 'driver':
    case 'planner':
      return `### Instructions
- Plan the implementation strategy
- Break the task into clear, actionable steps
- Review reports from other agents and provide feedback
- Verify the work is correct and complete
- Do NOT implement code yourself — direct others`;

    case 'navigator':
    case 'coder':
    case 'executor':
      return `### Instructions
- Receive instructions and implement them precisely
- Use your tools (file editing, bash, etc.) to make changes
- Run tests and quality checks
- Report results: files changed, tests run, errors found
- If instructions are unclear, report what is ambiguous`;

    case 'reviewer':
    case 'judge':
      return `### Instructions
- Review code and implementation from other agents
- Check for correctness, edge cases, and best practices
- Provide specific, actionable feedback
- Approve or request changes`;

    default:
      return `### Instructions
- Follow the communication protocol
- Respond to messages from other agents
- Report your progress clearly`;
  }
}
