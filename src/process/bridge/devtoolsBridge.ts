/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DevTools IPC bridge — handles session analysis requests from the renderer.
 */

import * as ipcBridge from '@/common/ipcBridge';
import { analyzeSession, listSessionFiles } from '../services/devtools';

export function initDevToolsBridge(): void {
  // Analyze a specific Claude Code session
  ipcBridge.devtools.analyzeSession.provider(async ({ sessionId, workspace }) => {
    try {
      const analysis = await analyzeSession(sessionId, workspace);
      if (!analysis) {
        return {
          success: false,
          msg: `Session "${sessionId}" not found. Ensure Claude Code session logs exist in ~/.claude/projects/.`,
        };
      }

      return {
        success: true,
        data: {
          sessionId: analysis.sessionId,
          projectPath: analysis.projectPath,
          metrics: analysis.metrics,
          tokenAttribution: analysis.tokenAttribution,
          compactionEvents: analysis.compactionEvents,
          toolExecutionSummary: analysis.toolExecutionSummary,
          messageCount: analysis.messageCount,
          model: analysis.model,
          startTime: analysis.startTime,
          endTime: analysis.endTime,
          chunks: JSON.stringify(analysis.chunks),
        },
      };
    } catch (error) {
      console.error('[DevTools] Failed to analyze session:', error);
      return {
        success: false,
        msg: `Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  });

  // List available session files
  ipcBridge.devtools.listSessions.provider(async ({ workspace }) => {
    try {
      const sessions = listSessionFiles(workspace);
      return {
        success: true,
        data: sessions,
      };
    } catch (error) {
      console.error('[DevTools] Failed to list sessions:', error);
      return {
        success: false,
        msg: `Failed to list sessions: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  });
}
