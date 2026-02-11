/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { ICreateWorkspaceParams, IUpdateWorkspaceParams, IWorkspace } from '@/common/types/workspace';
import { addEventListener, emitter } from '@/renderer/utils/emitter';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ACTIVE_WORKSPACE_KEY = 'aionui_active_workspace_id';

type WorkspaceContextValue = {
  /** All workspaces belonging to the user */
  workspaces: IWorkspace[];
  /** Currently active workspace (null = "All Conversations" view) */
  activeWorkspace: IWorkspace | null;
  /** Switch to a workspace or null (all conversations) */
  setActiveWorkspace: (workspace: IWorkspace | null) => void;
  /** Create a new workspace */
  createWorkspace: (params: ICreateWorkspaceParams) => Promise<IWorkspace>;
  /** Update an existing workspace */
  updateWorkspace: (params: IUpdateWorkspaceParams) => Promise<boolean>;
  /** Delete a workspace */
  deleteWorkspace: (id: string) => Promise<boolean>;
  /** Re-fetch workspace list */
  refreshWorkspaces: () => void;
  /** Whether workspaces have been loaded */
  loaded: boolean;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export const WorkspaceProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [workspaces, setWorkspaces] = useState<IWorkspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ACTIVE_WORKSPACE_KEY) || null;
    } catch {
      return null;
    }
  });
  const [loaded, setLoaded] = useState(false);

  const fetchWorkspaces = useCallback(() => {
    ipcBridge.workspace.list
      .invoke({ page: 0, pageSize: 1000 })
      .then((data) => {
        setWorkspaces(data || []);
        setLoaded(true);
      })
      .catch((error) => {
        console.error('[WorkspaceContext] Failed to load workspaces:', error);
        setWorkspaces([]);
        setLoaded(true);
      });
  }, []);

  // Initial load
  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  // Listen for workspace refresh events
  useEffect(() => {
    return addEventListener('workspace.refresh', fetchWorkspaces);
  }, [fetchWorkspaces]);

  // Persist active workspace
  useEffect(() => {
    try {
      if (activeWorkspaceId) {
        localStorage.setItem(ACTIVE_WORKSPACE_KEY, activeWorkspaceId);
      } else {
        localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, [activeWorkspaceId]);

  const activeWorkspace = useMemo(() => {
    if (!activeWorkspaceId) return null;
    return workspaces.find((ws) => ws.id === activeWorkspaceId) ?? null;
  }, [workspaces, activeWorkspaceId]);

  const setActiveWorkspace = useCallback((workspace: IWorkspace | null) => {
    setActiveWorkspaceId(workspace?.id ?? null);
    emitter.emit('workspace.changed', workspace);
  }, []);

  const createWorkspace = useCallback(
    async (params: ICreateWorkspaceParams): Promise<IWorkspace> => {
      const ws = await ipcBridge.workspace.create.invoke(params);
      fetchWorkspaces();
      return ws;
    },
    [fetchWorkspaces]
  );

  const updateWorkspace = useCallback(
    async (params: IUpdateWorkspaceParams): Promise<boolean> => {
      const success = await ipcBridge.workspace.update.invoke(params);
      if (success) {
        fetchWorkspaces();
      }
      return success;
    },
    [fetchWorkspaces]
  );

  const deleteWorkspace = useCallback(
    async (id: string): Promise<boolean> => {
      const success = await ipcBridge.workspace.delete.invoke({ id });
      if (success) {
        // If deleting the active workspace, clear selection
        if (activeWorkspaceId === id) {
          setActiveWorkspaceId(null);
        }
        fetchWorkspaces();
        emitter.emit('chat.history.refresh');
      }
      return success;
    },
    [activeWorkspaceId, fetchWorkspaces]
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspaces,
      activeWorkspace,
      setActiveWorkspace,
      createWorkspace,
      updateWorkspace,
      deleteWorkspace,
      refreshWorkspaces: fetchWorkspaces,
      loaded,
    }),
    [workspaces, activeWorkspace, setActiveWorkspace, createWorkspace, updateWorkspace, deleteWorkspace, fetchWorkspaces, loaded]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export function useWorkspaceContext(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspaceContext must be used within a WorkspaceProvider');
  }
  return context;
}
