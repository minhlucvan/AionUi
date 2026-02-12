/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { ITeamDefinition } from '@/common/team';
import { teamManager } from '@process/services/TeamManager';

/**
 * Initialize IPC bridge handlers for Agent Teams feature.
 * Team and task management is internal and automatic —
 * only session lifecycle and member management are exposed to the renderer.
 */
export function initTeamBridge(): void {
  // Create a new team session
  ipcBridge.team.createSession.provider(async (params: { definition: ITeamDefinition; workspace: string }) => {
    try {
      const session = await teamManager.createSession(params.definition, params.workspace);
      return { success: true, data: session };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[teamBridge] Failed to create session:', error);
      return { success: false, msg };
    }
  });

  // Destroy a team session
  ipcBridge.team.destroySession.provider(async (params: { sessionId: string }) => {
    try {
      await teamManager.destroySession(params.sessionId);
      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, msg };
    }
  });

  // Get a team session
  ipcBridge.team.getSession.provider(async (params: { sessionId: string }) => {
    try {
      const session = teamManager.getSession(params.sessionId);
      return { success: true, data: session };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, msg };
    }
  });

  // List all team sessions
  ipcBridge.team.listSessions.provider(async () => {
    try {
      const sessions = teamManager.getAllSessions();
      return { success: true, data: sessions };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, msg };
    }
  });

  // Shutdown a team member
  ipcBridge.team.shutdownMember.provider(async (params: { sessionId: string; memberId: string }) => {
    try {
      await teamManager.shutdownMember(params.sessionId, params.memberId);
      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, msg };
    }
  });
}
