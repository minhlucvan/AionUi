/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '../../common';
import { loadClaudeCodeWorkspace } from '@/claudecode/WorkspaceLoader';
import path from 'path';
import { app } from 'electron';
import fs from 'fs/promises';

// ============================================================================
// Assistant Workspace Loader
// ============================================================================

/**
 * Get the path to an assistant's workspace directory
 * For preset assistants: {appPath}/assistant/{assistantId}/workspace
 */
async function getAssistantWorkspacePath(assistantId: string): Promise<string | null> {
  const appPath = app.getAppPath();

  // Handle unpacked resources when packaged
  const basePath = app.isPackaged && appPath.includes('.asar') ? appPath.replace('app.asar', 'app.asar.unpacked') : appPath;

  // Strip 'builtin-' prefix if present (assistant IDs are stored as "builtin-{preset-id}")
  const presetId = assistantId.startsWith('builtin-') ? assistantId.slice(8) : assistantId;

  const workspacePath = path.join(basePath, 'assistant', presetId, 'workspace');

  console.log('[assistantBridge] assistantId:', assistantId);
  console.log('[assistantBridge] presetId:', presetId);
  console.log('[assistantBridge] appPath:', appPath);
  console.log('[assistantBridge] basePath:', basePath);
  console.log('[assistantBridge] workspacePath:', workspacePath);

  try {
    await fs.access(workspacePath);
    console.log('[assistantBridge] Workspace found at:', workspacePath);
    return workspacePath;
  } catch (error) {
    console.log('[assistantBridge] Workspace not found at:', workspacePath, 'error:', error);
    return null;
  }
}

/**
 * Initialize assistant bridge
 */
export function initAssistantBridge(): void {
  // Load assistant workspace information
  ipcBridge.assistantBridge.loadWorkspace.provider(async (assistantId: string) => {
    console.log('[assistantBridge] >>>>> PROVIDER CALLED with assistantId:', assistantId);
    try {
      const workspacePath = await getAssistantWorkspacePath(assistantId);

      if (!workspacePath) {
        return {
          success: false,
          error: 'No workspace found for this assistant',
        };
      }

      // Load workspace using WorkspaceLoader
      const result = await loadClaudeCodeWorkspace(workspacePath);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to load workspace',
        };
      }

      // Return simplified workspace info for UI display
      return {
        success: true,
        workspace: {
          path: workspacePath,
          skills:
            result.workspace?.skills.map((s) => ({
              id: s.id,
              name: s.name,
              description: s.description,
            })) || [],
          commands:
            result.workspace?.commands.map((c) => ({
              name: c.name,
              description: c.description,
            })) || [],
          agents:
            result.workspace?.agents.map((a) => ({
              id: a.id,
              name: a.name,
              description: a.description,
            })) || [],
          hooks:
            result.workspace?.hooks.map((h) => ({
              type: h.type,
              name: h.name,
              description: h.description,
            })) || [],
        },
        warnings: result.warnings,
      };
    } catch (error) {
      console.error('[assistantBridge] Failed to load workspace:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  console.log('[assistantBridge] Assistant IPC bridge initialized');
}
