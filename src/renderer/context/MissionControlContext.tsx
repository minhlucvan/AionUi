/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { Mission } from '@process/services/missionControl/types';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export type MissionControlContextValue = {
  /** All missions for the current conversation */
  missions: Mission[];
  /** Whether missions have been loaded at least once */
  loaded: boolean;
  /** Load missions for a conversation (call when conversation changes) */
  loadMissions: (conversationId: string) => void;
  /** Clear missions (call when leaving a conversation) */
  clearMissions: () => void;
};

const MissionControlContext = createContext<MissionControlContextValue | null>(null);

export const MissionControlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loaded, setLoaded] = useState(false);
  const conversationIdRef = useRef<string | null>(null);

  const loadMissions = useCallback((conversationId: string) => {
    conversationIdRef.current = conversationId;
    ipcBridge.missionControl.getMissions
      .invoke({ conversationId })
      .then((res) => {
        if (res.success && res.data) {
          setMissions(res.data);
          setLoaded(true);
        }
      })
      .catch(() => {});
  }, []);

  const clearMissions = useCallback(() => {
    conversationIdRef.current = null;
    setMissions([]);
    setLoaded(false);
  }, []);

  // Subscribe to IPC events
  useEffect(() => {
    const unsubSync = ipcBridge.missionControl.onMissionsSync.on((data) => {
      setMissions(data.missions);
      setLoaded(true);
    });

    const unsubUpdate = ipcBridge.missionControl.onMissionUpdate.on((updated) => {
      setMissions((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    });

    return () => {
      unsubSync();
      unsubUpdate();
    };
  }, []);

  return (
    <MissionControlContext.Provider value={{ missions, loaded, loadMissions, clearMissions }}>
      {children}
    </MissionControlContext.Provider>
  );
};

export const useMissionControl = (): MissionControlContextValue => {
  const context = useContext(MissionControlContext);
  if (!context) {
    throw new Error('useMissionControl must be used within MissionControlProvider');
  }
  return context;
};

export const useMissionControlSafe = (): MissionControlContextValue | null => {
  return useContext(MissionControlContext);
};
