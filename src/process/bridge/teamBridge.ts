/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { ITeamDefinition, ITeamSession, ITeamTask } from '@/common/team';
import { teamManager } from '@process/services/TeamManager';

/**
 * Initialize IPC bridge handlers for Agent Teams feature
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

  // Send cross-member message
  ipcBridge.team.sendMessage.provider(async (params: { sessionId: string; fromMemberId: string; toMemberId: string; content: string }) => {
    try {
      await teamManager.sendTeamMessage(params.sessionId, params.fromMemberId, params.toMemberId, params.content);
      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, msg };
    }
  });

  // Broadcast message to all members
  ipcBridge.team.broadcastMessage.provider(async (params: { sessionId: string; fromMemberId: string; content: string }) => {
    try {
      await teamManager.broadcastTeamMessage(params.sessionId, params.fromMemberId, params.content);
      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, msg };
    }
  });

  // Add task
  ipcBridge.team.addTask.provider(async (params: { sessionId: string; title: string; description?: string; assigneeId?: string }) => {
    try {
      const task = teamManager.addTask(params.sessionId, params.title, params.description, params.assigneeId);
      return { success: true, data: task };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, msg };
    }
  });

  // Update task
  ipcBridge.team.updateTask.provider(async (params: { sessionId: string; taskId: string; updates: Partial<Pick<ITeamTask, 'title' | 'description' | 'assigneeId' | 'status'>> }) => {
    try {
      const task = teamManager.updateTask(params.sessionId, params.taskId, params.updates);
      return { success: true, data: task };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, msg };
    }
  });

  // Get tasks
  ipcBridge.team.getTasks.provider(async (params: { sessionId: string }) => {
    try {
      const tasks = teamManager.getTasks(params.sessionId);
      return { success: true, data: tasks };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, msg };
    }
  });
}
