/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Assistant Loader
 *
 * Loads Claude Code assistants with their workspace templates.
 * An assistant is a directory containing:
 * - assistant.json: Assistant metadata
 * - workspace/: Workspace template directory
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadClaudeCodeWorkspace } from './WorkspaceLoader';
import type {
  AssistantMetadata,
  LoadedAssistant,
  AssistantLoadResult,
} from './types';

/**
 * Load an assistant from a directory
 *
 * @param assistantPath - Absolute path to assistant directory (e.g., assistant/web-development)
 * @param loadWorkspace - Whether to load the workspace (default: true)
 * @returns Assistant loading result
 *
 * @example
 * ```typescript
 * const result = await loadAssistant('/path/to/assistant/web-development');
 * if (result.success) {
 *   console.log('Loaded assistant:', result.assistant.metadata.name);
 *   console.log('Workspace skills:', result.assistant.workspace?.skills.length);
 * }
 * ```
 */
export async function loadAssistant(
  assistantPath: string,
  loadWorkspace = true
): Promise<AssistantLoadResult> {
  const warnings: string[] = [];

  try {
    // Check if assistant directory exists
    if (!fs.existsSync(assistantPath)) {
      return {
        success: false,
        error: `Assistant directory not found: ${assistantPath}`,
      };
    }

    const stats = fs.statSync(assistantPath);
    if (!stats.isDirectory()) {
      return {
        success: false,
        error: `Assistant path is not a directory: ${assistantPath}`,
      };
    }

    // Load assistant.json
    const metadataPath = path.join(assistantPath, 'assistant.json');
    if (!fs.existsSync(metadataPath)) {
      return {
        success: false,
        error: `Assistant metadata not found: ${metadataPath}`,
      };
    }

    let metadata: AssistantMetadata;
    try {
      const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
      metadata = JSON.parse(metadataContent);
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse assistant.json: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    // Validate required fields
    const requiredFields: (keyof AssistantMetadata)[] = ['id', 'name', 'version', 'description', 'workspacePath'];
    for (const field of requiredFields) {
      if (!metadata[field]) {
        return {
          success: false,
          error: `Missing required field in assistant.json: ${field}`,
        };
      }
    }

    const assistant: LoadedAssistant = {
      metadata,
      assistantPath,
    };

    // Load workspace if requested
    if (loadWorkspace) {
      const workspacePath = path.isAbsolute(metadata.workspacePath)
        ? metadata.workspacePath
        : path.join(assistantPath, metadata.workspacePath);

      if (!fs.existsSync(workspacePath)) {
        warnings.push(`Workspace directory not found: ${workspacePath}`);
        assistant.workspaceError = `Workspace directory not found: ${workspacePath}`;
      } else {
        const workspaceResult = await loadClaudeCodeWorkspace(workspacePath);

        if (workspaceResult.success && workspaceResult.workspace) {
          assistant.workspace = workspaceResult.workspace;

          // Merge workspace warnings
          if (workspaceResult.warnings) {
            warnings.push(...workspaceResult.warnings);
          }
        } else {
          warnings.push(`Failed to load workspace: ${workspaceResult.error || 'Unknown error'}`);
          assistant.workspaceError = workspaceResult.error || 'Failed to load workspace';
        }
      }
    }

    return {
      success: true,
      assistant,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to load assistant: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Load assistant by ID from the assistant directory
 *
 * @param assistantId - Assistant ID (e.g., 'web-development')
 * @param assistantsDir - Root assistant directory (default: project root/assistant)
 * @param loadWorkspace - Whether to load the workspace (default: true)
 * @returns Assistant loading result
 *
 * @example
 * ```typescript
 * const result = await loadAssistantById('web-development');
 * if (result.success) {
 *   console.log('Loaded:', result.assistant.metadata.name);
 * }
 * ```
 */
export async function loadAssistantById(
  assistantId: string,
  assistantsDir?: string,
  loadWorkspace = true
): Promise<AssistantLoadResult> {
  // Default to project root assistant directory
  const baseDir = assistantsDir || path.join(__dirname, '../../assistant');
  const assistantPath = path.join(baseDir, assistantId);

  return loadAssistant(assistantPath, loadWorkspace);
}

/**
 * List all available assistants in the assistant directory
 *
 * @param assistantsDir - Root assistant directory (default: project root/assistant)
 * @returns Array of assistant IDs
 *
 * @example
 * ```typescript
 * const assistants = await listAssistants();
 * console.log('Available assistants:', assistants);
 * // ['web-development', 'data-science', 'devops']
 * ```
 */
export async function listAssistants(assistantsDir?: string): Promise<string[]> {
  const baseDir = assistantsDir || path.join(__dirname, '../../assistant');

  if (!fs.existsSync(baseDir)) {
    return [];
  }

  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  const assistants: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    // Check if assistant.json exists
    const metadataPath = path.join(baseDir, entry.name, 'assistant.json');
    if (fs.existsSync(metadataPath)) {
      assistants.push(entry.name);
    }
  }

  return assistants;
}

/**
 * Get assistant metadata without loading the full workspace
 *
 * @param assistantId - Assistant ID
 * @param assistantsDir - Root assistant directory (default: project root/assistant)
 * @returns Assistant metadata or null if not found
 *
 * @example
 * ```typescript
 * const metadata = await getAssistantMetadata('web-development');
 * if (metadata) {
 *   console.log('Name:', metadata.name);
 *   console.log('Description:', metadata.description);
 * }
 * ```
 */
export async function getAssistantMetadata(
  assistantId: string,
  assistantsDir?: string
): Promise<AssistantMetadata | null> {
  const result = await loadAssistantById(assistantId, assistantsDir, false);
  return result.success ? result.assistant!.metadata : null;
}
