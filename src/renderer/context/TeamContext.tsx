/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ITeamDefinition, ITeamMemberDefinition, ITeamSession } from '@/common/team';
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

  const activeConversationId = session.memberConversations[activeMemberId] || '';

  const switchMember = useCallback((memberId: string) => {
    setActiveMemberId(memberId);
  }, []);

  const refreshSession = useCallback(async () => {
    const result = await ipcBridge.team.getSession.invoke({ sessionId: session.id });
    if (result.success && result.data) {
      setSession(result.data);
    }
  }, [session.id]);

  const destroyTeam = useCallback(async () => {
    await ipcBridge.team.destroySession.invoke({ sessionId: session.id });
  }, [session.id]);

  // Listen for session updates
  useEffect(() => {
    const unsub = ipcBridge.team.sessionUpdated.on((updatedSession: ITeamSession) => {
      if (updatedSession.id === session.id) {
        setSession(updatedSession);
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
