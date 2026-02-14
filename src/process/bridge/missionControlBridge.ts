/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { missionSyncService } from '@process/services/missionControl';

/**
 * Initialize Mission Control IPC bridge handlers.
 * Forwards MissionSyncService events to the renderer process.
 */
export function initMissionControlBridge(): void {
  // Forward service events to renderer via IPC
  missionSyncService.on((event) => {
    switch (event.type) {
      case 'missions_synced':
        ipcBridge.missionControl.onMissionsSync.emit(event.data);
        break;
      case 'mission_updated':
        ipcBridge.missionControl.onMissionUpdate.emit(event.data);
        break;
    }
  });

  // Query handlers
  ipcBridge.missionControl.getMissions.provider(async ({ conversationId }) => {
    const missions = missionSyncService.getMissions(conversationId);
    return { success: true, data: missions };
  });

  ipcBridge.missionControl.getTeamMissions.provider(async ({ conversationId, teamName }) => {
    const missions = missionSyncService.getTeamMissions(conversationId, teamName);
    return { success: true, data: missions };
  });

  ipcBridge.missionControl.getMission.provider(async ({ id }) => {
    const mission = missionSyncService.getMission(id);
    return { success: true, data: mission };
  });
}
