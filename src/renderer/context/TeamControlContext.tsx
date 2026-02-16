/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { TeamSession, TeamEvent, TeamConfig } from '@process/services/teamControl/types';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type TeamControlContextValue = {
  /** Active sessions for the current conversation */
  sessions: TeamSession[];
  /** Live event stream */
  events: TeamEvent[];
  /** Start a new team session */
  startSession: (config: TeamConfig) => Promise<TeamSession | null>;
  /** Stop a running session */
  stopSession: (sessionId: string) => Promise<void>;
  /** Load sessions for a conversation */
  loadSessions: (conversationId: string) => void;
};

const TeamControlContext = createContext<TeamControlContextValue | null>(null);

export const TeamControlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessions, setSessions] = useState<TeamSession[]>([]);
  const [events, setEvents] = useState<TeamEvent[]>([]);

  const loadSessions = useCallback((conversationId: string) => {
    ipcBridge.teamControl.getSessions
      .invoke({ conversationId })
      .then((res) => {
        if (res.success && res.data) {
          setSessions(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const startSession = useCallback(async (config: TeamConfig): Promise<TeamSession | null> => {
    const res = await ipcBridge.teamControl.startSession.invoke(config);
    if (res.success && res.data) {
      setSessions((prev) => [...prev, res.data!]);
      return res.data;
    }
    return null;
  }, []);

  const stopSession = useCallback(async (sessionId: string) => {
    await ipcBridge.teamControl.stopSession.invoke({ sessionId });
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, status: 'completed' as const } : s)));
  }, []);

  // Subscribe to live events
  useEffect(() => {
    const unsub = ipcBridge.teamControl.onSessionEvent.on((event) => {
      setEvents((prev) => [...prev.slice(-99), event]); // Keep last 100 events

      // Update session state from events
      if (event.type === 'session_completed' || event.type === 'session_error') {
        ipcBridge.teamControl.getSession
          .invoke({ sessionId: event.sessionId })
          .then((res) => {
            if (res.success && res.data) {
              setSessions((prev) => prev.map((s) => (s.id === event.sessionId ? res.data! : s)));
            }
          })
          .catch(() => {});
      }
    });

    return () => unsub();
  }, []);

  return (
    <TeamControlContext.Provider value={{ sessions, events, startSession, stopSession, loadSessions }}>
      {children}
    </TeamControlContext.Provider>
  );
};

export const useTeamControl = (): TeamControlContextValue => {
  const context = useContext(TeamControlContext);
  if (!context) {
    throw new Error('useTeamControl must be used within TeamControlProvider');
  }
  return context;
};

export const useTeamControlSafe = (): TeamControlContextValue | null => {
  return useContext(TeamControlContext);
};
