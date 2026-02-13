/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { teamMonitorService } from '@process/services/teamMonitor/TeamMonitorService';
import WorkerManage from '@process/WorkerManage';

/**
 * Initialize team monitor IPC bridge handlers.
 * Forwards TeamMonitorService events to the renderer process.
 */
export function initTeamMonitorBridge(): void {
  // Forward service events to renderer via IPC
  teamMonitorService.on((event) => {
    switch (event.type) {
      case 'team_config':
        ipcBridge.teamMonitor.onTeamConfig.emit(event.data);
        break;
      case 'task_update':
        ipcBridge.teamMonitor.onTaskUpdate.emit(event.data);
        break;
      case 'agent_output':
        ipcBridge.teamMonitor.onAgentOutput.emit(event.data);
        break;
    }
  });

  // Lifecycle handlers
  ipcBridge.teamMonitor.start.provider(async ({ conversationId, teamName }) => {
    // Get workspace directory from the conversation/task
    let workspaceDir: string | undefined;
    try {
      const task = WorkerManage.getTaskById(conversationId);
      if (task && 'extra' in task && task.extra && typeof task.extra === 'object') {
        const extra = task.extra as { workspace?: string };
        workspaceDir = extra.workspace;
      }
    } catch (err) {
      console.warn('[TeamMonitorBridge] Could not get workspace for conversation:', err);
    }

    teamMonitorService.start(conversationId, teamName, workspaceDir);
    return { success: true };
  });

  ipcBridge.teamMonitor.stop.provider(async () => {
    teamMonitorService.stop();
    return { success: true };
  });

  // Query handlers
  ipcBridge.teamMonitor.getState.provider(async () => {
    const state = teamMonitorService.getTeamState();
    return { success: true, data: state };
  });

  ipcBridge.teamMonitor.getAgentOutputs.provider(async () => {
    const outputs = teamMonitorService.getAgentOutputs();
    return { success: true, data: outputs };
  });
}
