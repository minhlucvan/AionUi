/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { WorkspacePreviewConfig } from '@/common/types/app';
import { useConversationContextSafe } from '@/renderer/context/ConversationContext';
import { useCallback, useEffect, useState } from 'react';
import { usePreviewContext } from '../context/PreviewContext';

/**
 * Hook for workspace preview - detects .aionui/preview.json and provides
 * a function to launch the project's dev server as a live preview.
 */
export function useWorkspacePreview() {
  const conversationCtx = useConversationContextSafe();
  const { openPreview } = usePreviewContext();
  const workspace = conversationCtx?.workspace;

  const [config, setConfig] = useState<WorkspacePreviewConfig | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if workspace has a preview config
  useEffect(() => {
    if (!workspace) {
      setConfig(null);
      return;
    }

    ipcBridge.app.getWorkspaceConfig.invoke({ workspace }).then(setConfig).catch(() => setConfig(null));
  }, [workspace]);

  // Launch workspace preview
  const openWorkspacePreview = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);

    try {
      const session = await ipcBridge.app.openWorkspace.invoke({ workspace });
      openPreview('', 'app', {
        appUrl: session.url,
        appInstanceId: session.sessionId,
        appName: config?.name || 'Workspace Preview',
        workspace,
      });
    } catch (err) {
      console.error('[WorkspacePreview] Failed to open:', err);
    } finally {
      setLoading(false);
    }
  }, [workspace, config, openPreview]);

  return {
    /** Whether the current workspace has a preview config */
    hasPreview: !!config,
    /** The workspace preview config */
    config,
    /** Whether the server is being started */
    loading,
    /** Launch the workspace dev server and show in preview panel */
    openWorkspacePreview,
  };
}
