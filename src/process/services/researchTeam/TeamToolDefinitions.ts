/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Team Tool Definitions — 3 general-purpose coordination tools.
 *
 * Design philosophy (Scrum/Kanban for agents):
 * - Agents already have native file tools (Read, Write, Edit, Bash, Grep, Glob)
 * - Team tools handle ONLY coordination that file ops can't do
 * - All substantive content goes through files (artifacts)
 * - The board is the single source of truth
 *
 * Tools:
 *   1. board_update — Post status and progress to the shared team board
 *   2. board_read  — Read the current team board state
 *   3. notify      — Signal a teammate (or all) to take action
 *
 * Tool call format (unchanged XML blocks for streaming parser):
 *   <team_tool name="tool_name" target="agent-name">
 *   payload content
 *   </team_tool>
 */

export type TeamToolName = 'board_update' | 'board_read' | 'notify';

export type TeamToolCall = {
  /** Which tool is being called */
  name: TeamToolName;
  /** Target agent name (for notify; null for board tools) */
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
    name: 'board_update',
    description:
      'Update the shared team board with your current status and progress. ' +
      'Use this after completing work, when blocked, or to register artifacts you produced. ' +
      'The board is visible to all teammates and serves as the single source of truth.',
    requiresTarget: false,
    example: `<team_tool name="board_update">
status: working
message: Analyzed the authentication module. Found 3 issues. See .team/artifacts/auth-analysis.md
artifacts: .team/artifacts/auth-analysis.md
</team_tool>`,
  },
  {
    name: 'board_read',
    description: 'Read the current team board to see what all teammates are working on, their status, and produced artifacts. Use this before starting work or when you need to coordinate.',
    requiresTarget: false,
    example: `<team_tool name="board_read">
</team_tool>`,
  },
  {
    name: 'notify',
    description:
      'Send a notification to a specific teammate (or all teammates if no target). ' +
      'Use this to signal that an artifact is ready for review, you need input, or to coordinate next steps. ' +
      'Keep notifications brief — put detailed content in artifact files that teammates can read.',
    requiresTarget: false, // target is optional (null = broadcast)
    example: `<team_tool name="notify" target="reviewer">
Artifact ready: .team/artifacts/auth-analysis.md — please review the 3 issues I found.
</team_tool>`,
  },
];

/**
 * Parse a board_update tool call body into structured fields.
 *
 * Expected format (flexible key: value lines):
 *   status: working|blocked|reviewing|done
 *   message: Free-form text about current work
 *   artifacts: comma-separated file paths (optional)
 */
export function parseBoardUpdateContent(content: string): {
  status?: string;
  message?: string;
  artifacts?: string[];
} {
  const lines = content.split('\n');
  const result: { status?: string; message?: string; artifacts?: string[] } = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) {
      // No key: value format — treat entire content as message
      if (!result.message) result.message = trimmed;
      continue;
    }

    const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
    const value = trimmed.slice(colonIdx + 1).trim();

    switch (key) {
      case 'status':
        result.status = value.toLowerCase();
        break;
      case 'message':
        result.message = value;
        break;
      case 'artifacts':
      case 'artifact':
      case 'files':
        result.artifacts = value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        break;
      default:
        // Unknown key — append to message
        if (!result.message) {
          result.message = trimmed;
        }
        break;
    }
  }

  return result;
}

/**
 * Generate the prompt instructions that teach agents how to use team tools.
 * This gets injected into the agent's initial objective prompt.
 */
export function buildTeamToolsPrompt(agentName: string, teammates: Array<{ name: string; role: string }>, boardPath: string, artifactsDir: string): string {
  const toolDocs = TEAM_TOOLS.map(
    (tool) =>
      `### ${tool.name}
${tool.description}
${tool.requiresTarget ? 'Requires target agent.' : 'Target is optional.'}

Example:
${tool.example}`
  ).join('\n\n');

  const teammateList = teammates.map((t) => `- **${t.name}** (${t.role})`).join('\n');

  return `## Team Collaboration

You are **${agentName}** working as part of a team. Your workflow follows a Kanban-style process:

### How It Works
1. **Read the board** to understand team state and what others are doing
2. **Do your work** using your native tools (Read, Write, Edit, Bash, Grep, Glob)
3. **Write artifacts** to \`${artifactsDir}\` for anything you want to share (findings, analysis, code, etc.)
4. **Update the board** to report your progress and reference your artifacts
5. **Notify teammates** when they need to act (review your work, unblock you, etc.)

### Shared Workspace
- **Board file**: \`${boardPath}\` (auto-managed, use board_read/board_update tools)
- **Artifacts dir**: \`${artifactsDir}\` (write files here with your native Write tool)
- All teammates can read your artifacts — this is how you share context

### Your Teammates
${teammateList}

### Tools (use XML blocks in your output)

${toolDocs}

### Guidelines
- **Write artifacts first, then update the board** — content goes in files, not in tool calls
- **Keep notifications brief** — say what and where, not the full content
- **Check the board before starting** — avoid duplicate work
- **Use native file tools for everything else** — Read, Write, Edit, Bash, Grep, Glob are all available
- When producing work output, write it to \`${artifactsDir}/<descriptive-name>.md\`
`;
}
