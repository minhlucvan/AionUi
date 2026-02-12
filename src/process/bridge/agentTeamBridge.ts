/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { IAgentTeamDefinition } from '@/common/agentTeam';
import { agentTeamManager } from '@process/services/AgentTeamManager';

/**
 * Initialize IPC bridge handlers for Agent Teams feature.
 * Team and task management is internal and automatic —
 * only session lifecycle and member management are exposed to the renderer.
 */
export function initAgentTeamBridge(): void {
  // Create a new team session
  ipcBridge.agentTeam.createSession.provider(async (params: { definition: IAgentTeamDefinition; workspace: string }) => {
    try {
      const session = await agentTeamManager.createSession(params.definition, params.workspace);
      return { success: true, data: session };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[agentTeamBridge] Failed to create session:', error);
      return { success: false, msg };
    }
  });

  // Destroy a team session
  ipcBridge.agentTeam.destroySession.provider(async (params: { sessionId: string }) => {
    try {
      await agentTeamManager.destroySession(params.sessionId);
      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, msg };
    }
  });

  // Get a team session
  ipcBridge.agentTeam.getSession.provider(async (params: { sessionId: string }) => {
    try {
      const session = agentTeamManager.getSession(params.sessionId);
      return { success: true, data: session };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, msg };
    }
  });

  // List all team sessions
  ipcBridge.agentTeam.listSessions.provider(async () => {
    try {
      const sessions = agentTeamManager.getAllSessions();
      return { success: true, data: sessions };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, msg };
    }
  });

  // Shutdown a team member
  ipcBridge.agentTeam.shutdownMember.provider(async (params: { sessionId: string; memberId: string }) => {
    try {
      await agentTeamManager.shutdownMember(params.sessionId, params.memberId);
      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, msg };
    }
  });
}
