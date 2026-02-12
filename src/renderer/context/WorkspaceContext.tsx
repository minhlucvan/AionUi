/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { ICreateWorkspaceParams, IUpdateWorkspaceParams, IWorkspace } from '@/common/types/workspace';
import { addEventListener, emitter } from '@/renderer/utils/emitter';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const ACTIVE_WORKSPACE_KEY = 'aionui_active_workspace_id';

type WorkspaceContextValue = {
  /** All workspaces belonging to the user */
  workspaces: IWorkspace[];
  /** Currently explicitly-selected workspace (null = default) */
  activeWorkspace: IWorkspace | null;
  /** The default (home) workspace — always exists after initial load */
  defaultWorkspace: IWorkspace | null;
  /** The workspace that is currently effective: activeWorkspace ?? defaultWorkspace */
  effectiveWorkspace: IWorkspace | null;
  /** Switch to a workspace or null (use default) */
  setActiveWorkspace: (workspace: IWorkspace | null) => void;
  /** Mark a workspace as the default */
  setDefaultWorkspace: (id: string) => Promise<void>;
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
  const defaultCreatedRef = useRef(false);

  const fetchWorkspaces = useCallback(() => {
    return ipcBridge.workspace.list
      .invoke({ page: 0, pageSize: 1000 })
      .then((data) => {
        setWorkspaces(data || []);
        setLoaded(true);
        return data || [];
      })
      .catch((error) => {
        console.error('[WorkspaceContext] Failed to load workspaces:', error);
        setWorkspaces([]);
        setLoaded(true);
        return [] as IWorkspace[];
      });
  }, []);

  // Initial load + auto-create default workspace if none exist
  useEffect(() => {
    void fetchWorkspaces().then((data) => {
      if (data.length === 0 && !defaultCreatedRef.current) {
        defaultCreatedRef.current = true;
        // Auto-create default workspace using home directory
        void ipcBridge.application.getHomePath
          .invoke()
          .then((homePath) => {
            return ipcBridge.workspace.create.invoke({
              name: 'Home',
              path: homePath,
              icon: '🏠',
              config: { isDefault: true },
            });
          })
          .then(() => {
            void fetchWorkspaces();
          })
          .catch((error) => {
            console.error('[WorkspaceContext] Failed to auto-create default workspace:', error);
          });
      }
    });
  }, [fetchWorkspaces]);

  // Listen for workspace refresh events
  useEffect(() => {
    return addEventListener('workspace.refresh', () => {
      void fetchWorkspaces();
    });
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

  const defaultWorkspace = useMemo(() => {
    return workspaces.find((ws) => ws.config?.isDefault === true) ?? null;
  }, [workspaces]);

  const effectiveWorkspace = useMemo(() => {
    return activeWorkspace ?? defaultWorkspace;
  }, [activeWorkspace, defaultWorkspace]);

  const setActiveWorkspace = useCallback(
    (workspace: IWorkspace | null) => {
      setActiveWorkspaceId(workspace?.id ?? null);
      // Emit with the effective workspace (fallback to default)
      const effective = workspace ?? defaultWorkspace;
      emitter.emit('workspace.changed', effective);
    },
    [defaultWorkspace]
  );

  const setDefaultWorkspace = useCallback(
    async (id: string) => {
      // Unset previous default
      if (defaultWorkspace && defaultWorkspace.id !== id) {
        const prevConfig = { ...defaultWorkspace.config };
        delete prevConfig.isDefault;
        await ipcBridge.workspace.update.invoke({
          id: defaultWorkspace.id,
          updates: { config: prevConfig },
        });
      }
      // Set new default
      const target = workspaces.find((ws) => ws.id === id);
      if (target) {
        await ipcBridge.workspace.update.invoke({
          id,
          updates: { config: { ...target.config, isDefault: true } },
        });
      }
      await fetchWorkspaces();
    },
    [defaultWorkspace, workspaces, fetchWorkspaces]
  );

  const createWorkspace = useCallback(
    async (params: ICreateWorkspaceParams): Promise<IWorkspace> => {
      console.log('[WorkspaceContext] createWorkspace called with:', params);
      const ws = await ipcBridge.workspace.create.invoke(params);
      console.log('[WorkspaceContext] Workspace created via IPC:', ws);
      await fetchWorkspaces();
      console.log('[WorkspaceContext] Workspaces refreshed');
      return ws;
    },
    [fetchWorkspaces]
  );

  const updateWorkspace = useCallback(
    async (params: IUpdateWorkspaceParams): Promise<boolean> => {
      const success = await ipcBridge.workspace.update.invoke(params);
      if (success) {
        await fetchWorkspaces();
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
        await fetchWorkspaces();
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
      defaultWorkspace,
      effectiveWorkspace,
      setActiveWorkspace,
      setDefaultWorkspace,
      createWorkspace,
      updateWorkspace,
      deleteWorkspace,
      refreshWorkspaces: () => {
        void fetchWorkspaces();
      },
      loaded,
    }),
    [workspaces, activeWorkspace, defaultWorkspace, effectiveWorkspace, setActiveWorkspace, setDefaultWorkspace, createWorkspace, updateWorkspace, deleteWorkspace, fetchWorkspaces, loaded]
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
