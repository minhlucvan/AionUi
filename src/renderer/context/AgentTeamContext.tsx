/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IAgentTeamDefinition, IAgentTeamMemberDefinition, IAgentTeamSession } from '@/common/agentTeam';
import { ipcBridge } from '@/common';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export interface AgentTeamContextValue {
  /** The active team session */
  session: IAgentTeamSession;
  /** The team definition used to create this session */
  definition: IAgentTeamDefinition;
  /** Currently active member tab */
  activeMemberId: string;
  /** Conversation ID for the active member */
  activeConversationId: string;

  /** Switch the active member tab */
  switchMember: (memberId: string) => void;

  /** Refresh session data from backend */
  refreshSession: () => Promise<void>;

  /** Destroy the team session */
  destroyTeam: () => Promise<void>;
}

const AgentTeamContext = createContext<AgentTeamContextValue | null>(null);

export const AgentTeamProvider: React.FC<{
  session: IAgentTeamSession;
  definition: IAgentTeamDefinition;
  children: React.ReactNode;
}> = ({ session: initialSession, definition, children }: { session: IAgentTeamSession; definition: IAgentTeamDefinition; children: React.ReactNode }) => {
  const [session, setSession] = useState<IAgentTeamSession>(initialSession);
  const [activeMemberId, setActiveMemberId] = useState<string>(() => {
    // Default to lead member, or first member
    const leadMember = definition.members.find((m: IAgentTeamMemberDefinition) => m.role === 'lead');
    return leadMember?.id || definition.members[0]?.id || '';
  });

  const activeConversationId = session.memberConversations[activeMemberId] || '';

  const switchMember = useCallback((memberId: string) => {
    setActiveMemberId(memberId);
  }, []);

  const refreshSession = useCallback(async () => {
    const result = await ipcBridge.agentTeam.getSession.invoke({ sessionId: session.id });
    if (result.success && result.data) {
      setSession(result.data);
    }
  }, [session.id]);

  const destroyTeam = useCallback(async () => {
    await ipcBridge.agentTeam.destroySession.invoke({ sessionId: session.id });
  }, [session.id]);

  // Listen for session updates
  useEffect(() => {
    const unsub = ipcBridge.agentTeam.sessionUpdated.on((updatedSession: IAgentTeamSession) => {
      if (updatedSession.id === session.id) {
        setSession(updatedSession);
      }
    });
    return unsub;
  }, [session.id]);

  return (
    <AgentTeamContext.Provider
      value={{
        session,
        definition,
        activeMemberId,
        activeConversationId,
        switchMember,
        refreshSession,
        destroyTeam,
      }}
    >
      {children}
    </AgentTeamContext.Provider>
  );
};

export function useAgentTeamContext(): AgentTeamContextValue {
  const context = useContext(AgentTeamContext);
  if (!context) {
    throw new Error('useAgentTeamContext must be used within AgentTeamProvider');
  }
  return context;
}
