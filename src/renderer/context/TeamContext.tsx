/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ITeamDefinition, ITeamMemberDefinition, ITeamSession, ITeamTask } from '@/common/team';
import { ipcBridge } from '@/common';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export interface TeamContextValue {
  /** The active team session */
  session: ITeamSession;
  /** The team definition used to create this session */
  definition: ITeamDefinition;
  /** Currently active member tab */
  activeMemberId: string;
  /** Conversation ID for the active member */
  activeConversationId: string;

  /** Switch the active member tab */
  switchMember: (memberId: string) => void;

  /** Shared task list */
  tasks: ITeamTask[];
  /** Add a new task */
  addTask: (title: string, description?: string, assigneeId?: string) => Promise<void>;
  /** Update an existing task */
  updateTask: (taskId: string, updates: Partial<Pick<ITeamTask, 'title' | 'description' | 'assigneeId' | 'status'>>) => Promise<void>;

  /** Send a message from one member to another */
  sendTeamMessage: (fromMemberId: string, toMemberId: string, content: string) => Promise<void>;
  /** Broadcast a message from one member to all others */
  broadcastMessage: (fromMemberId: string, content: string) => Promise<void>;

  /** Refresh session data from backend */
  refreshSession: () => Promise<void>;

  /** Destroy the team session */
  destroyTeam: () => Promise<void>;
}

const TeamContext = createContext<TeamContextValue | null>(null);

export const TeamProvider: React.FC<{
  session: ITeamSession;
  definition: ITeamDefinition;
  children: React.ReactNode;
}> = ({ session: initialSession, definition, children }: { session: ITeamSession; definition: ITeamDefinition; children: React.ReactNode }) => {
  const [session, setSession] = useState<ITeamSession>(initialSession);
  const [activeMemberId, setActiveMemberId] = useState<string>(() => {
    // Default to lead member, or first member
    const leadMember = definition.members.find((m: ITeamMemberDefinition) => m.role === 'lead');
    return leadMember?.id || definition.members[0]?.id || '';
  });
  const [tasks, setTasks] = useState<ITeamTask[]>(initialSession.tasks);

  const activeConversationId = session.memberConversations[activeMemberId] || '';

  const switchMember = useCallback((memberId: string) => {
    setActiveMemberId(memberId);
  }, []);

  const refreshSession = useCallback(async () => {
    const result = await ipcBridge.team.getSession.invoke({ sessionId: session.id });
    if (result.success && result.data) {
      setSession(result.data);
      setTasks(result.data.tasks);
    }
  }, [session.id]);

  const addTask = useCallback(
    async (title: string, description?: string, assigneeId?: string) => {
      const result = await ipcBridge.team.addTask.invoke({
        sessionId: session.id,
        title,
        description,
        assigneeId,
      });
      if (result.success && result.data) {
        setTasks((prev: ITeamTask[]) => [...prev, result.data!]);
      }
    },
    [session.id]
  );

  const updateTask = useCallback(
    async (taskId: string, updates: Partial<Pick<ITeamTask, 'title' | 'description' | 'assigneeId' | 'status'>>) => {
      const result = await ipcBridge.team.updateTask.invoke({
        sessionId: session.id,
        taskId,
        updates,
      });
      if (result.success && result.data) {
        setTasks((prev: ITeamTask[]) => prev.map((t: ITeamTask) => (t.id === taskId ? result.data! : t)));
      }
    },
    [session.id]
  );

  const sendTeamMessage = useCallback(
    async (fromMemberId: string, toMemberId: string, content: string) => {
      await ipcBridge.team.sendMessage.invoke({
        sessionId: session.id,
        fromMemberId,
        toMemberId,
        content,
      });
    },
    [session.id]
  );

  const broadcastMessage = useCallback(
    async (fromMemberId: string, content: string) => {
      await ipcBridge.team.broadcastMessage.invoke({
        sessionId: session.id,
        fromMemberId,
        content,
      });
    },
    [session.id]
  );

  const destroyTeam = useCallback(async () => {
    await ipcBridge.team.destroySession.invoke({ sessionId: session.id });
  }, [session.id]);

  // Listen for task updates
  useEffect(() => {
    const unsub = ipcBridge.team.taskUpdated.on((data: { sessionId: string; task: ITeamTask }) => {
      if (data.sessionId === session.id) {
        setTasks((prev: ITeamTask[]) => {
          const idx = prev.findIndex((t: ITeamTask) => t.id === data.task.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = data.task;
            return updated;
          }
          return [...prev, data.task];
        });
      }
    });
    return unsub;
  }, [session.id]);

  // Listen for session updates
  useEffect(() => {
    const unsub = ipcBridge.team.sessionUpdated.on((updatedSession: ITeamSession) => {
      if (updatedSession.id === session.id) {
        setSession(updatedSession);
        setTasks(updatedSession.tasks);
      }
    });
    return unsub;
  }, [session.id]);

  return (
    <TeamContext.Provider
      value={{
        session,
        definition,
        activeMemberId,
        activeConversationId,
        switchMember,
        tasks,
        addTask,
        updateTask,
        sendTeamMessage,
        broadcastMessage,
        refreshSession,
        destroyTeam,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
};

export function useTeamContext(): TeamContextValue {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeamContext must be used within TeamProvider');
  }
  return context;
}
