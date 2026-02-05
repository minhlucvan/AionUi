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
import { loadAssistantById } from './AssistantLoader';

/**
 * Copy workspace template from an assistant to a chat workspace directory
 *
 * @param assistantId - Assistant ID (e.g., 'web-development')
 * @param targetWorkspace - Target workspace path for the chat
 * @param assistantsDir - Optional custom assistants directory
 * @returns Promise<boolean> - true if copy succeeded, false otherwise
 *
 * @example
 * ```typescript
 * const success = await copyWorkspaceTemplate(
 *   'web-development',
 *   '/tmp/chat-workspace-12345'
 * );
 * if (success) {
 *   console.log('Workspace template copied successfully');
 * }
 * ```
 */
export async function copyWorkspaceTemplate(
  assistantId: string,
  targetWorkspace: string,
  assistantsDir?: string
): Promise<boolean> {
  try {
    console.log(`[WorkspaceTemplate] Copying workspace template for assistant: ${assistantId}`);
    console.log(`[WorkspaceTemplate] Target workspace: ${targetWorkspace}`);

    // Load assistant metadata
    const assistantResult = await loadAssistantById(assistantId, assistantsDir, false);

    if (!assistantResult.success || !assistantResult.assistant) {
      console.error(`[WorkspaceTemplate] Failed to load assistant: ${assistantResult.error}`);
      return false;
    }

    const assistant = assistantResult.assistant;
    const workspaceTemplatePath = path.isAbsolute(assistant.metadata.workspacePath)
      ? assistant.metadata.workspacePath
      : path.join(assistant.assistantPath, assistant.metadata.workspacePath);

    console.log(`[WorkspaceTemplate] Workspace template source: ${workspaceTemplatePath}`);

    // Check if workspace template exists
    if (!fs.existsSync(workspaceTemplatePath)) {
      console.error(`[WorkspaceTemplate] Workspace template not found: ${workspaceTemplatePath}`);
      return false;
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
      await mergeMcpConfig(mcpTemplatePath, mcpTargetPath);
    }

    return true;
  } catch (error) {
    console.error(`[WorkspaceTemplate] Failed to copy workspace template:`, error);
    return false;
  }
}

/**
 * Merge MCP configuration from template to target
 *
 * @param templatePath - Path to template .mcp.json
 * @param targetPath - Path to target .mcp.json
 */
async function mergeMcpConfig(templatePath: string, targetPath: string): Promise<void> {
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
export async function cleanupChatWorkspace(
  workspacePath: string,
  isCustomWorkspace: boolean = false
): Promise<boolean> {
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
 * @param assistantsDir - Optional custom assistants directory
 * @returns Promise with template info or null
 */
export async function getWorkspaceTemplateInfo(
  assistantId: string,
  assistantsDir?: string
): Promise<{ templatePath: string; exists: boolean } | null> {
  try {
    const assistantResult = await loadAssistantById(assistantId, assistantsDir, false);

    if (!assistantResult.success || !assistantResult.assistant) {
      return null;
    }

    const assistant = assistantResult.assistant;
    const templatePath = path.isAbsolute(assistant.metadata.workspacePath)
      ? assistant.metadata.workspacePath
      : path.join(assistant.assistantPath, assistant.metadata.workspacePath);

    return {
      templatePath,
      exists: fs.existsSync(templatePath),
    };
  } catch (error) {
    console.error(`[WorkspaceTemplate] Failed to get template info:`, error);
    return null;
  }
}
