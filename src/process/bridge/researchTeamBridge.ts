/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { researchTeamManager, researchEventBus, feedStore } from '@process/services/researchTeam';

/**
 * Initialize Research Team IPC bridge handlers.
 * Forwards ResearchTeamManager + ResearchEventBus to the renderer,
 * and persists feed entries to the database.
 */
export function initResearchTeamBridge(): void {
  // Forward all feed entries (events + commands) to renderer
  researchEventBus.onFeed((entry) => {
    ipcBridge.researchTeam.onFeedEntry.emit(entry);

    // Persist to database (skip high-frequency agent_output chunks)
    if (entry.type !== 'agent_output') {
      try {
        feedStore.insert(entry);
      } catch {
        // Non-fatal: don't break the event flow
      }
    }
  });

  // ── Session lifecycle ──

  ipcBridge.researchTeam.startSession.provider(async (config) => {
    try {
      const session = await researchTeamManager.startSession(config);
      return { success: true, data: session };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcBridge.researchTeam.stopSession.provider(async ({ sessionId }) => {
    try {
      await researchTeamManager.stopSession(sessionId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // ── Agent management ──

  ipcBridge.researchTeam.addAgent.provider(async ({ sessionId, agent }) => {
    try {
      const result = await researchTeamManager.addAgent(sessionId, agent);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcBridge.researchTeam.stopAgent.provider(async ({ sessionId, agentId }) => {
    try {
      await researchTeamManager.stopAgent(sessionId, agentId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcBridge.researchTeam.sendMessageToAgent.provider(async ({ sessionId, agentId, content }) => {
    try {
      const sent = await researchTeamManager.sendMessageToAgent(sessionId, agentId, content);
      return { success: sent };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // ── Queries ──

  ipcBridge.researchTeam.getSession.provider(async ({ sessionId }) => {
    const session = researchTeamManager.getSession(sessionId);
    return { success: true, data: session };
  });

  ipcBridge.researchTeam.getSessions.provider(async ({ conversationId }) => {
    const sessions = researchTeamManager.getSessionsByConversation(conversationId);
    return { success: true, data: sessions };
  });

  // ── Feed ──

  ipcBridge.researchTeam.getFeed.provider(async ({ sessionId, filters }) => {
    try {
      // Try in-memory first, fall back to database
      let entries = researchTeamManager.queryFeed(sessionId, filters);
      if (entries.length === 0) {
        entries = feedStore.query(sessionId, filters);
      }
      return { success: true, data: entries };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
}
