/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Workspace Template Copying Utilities
 *
 * Handles copying assistant workspace templates to chat-specific temporary directories.
 */

import * as fs from 'fs';
import * as path from 'path';
import { copyDirectoryRecursively } from '../process/utils';
import type { AssistantMetadata } from './types';
import { getAssistantsDir } from '../process/migrations/assistantMigration';

/**
 * Get the assistant root directory path
 *
 * All assistants (built-in and custom) are now stored in Application Support:
 * ~/Library/Application Support/AionUi/config/assistants/{id}/
 *
 * @param assistantId - Assistant ID (e.g., 'builtin-video-generator' or 'video-generator')
 * @returns Absolute path to assistant directory
 */
function getAssistantRootPath(assistantId: string): string {
  // Strip 'builtin-' prefix if present (presets are stored as "builtin-{id}" but directories are just "{id}")
  const resolvedId = assistantId.startsWith('builtin-') ? assistantId.slice(8) : assistantId;

  // All assistants are in Application Support
  const assistantsDir = getAssistantsDir();
  return path.join(assistantsDir, resolvedId);
}

/**
 * Result of copying a workspace template
 * 复制工作区模板的结果
 */
export interface CopyWorkspaceResult {
  /** Whether the copy succeeded / 是否复制成功 */
  success: boolean;
  /** Default agent name from assistant.json / 来自 assistant.json 的默认 agent 名称 */
  defaultAgent?: string;
}

/**
 * Copy workspace template from an assistant to a chat workspace directory
 *
 * @param assistantId - Assistant ID (e.g., 'web-development' or 'builtin-web-development')
 * @param targetWorkspace - Target workspace path for the chat
 * @returns Promise<CopyWorkspaceResult> - result with success flag and optional defaultAgent
 *
 * @example
 * ```typescript
 * const result = await copyWorkspaceTemplate(
 *   'web-development',
 *   '/tmp/chat-workspace-12345'
 * );
 * if (result.success) {
 *   console.log('Workspace template copied successfully');
 *   if (result.defaultAgent) {
 *     console.log(`Default agent: ${result.defaultAgent}`);
 *   }
 * }
 * ```
 */
export async function copyWorkspaceTemplate(assistantId: string, targetWorkspace: string): Promise<CopyWorkspaceResult> {
  try {
    console.log(`[WorkspaceTemplate] Copying workspace template for assistant: ${assistantId}`);
    console.log(`[WorkspaceTemplate] Target workspace: ${targetWorkspace}`);

    // Find the assistant root folder
    const assistantPath = getAssistantRootPath(assistantId);
    console.log(`[WorkspaceTemplate] Assistant path: ${assistantPath}`);

    if (!fs.existsSync(assistantPath)) {
      console.error(`[WorkspaceTemplate] Assistant directory not found: ${assistantPath}`);
      return { success: false };
    }

    // Read assistant.json to get workspace config
    const configPath = path.join(assistantPath, 'assistant.json');
    if (!fs.existsSync(configPath)) {
      console.error(`[WorkspaceTemplate] Assistant config not found: ${configPath}`);
      return { success: false };
    }

    let config: AssistantMetadata;
    try {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      config = JSON.parse(configContent);
    } catch (error) {
      console.error(`[WorkspaceTemplate] Failed to parse assistant.json:`, error);
      return { success: false };
    }

    // Check if workspace path is configured
    if (!config.workspacePath) {
      console.log(`[WorkspaceTemplate] No workspace configured for assistant: ${assistantId}`);
      return { success: false };
    }

    // Resolve workspace template path
    const workspaceTemplatePath = path.isAbsolute(config.workspacePath) ? config.workspacePath : path.join(assistantPath, config.workspacePath);

    console.log(`[WorkspaceTemplate] Workspace template source: ${workspaceTemplatePath}`);

    // Check if workspace template exists
    if (!fs.existsSync(workspaceTemplatePath)) {
      console.error(`[WorkspaceTemplate] Workspace template not found: ${workspaceTemplatePath}`);
      return { success: false };
    }

    // Ensure target directory exists
    if (!fs.existsSync(targetWorkspace)) {
      fs.mkdirSync(targetWorkspace, { recursive: true });
    }

    // Copy workspace template to target
    await copyDirectoryRecursively(workspaceTemplatePath, targetWorkspace, {
      overwrite: false, // Don't overwrite existing files in the target
    });

    console.log(`[WorkspaceTemplate] Successfully copied workspace template`);

    // Merge .mcp.json if it exists
    const mcpTemplatePath = path.join(workspaceTemplatePath, '.mcp.json');
    const mcpTargetPath = path.join(targetWorkspace, '.mcp.json');

    if (fs.existsSync(mcpTemplatePath)) {
      mergeMcpConfig(mcpTemplatePath, mcpTargetPath);
    }

    // Copy assistant-level hooks/ folder into workspace (hooks are defined outside workspace)
    const hooksSourcePath = path.join(assistantPath, 'hooks');
    if (fs.existsSync(hooksSourcePath)) {
      const hooksTargetPath = path.join(targetWorkspace, 'hooks');
      await copyDirectoryRecursively(hooksSourcePath, hooksTargetPath, { overwrite: false });
      console.log(`[WorkspaceTemplate] Copied hooks to workspace`);
    }

    return { success: true, defaultAgent: config.defaultAgent };
  } catch (error) {
    console.error(`[WorkspaceTemplate] Failed to copy workspace template:`, error);
    return { success: false };
  }
}

