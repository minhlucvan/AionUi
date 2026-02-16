/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TeamToolParser — Extracts structured tool calls from agent output text.
 *
 * Agents call team tools by outputting XML-like blocks:
 *
 *   <team_tool name="board_update">
 *   status: working
 *   message: Completed analysis
 *   </team_tool>
 *
 * 3 recognized tools: board_update, board_read, notify
 *
 * The parser handles:
 * - Streaming: accumulates chunks until a complete tool call is found
 * - Deduplication: tracks which tool calls have already been extracted
 * - Multiple tool calls in a single output
 * - Nested content (code blocks, etc.)
 */

import type { TeamToolCall, TeamToolName } from './TeamToolDefinitions';

const VALID_TOOL_NAMES = new Set<string>(['board_update', 'board_read', 'notify']);

/**
 * Regex to match a complete team_tool block.
 * Captures: name, optional target, and body content.
 *
 * Group 1: tool name
 * Group 2: target value (optional)
 * Group 3: body content
 */
const TOOL_CALL_REGEX = /<team_tool\s+name="([^"]+)"(?:\s+target="([^"]*)")?\s*>([\s\S]*?)<\/team_tool>/g;

/**
 * Parse all complete tool calls from a text buffer.
 * Returns the parsed calls and the remaining text after the last match.
 */
export function parseToolCalls(text: string): { calls: TeamToolCall[]; remaining: string } {
  const calls: TeamToolCall[] = [];
  let lastIndex = 0;

  // Reset regex state
  TOOL_CALL_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = TOOL_CALL_REGEX.exec(text)) !== null) {
    const name = match[1];
    const target = match[2] || null;
    const content = match[3].trim();
    const rawText = match[0];

    if (VALID_TOOL_NAMES.has(name)) {
      calls.push({
        name: name as TeamToolName,
        target: target || null,
        content,
        rawText,
      });
    }

    lastIndex = match.index + rawText.length;
  }

  // If we found matches, return remaining text after last match
  const remaining = lastIndex > 0 ? text.slice(lastIndex) : text;

  return { calls, remaining };
}

/**
 * Check if the text buffer might contain a partial tool call.
 * Used to decide whether to buffer more output before parsing.
 */
export function hasPartialToolCall(text: string): boolean {
  // Check for opening tag without closing tag
  return text.includes('<team_tool') && !text.includes('</team_tool>');
}

/**
 * StreamingToolParser — Stateful parser for streaming agent output.
 *
 * Accumulates chunks and extracts complete tool calls as they arrive.
 * Handles partial chunks gracefully by buffering until a complete
 * tool call block is found.
 */
export class StreamingToolParser {
  private buffer = '';
  private processedToolCalls = new Set<string>();

  /** Feed a new chunk of text from the agent output stream */
  feed(chunk: string): TeamToolCall[] {
    this.buffer += chunk;

    // Don't parse until we have at least one potential complete tool call
    if (!this.buffer.includes('</team_tool>')) {
      return [];
    }

    const { calls, remaining } = parseToolCalls(this.buffer);

    // Deduplicate: skip calls we've already processed
    const newCalls = calls.filter((call) => {
      if (this.processedToolCalls.has(call.rawText)) return false;
      this.processedToolCalls.add(call.rawText);
      return true;
    });

    // Keep only the remaining unparsed text in the buffer
    this.buffer = remaining;

    return newCalls;
  }

  /** Reset the parser state */
  reset(): void {
    this.buffer = '';
    this.processedToolCalls.clear();
  }

  /** Get the current buffer (for debugging) */
  getBuffer(): string {
    return this.buffer;
  }
}
