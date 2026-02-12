/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Workspace entity — a folder-based project environment that organises
 * conversations, files, bots / assistants and configuration.
 */
export type IWorkspace = {
  id: string;
  name: string;
  path: string; // absolute folder path on disk
  description?: string;
  icon?: string; // emoji or icon identifier
  config: IWorkspaceConfig;
  pinned: boolean;
  lastActiveConversationId?: string;
  createdAt: number;
  updatedAt: number;
};

/**
 * Per-workspace settings (extensible JSON blob stored in DB).
 */
export type IWorkspaceConfig = {
  /** Default agent backend, e.g. 'gemini', 'claude' */
  defaultAgent?: string;
  /** Default model selection */
  defaultModel?: { id: string; useModel: string };
  /** Whether this workspace is the default (home) workspace */
  isDefault?: boolean;
};

/**
 * Parameters for creating a new workspace.
 */
export type ICreateWorkspaceParams = {
  name: string;
  path: string;
  description?: string;
  icon?: string;
  config?: Partial<IWorkspaceConfig>;
};

/**
 * Parameters for updating an existing workspace.
 */
export type IUpdateWorkspaceParams = {
  id: string;
  updates: Partial<Pick<IWorkspace, 'name' | 'description' | 'icon' | 'config' | 'pinned' | 'lastActiveConversationId'>>;
};