/**
 * Merge MCP configuration from template to target
 *
 * @param templatePath - Path to template .mcp.json
 * @param targetPath - Path to target .mcp.json
 */
function mergeMcpConfig(templatePath: string, targetPath: string): void {
  try {
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    const templateConfig = JSON.parse(templateContent);

    // If target doesn't exist, just copy the template
    if (!fs.existsSync(targetPath)) {
      fs.writeFileSync(targetPath, templateContent, 'utf-8');
      console.log(`[WorkspaceTemplate] Copied .mcp.json to target`);
      return;
    }

    // If target exists, merge configurations
    const targetContent = fs.readFileSync(targetPath, 'utf-8');
    const targetConfig = JSON.parse(targetContent);

    // Merge servers (template takes precedence for conflicts)
    const mergedConfig = {
      ...targetConfig,
      servers: {
        ...targetConfig.servers,
        ...templateConfig.servers,
      },
    };

    fs.writeFileSync(targetPath, JSON.stringify(mergedConfig, null, 2), 'utf-8');
    console.log(`[WorkspaceTemplate] Merged .mcp.json configurations`);
  } catch (error) {
    console.error(`[WorkspaceTemplate] Failed to merge MCP config:`, error);
    // Non-fatal - continue even if MCP merge fails
  }
}

/**
 * Clean up a chat workspace directory
 *
 * @param workspacePath - Path to workspace to clean up
 * @param isCustomWorkspace - Whether this is a custom (user-specified) workspace
 * @returns Promise<boolean> - true if cleanup succeeded
 *
 * @example
 * ```typescript
 * await cleanupChatWorkspace('/tmp/chat-workspace-12345', false);
 * ```
 */
export async function cleanupChatWorkspace(workspacePath: string, isCustomWorkspace: boolean = false): Promise<boolean> {
  try {
    // Never delete custom workspaces - they're user-specified directories
    if (isCustomWorkspace) {
      console.log(`[WorkspaceTemplate] Skipping cleanup of custom workspace: ${workspacePath}`);
      return true;
    }

    // Safety check: don't delete if path doesn't look like a temp workspace
    if (!workspacePath.includes('-temp-') && !workspacePath.includes('/tmp/')) {
      console.warn(`[WorkspaceTemplate] Refusing to delete non-temp workspace: ${workspacePath}`);
      return false;
    }

    if (fs.existsSync(workspacePath)) {
      await fs.promises.rm(workspacePath, { recursive: true, force: true });
      console.log(`[WorkspaceTemplate] Cleaned up workspace: ${workspacePath}`);
      return true;
    }

    return true;
  } catch (error) {
    console.error(`[WorkspaceTemplate] Failed to cleanup workspace:`, error);
    return false;
  }
}

/**
 * Get workspace template info for an assistant
 *
 * @param assistantId - Assistant ID
 * @returns Template info or null
 */
export function getWorkspaceTemplateInfo(assistantId: string): { templatePath: string; exists: boolean } | null {
  try {
    // Find the assistant root folder
    const assistantPath = getAssistantRootPath(assistantId);

    if (!fs.existsSync(assistantPath)) {
      return null;
    }

    // Read assistant.json to get workspace config
    const configPath = path.join(assistantPath, 'assistant.json');
    if (!fs.existsSync(configPath)) {
      return null;
    }

    let config: AssistantMetadata;
    try {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      config = JSON.parse(configContent);
    } catch {
      return null;
    }

    if (!config.workspacePath) {
      return null;
    }

    const templatePath = path.isAbsolute(config.workspacePath) ? config.workspacePath : path.join(assistantPath, config.workspacePath);

    return {
      templatePath,
      exists: fs.existsSync(templatePath),
    };
  } catch (error) {
    console.error(`[WorkspaceTemplate] Failed to get template info:`, error);
    return null;
  }
}
