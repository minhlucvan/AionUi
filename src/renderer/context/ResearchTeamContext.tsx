/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { FeedEntry, ResearchSession, ResearchSessionConfig, ResearchAgentConfig } from '@/common/ipcBridge';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export type ResearchTeamContextValue = {
  /** Whether a research team session is active */
  isActive: boolean;
  /** Current session (null when idle) */
  session: ResearchSession | null;
  /** Chronological feed of all events and commands */
  feed: FeedEntry[];
  /** Start a new research team session */
  startSession: (config: ResearchSessionConfig) => Promise<ResearchSession | null>;
  /** Stop the current session */
  stopSession: () => Promise<void>;
  /** Add an agent to the running session */
  addAgent: (agent: ResearchAgentConfig) => Promise<void>;
  /** Stop a specific agent */
  stopAgent: (agentId: string) => Promise<void>;
  /** Send a message to a specific agent */
  sendMessage: (agentId: string, content: string) => Promise<void>;
  /** Refresh session state from the main process */
  refreshSession: () => void;
};

const ResearchTeamContext = createContext<ResearchTeamContextValue | null>(null);

export const ResearchTeamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<ResearchSession | null>(null);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const sessionIdRef = useRef<string | null>(null);

  const isActive = session !== null && (session.status === 'running' || session.status === 'paused');

  const startSession = useCallback(async (config: ResearchSessionConfig): Promise<ResearchSession | null> => {
    const res = await ipcBridge.researchTeam.startSession.invoke(config);
    if (res.success && res.data) {
      sessionIdRef.current = res.data.id;
      setSession(res.data);
      setFeed([]);
      return res.data;
    }
    return null;
  }, []);

  const stopSession = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    await ipcBridge.researchTeam.stopSession.invoke({ sessionId: sid });
    sessionIdRef.current = null;

    // Fetch final state
    const res = await ipcBridge.researchTeam.getSession.invoke({ sessionId: sid });
    if (res.success && res.data) {
      setSession(res.data);
    }
  }, []);

  const addAgent = useCallback(async (agent: ResearchAgentConfig) => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    const res = await ipcBridge.researchTeam.addAgent.invoke({ sessionId: sid, agent });
    if (res.success) {
      // Refresh session to pick up new agent
      const sessionRes = await ipcBridge.researchTeam.getSession.invoke({ sessionId: sid });
      if (sessionRes.success && sessionRes.data) {
        setSession(sessionRes.data);
      }
    }
  }, []);

  const stopAgent = useCallback(async (agentId: string) => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    await ipcBridge.researchTeam.stopAgent.invoke({ sessionId: sid, agentId });
    // Refresh session
    const res = await ipcBridge.researchTeam.getSession.invoke({ sessionId: sid });
    if (res.success && res.data) {
      setSession(res.data);
    }
  }, []);

  const sendMessage = useCallback(async (agentId: string, content: string) => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    await ipcBridge.researchTeam.sendMessageToAgent.invoke({ sessionId: sid, agentId, content });
  }, []);

  const refreshSession = useCallback(() => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    ipcBridge.researchTeam.getSession
      .invoke({ sessionId: sid })
      .then((res) => {
        if (res.success && res.data) {
          setSession(res.data);
        }
      })
      .catch(() => {});
  }, []);

  // Subscribe to live feed entries from the main process
  useEffect(() => {
    const unsub = ipcBridge.researchTeam.onFeedEntry.on((entry) => {
      const sid = sessionIdRef.current;
      if (!sid || entry.sessionId !== sid) return;

      setFeed((prev) => [...prev, entry]);

      // Update session state on lifecycle events
      if (
        entry.type === 'session_completed' ||
        entry.type === 'session_error' ||
        entry.type === 'agent_started' ||
        entry.type === 'agent_finished' ||
        entry.type === 'agent_error'
      ) {
        ipcBridge.researchTeam.getSession
          .invoke({ sessionId: sid })
          .then((res) => {
            if (res.success && res.data) {
              setSession(res.data);
            }
          })
          .catch(() => {});
      }
    });

    return () => unsub();
  }, []);

  return (
    <ResearchTeamContext.Provider
      value={{
        isActive,
        session,
        feed,
        startSession,
        stopSession,
        addAgent,
        stopAgent,
        sendMessage,
        refreshSession,
      }}
    >
      {children}
    </ResearchTeamContext.Provider>
  );
};

export const useResearchTeam = (): ResearchTeamContextValue => {
  const context = useContext(ResearchTeamContext);
  if (!context) {
    throw new Error('useResearchTeam must be used within ResearchTeamProvider');
  }
  return context;
};

export const useResearchTeamSafe = (): ResearchTeamContextValue | null => {
  return useContext(ResearchTeamContext);
};
