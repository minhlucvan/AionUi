/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * IPC Bridge providers for the generic Multi-Agent system.
 */

import { ipcBridge } from '../../common';
import { startMultiAgentRun, stopMultiAgentRun, getMultiAgentProgress, listMultiAgentRuns } from '../services/MultiAgentService';

export function initMultiAgentBridge(): void {
  ipcBridge.multiAgent.start.provider(async (params) => {
    try {
      const result = await startMultiAgentRun(params);
      return { success: true, data: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[MultiAgentBridge] Failed to start multi-agent run:', error);
      return { success: false, msg: errorMessage };
    }
  });

  ipcBridge.multiAgent.stop.provider(async ({ runId }) => {
    try {
      const stopped = stopMultiAgentRun(runId);
      if (!stopped) {
        return { success: false, msg: `No active multi-agent run with ID ${runId}` };
      }
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, msg: errorMessage };
    }
  });

  ipcBridge.multiAgent.getProgress.provider(async ({ runId }) => {
    try {
      const progress = getMultiAgentProgress(runId);
      return { success: true, data: progress };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, msg: errorMessage };
    }
  });

  ipcBridge.multiAgent.list.provider(async () => {
    try {
      const runs = listMultiAgentRuns();
      return { success: true, data: runs };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, msg: errorMessage };
    }
  });
}
