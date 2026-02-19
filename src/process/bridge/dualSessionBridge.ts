/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * IPC Bridge providers for the Dual Session system.
 *
 * Registers handlers for starting, stopping, and monitoring
 * dual-session runs from the renderer process.
 */

import { ipcBridge } from '../../common';
import { startDualSession, stopDualSession, getDualSessionProgress, listDualSessions } from '../services/DualSessionService';

export function initDualSessionBridge(): void {
  // Start a new dual-session run
  ipcBridge.dualSession.start.provider(async (params) => {
    try {
      const result = await startDualSession(params);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[DualSessionBridge] Failed to start dual session:', error);
      return {
        success: false,
        msg: errorMessage,
      };
    }
  });

  // Stop a running dual-session
  ipcBridge.dualSession.stop.provider(async ({ runId }) => {
    try {
      const stopped = stopDualSession(runId);
      if (!stopped) {
        return { success: false, msg: `No active dual-session with ID ${runId}` };
      }
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, msg: errorMessage };
    }
  });

  // Get progress of a running dual-session
  ipcBridge.dualSession.getProgress.provider(async ({ runId }) => {
    try {
      const progress = getDualSessionProgress(runId);
      return { success: true, data: progress };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, msg: errorMessage };
    }
  });

  // List all active dual-session runs
  ipcBridge.dualSession.list.provider(async () => {
    try {
      const runs = listDualSessions();
      return { success: true, data: runs };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, msg: errorMessage };
    }
  });
}
