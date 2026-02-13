/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { teamMonitorService } from '@process/services/teamMonitor/TeamMonitorService';

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
    teamMonitorService.start(conversationId, teamName);
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
