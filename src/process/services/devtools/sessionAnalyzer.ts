/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Session analyzer — top-level orchestrator that produces a complete SessionAnalysis.
 * Combines JSONL parsing, classification, chunk building, and metric analysis.
 */

import { buildChunks } from './chunkBuilder';
import { parseJsonlFile, calculateMetrics, extractTextContent, countTokens } from './jsonlParser';
import { findSessionFile } from './sessionDiscovery';
import { buildToolExecutions, buildToolExecutionSummary } from './toolAnalysis';
import type { CompactionEvent, ContentBlock, ParsedMessage, SessionAnalysis, TokenAttribution, TokenCategory } from './types';

/**
 * Compute token attribution across categories for all messages.
 */
function computeTokenAttribution(messages: ParsedMessage[]): TokenAttribution {
  const attribution: TokenAttribution = {
    user: 0,
    assistant: 0,
    thinking: 0,
    tool_input: 0,
    tool_output: 0,
    system: 0,
    claude_md: 0,
  };

  for (const msg of messages) {
    const text = extractTextContent(msg.content);
    const tokens = countTokens(text);

    if (msg.type === 'user') {
      if (msg.isMeta) {
        attribution.system += tokens;
      } else if (msg.toolResults.length > 0) {
        attribution.tool_output += msg.toolResults.reduce((sum, r) => sum + countTokens(r.content), 0);
      } else {
        attribution.user += tokens;
      }
    } else if (msg.type === 'assistant') {
      // Break down assistant content blocks
      if (Array.isArray(msg.content)) {
        for (const block of msg.content as ContentBlock[]) {
          if (block.type === 'thinking') {
            attribution.thinking += countTokens(block.thinking);
          } else if (block.type === 'tool_use') {
            attribution.tool_input += countTokens(JSON.stringify(block.input));
          } else if (block.type === 'text') {
            attribution.assistant += countTokens(block.text);
          }
        }
      } else {
        attribution.assistant += tokens;
      }
    } else if (msg.type === 'system') {
      // Check if it looks like CLAUDE.md content
      if (text.includes('CLAUDE.md') || text.includes('## Project') || text.includes('# ')) {
        attribution.claude_md += tokens;
      } else {
        attribution.system += tokens;
      }
    }
  }

  return attribution;
}

/**
 * Detect compaction events in the message stream.
 * Compaction happens when Claude hits context limits and summarizes the conversation.
 */
function detectCompactionEvents(messages: ParsedMessage[]): CompactionEvent[] {
  const events: CompactionEvent[] = [];
  let runningTokens = 0;
  let eventIndex = 0;

  for (const msg of messages) {
    const msgTokens = countTokens(extractTextContent(msg.content));
    const prevTokens = runningTokens;
    runningTokens += msgTokens;

    // Detect compaction: summary type or sudden drop in running usage
    if (msg.type === 'summary') {
      const text = extractTextContent(msg.content);
      const summaryTokens = countTokens(text);
      const delta = summaryTokens - prevTokens;

      events.push({
        index: eventIndex++,
        timestamp: msg.timestamp,
        tokensBefore: prevTokens,
        tokensAfter: summaryTokens,
        delta,
        text: text.slice(0, 200) + (text.length > 200 ? '...' : ''),
      });

      // Reset running count to summary size
      runningTokens = summaryTokens;
    }

    // Also detect when usage metadata shows a dramatic decrease
    if (msg.usage) {
      const totalUsage = msg.usage.input_tokens + msg.usage.output_tokens;
      if (prevTokens > 0 && totalUsage < prevTokens * 0.3) {
        // Usage dropped by >70% — likely a compaction
        const text = extractTextContent(msg.content);
        events.push({
          index: eventIndex++,
          timestamp: msg.timestamp,
          tokensBefore: prevTokens,
          tokensAfter: totalUsage,
          delta: totalUsage - prevTokens,
          text: `Context compacted (${prevTokens} → ${totalUsage} tokens)`,
        });
        runningTokens = totalUsage;
      }
    }
  }

  return events;
}

/**
 * Analyze a Claude Code session by session ID and workspace.
 * Returns a complete SessionAnalysis or null if session not found.
 */
export async function analyzeSession(sessionId: string, workspace?: string): Promise<SessionAnalysis | null> {
  const filePath = findSessionFile(sessionId, workspace);
  if (!filePath) {
    return null;
  }

  return analyzeSessionFile(filePath, sessionId);
}

/**
 * Analyze a Claude Code session from a file path.
 */
export async function analyzeSessionFile(filePath: string, sessionId: string): Promise<SessionAnalysis> {
  const messages = await parseJsonlFile(filePath);
  const mainMessages = messages.filter((m) => !m.agentId);

  const metrics = calculateMetrics(mainMessages);
  const chunks = buildChunks(messages);
  const tokenAttribution = computeTokenAttribution(mainMessages);
  const compactionEvents = detectCompactionEvents(mainMessages);
  const toolExecutions = buildToolExecutions(mainMessages);
  const toolExecutionSummary = buildToolExecutionSummary(toolExecutions);

  // Extract model from first assistant message
  const model = mainMessages.find((m) => m.type === 'assistant' && m.model)?.model;

  const timestamps = mainMessages.map((m) => m.timestamp).filter((t) => t > 0);
  const startTime = timestamps.length > 0 ? Math.min(...timestamps) : 0;
  const endTime = timestamps.length > 0 ? Math.max(...timestamps) : 0;

  // Derive project path from file path
  // e.g., ~/.claude/projects/-Users-foo-project/session.jsonl → /Users/foo/project
  const parts = filePath.split('/');
  const dirName = parts.length >= 2 ? parts[parts.length - 2] : '';
  const projectPath = dirName.startsWith('-') ? dirName.replace(/-/g, '/') : dirName;

  return {
    sessionId,
    projectPath,
    metrics,
    chunks,
    tokenAttribution,
    compactionEvents,
    toolExecutionSummary,
    messageCount: mainMessages.length,
    model,
    startTime,
    endTime,
  };
}
