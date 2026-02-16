/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { teamOrchestrator, teamEventBus } from '@process/services/teamControl';

/**
 * Initialize Team Control IPC bridge handlers.
 * Forwards TeamOrchestrator + TeamEventBus to the renderer.
 */
export function initTeamControlBridge(): void {
  // Forward all team events to renderer
  teamEventBus.onTeamEvent((event) => {
    ipcBridge.teamControl.onSessionEvent.emit(event);
  });

  // Lifecycle
  ipcBridge.teamControl.startSession.provider(async (config) => {
    try {
      const session = await teamOrchestrator.startSession(config);
      return { success: true, data: session };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcBridge.teamControl.stopSession.provider(async ({ sessionId }) => {
    await teamOrchestrator.stopSession(sessionId);
    return { success: true };
  });

  // Queries
  ipcBridge.teamControl.getSession.provider(async ({ sessionId }) => {
    const session = teamOrchestrator.getSession(sessionId);
    return { success: true, data: session };
  });

  ipcBridge.teamControl.getSessions.provider(async ({ conversationId }) => {
    const sessions = teamOrchestrator.getSessionsByConversation(conversationId);
    return { success: true, data: sessions };
  });
}
