/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { AgentOutput, TeamMember, TeamTask } from '@/common/teamMonitor';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/** Tab ID for the main chat view */
export const TEAM_TAB_CHAT = 'chat';
/** Tab ID for the tasks view */
export const TEAM_TAB_TASKS = 'tasks';

export interface TeamMonitorContextValue {
  /** Whether team monitoring is active */
  isTeamActive: boolean;
  /** Current team name */
  teamName: string | null;
  /** Team members from config */
  members: TeamMember[];
  /** Shared task list */
  tasks: TeamTask[];
  /** Per-agent output transcripts */
  agentOutputs: Map<string, AgentOutput>;
  /** Currently active tab ID ('chat', 'tasks', or agent name) */
  activeTab: string;
  /** Switch the active team tab */
  setActiveTab: (tabId: string) => void;
  /** Start monitoring a team conversation */
  startMonitoring: (conversationId: string, teamName?: string) => void;
  /** Stop monitoring */
  stopMonitoring: () => void;
  /** Activate team mode from ACP hook (dynamic detection) */
  activateFromHook: (conversationId: string) => void;
}

const TeamMonitorContext = createContext<TeamMonitorContextValue | null>(null);

export const TeamMonitorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isTeamActive, setIsTeamActive] = useState(false);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [agentOutputs, setAgentOutputs] = useState<Map<string, AgentOutput>>(new Map());
  const [activeTab, setActiveTab] = useState<string>(TEAM_TAB_CHAT);
  const conversationIdRef = useRef<string | null>(null);

  const startMonitoring = useCallback((conversationId: string, name?: string) => {
    conversationIdRef.current = conversationId;
    setIsTeamActive(true);
    setActiveTab(TEAM_TAB_CHAT);
    ipcBridge.teamMonitor.start.invoke({ conversationId, teamName: name }).catch((err) => {
      console.error('[TeamMonitor] Failed to start:', err);
    });
  }, []);

  const stopMonitoring = useCallback(() => {
    const cid = conversationIdRef.current;
    if (cid) {
      ipcBridge.teamMonitor.stop.invoke({ conversationId: cid }).catch(() => {});
    }
    conversationIdRef.current = null;
    setIsTeamActive(false);
    setTeamName(null);
    setMembers([]);
    setTasks([]);
    setAgentOutputs(new Map());
    setActiveTab(TEAM_TAB_CHAT);
  }, []);

  // Activate team mode from ACP hook (dynamic detection via tool calls)
  const activateFromHook = useCallback(
    (conversationId: string) => {
      if (isTeamActive) return; // Already active
      conversationIdRef.current = conversationId;
      setIsTeamActive(true);
      setActiveTab(TEAM_TAB_CHAT);
      ipcBridge.teamMonitor.start.invoke({ conversationId }).catch((err) => {
        console.error('[TeamMonitor] Failed to start from hook:', err);
      });
    },
    [isTeamActive]
  );

  // Subscribe to IPC events
  useEffect(() => {
    const unsubConfig = ipcBridge.teamMonitor.onTeamConfig.on((data) => {
      setTeamName(data.teamName);
      setMembers(data.members);
    });

    const unsubTasks = ipcBridge.teamMonitor.onTaskUpdate.on((data) => {
      setTeamName(data.teamName);
      setTasks(data.tasks);
    });

    const unsubAgent = ipcBridge.teamMonitor.onAgentOutput.on((data) => {
      setAgentOutputs((prev) => {
        const next = new Map(prev);
        next.set(data.agentName, data);
        return next;
      });
    });

    return () => {
      unsubConfig();
      unsubTasks();
      unsubAgent();
    };
  }, []);

  // Poll state when monitoring starts
  useEffect(() => {
    if (!isTeamActive) return;

    const pollState = () => {
      ipcBridge.teamMonitor.getState
        .invoke()
        .then((res) => {
          if (res.success && res.data) {
            setTeamName(res.data.teamName);
            setMembers(res.data.members);
            setTasks(res.data.tasks);
          }
        })
        .catch(() => {});

      ipcBridge.teamMonitor.getAgentOutputs
        .invoke()
        .then((res) => {
          if (res.success && res.data) {
            const map = new Map<string, AgentOutput>();
            for (const output of res.data) {
              map.set(output.agentName, output);
            }
            if (map.size > 0) {
              setAgentOutputs(map);
            }
          }
        })
        .catch(() => {});
    };

    pollState();
    const timer = setInterval(pollState, 5000);
    return () => clearInterval(timer);
  }, [isTeamActive]);

  return (
    <TeamMonitorContext.Provider
      value={{
        isTeamActive,
        teamName,
        members,
        tasks,
        agentOutputs,
        activeTab,
        setActiveTab,
        startMonitoring,
        stopMonitoring,
        activateFromHook,
      }}
    >
      {children}
    </TeamMonitorContext.Provider>
  );
};

export const useTeamMonitor = (): TeamMonitorContextValue => {
  const context = useContext(TeamMonitorContext);
  if (!context) {
    throw new Error('useTeamMonitor must be used within TeamMonitorProvider');
  }
  return context;
};

export const useTeamMonitorSafe = (): TeamMonitorContextValue | null => {
  return useContext(TeamMonitorContext);
};
