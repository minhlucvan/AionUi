/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Team Tool Definitions
 *
 * Defines the structured tools that research team agents can invoke
 * to collaborate with each other. Agents call these tools by outputting
 * structured XML-like blocks in their response. The runner parses
 * these blocks and routes them through the ResearchEventBus.
 *
 * Tool call format:
 *   <team_tool name="tool_name" target="agent-name">
 *   payload content
 *   </team_tool>
 */

export type TeamToolName = 'send_message' | 'broadcast' | 'assign_task' | 'report_finding' | 'request_review' | 'get_status' | 'share_context';

export type TeamToolCall = {
  /** Which tool is being called */
  name: TeamToolName;
  /** Target agent name (null for broadcasts/system calls) */
  target: string | null;
  /** Payload content (the body of the tool call) */
  content: string;
  /** Raw text that was parsed (for deduplication) */
  rawText: string;
};

export type TeamToolResult = {
  /** Whether the tool call succeeded */
  success: boolean;
  /** Result message shown back to the agent */
  message: string;
  /** Optional data payload */
  data?: unknown;
};

type TeamToolDefinition = {
  name: TeamToolName;
  description: string;
  /** Whether this tool requires a target agent */
  requiresTarget: boolean;
  /** Example usage shown in the prompt */
  example: string;
};

export const TEAM_TOOLS: TeamToolDefinition[] = [
  {
    name: 'send_message',
    description: 'Send a direct message to another agent. Use this to ask questions, provide feedback, or share information with a specific teammate.',
    requiresTarget: true,
    example: `<team_tool name="send_message" target="reviewer">
I found 3 potential issues in the authentication module. Can you verify my findings?
</team_tool>`,
  },
  {
    name: 'broadcast',
    description: 'Send a message to ALL agents in the team. Use sparingly for important announcements or coordination.',
    requiresTarget: false,
    example: `<team_tool name="broadcast">
I've completed the initial analysis. The main issue is in the database layer.
</team_tool>`,
  },
  {
    name: 'assign_task',
    description: 'Assign a specific task to another agent. The target agent will receive the task as a message.',
    requiresTarget: true,
    example: `<team_tool name="assign_task" target="analyst">
Please analyze the performance metrics in src/utils/cache.ts and identify bottlenecks.
</team_tool>`,
  },
  {
    name: 'report_finding',
    description: 'Report an important finding to the team feed. All agents and the user can see reported findings.',
    requiresTarget: false,
    example: `<team_tool name="report_finding">
FINDING: The rate limiter in api/middleware.ts has a race condition that allows burst traffic to bypass limits under high concurrency.
</team_tool>`,
  },
  {
    name: 'request_review',
    description: 'Ask another agent to review your work or analysis. Include the content you want reviewed.',
    requiresTarget: true,
    example: `<team_tool name="request_review" target="reviewer">
Please review my proposed fix for the race condition:
- Add mutex lock around the counter increment
- Use atomic compare-and-swap for the rate check
</team_tool>`,
  },
  {
    name: 'share_context',
    description: 'Share relevant context, code snippets, or information with another agent or the whole team.',
    requiresTarget: false,
    example: `<team_tool name="share_context" target="researcher">
Here is the relevant code from auth.ts that you should look at:
\`\`\`typescript
export function validateToken(token: string): boolean {
  // This is where the vulnerability exists
  return jwt.verify(token, SECRET, { algorithms: ['HS256'] });
}
\`\`\`
</team_tool>`,
  },
  {
    name: 'get_status',
    description: 'Get the current status of all agents in the team. Returns who is running, idle, or finished.',
    requiresTarget: false,
    example: `<team_tool name="get_status">
</team_tool>`,
  },
];

/**
 * Generate the prompt instructions that teach agents how to use team tools.
 * This gets injected into the agent's initial objective prompt.
 */
export function buildTeamToolsPrompt(agentName: string, teammates: Array<{ name: string; role: string }>): string {
  const toolDocs = TEAM_TOOLS.map(
    (tool) =>
      `### ${tool.name}
${tool.description}
${tool.requiresTarget ? 'Requires target agent.' : 'No target needed (or optional).'}

Example:
${tool.example}`
  ).join('\n\n');

  const teammateList = teammates.map((t) => `- **${t.name}** (${t.role})`).join('\n');

  return `## Team Collaboration Tools

You are **${agentName}** working as part of a team. You can use the following tools to communicate and coordinate with your teammates.

### How to Call Tools
Output a structured block in your response:
\`\`\`
<team_tool name="TOOL_NAME" target="AGENT_NAME">
Your message or content here
</team_tool>
\`\`\`

The system will intercept these blocks, route them to the appropriate agent, and you will receive responses as follow-up messages.

### Your Teammates
${teammateList}

### Available Tools

${toolDocs}

### Guidelines
- Use **send_message** for direct 1:1 communication
- Use **report_finding** to log important discoveries visible to everyone
- Use **request_review** when you want another agent to validate your work
- Use **assign_task** to delegate specific subtasks
- Use **broadcast** sparingly — only for team-wide announcements
- You will receive messages from other agents as follow-up prompts
- Always identify yourself when communicating: start messages with your role/purpose
- Be concise but thorough in your communications
`;
}
