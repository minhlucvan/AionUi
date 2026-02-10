/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Tool type discriminator.
 * - "utility": Non-agent CLI tools (gh, docker, etc.)
 * - "agent":   ACP backend agent CLIs (claude, codex, qwen, etc.)
 */
export type ToolType = 'utility' | 'agent';

/**
 * Base fields shared by all tool.json manifests.
 */
type ToolManifestBase = {
  /** Unique tool identifier (e.g. "gh", "claude") */
  id: string;
  /** Human-readable tool name */
  name: string;
  /** Short description of the tool */
  description?: string;
  /** CLI command name used to invoke / detect the tool */
  cliCommand: string;
  /** URL for manual installation guide / documentation */
  installUrl?: string;
};

/**
 * Utility tool manifest (type: "utility").
 * Non-agent CLI tools like GitHub CLI, Docker, etc.
 */
export type UtilityToolManifest = ToolManifestBase & {
  type: 'utility';
  /** Platform-specific install commands (keyed by process.platform) */
  installCommand: Record<string, string>;
  /** Command to update the tool */
  updateCommand?: string;
  /** Command to authenticate / login */
  loginCommand?: string;
  /** Command to check login status */
  loginStatusCommand?: string;
  /** Command to check the tool version */
  versionCommand?: string;
  /** Skill names bundled with this tool (directories under tools/<id>/skills/) */
  skills?: string[];
};

/**
 * Agent tool manifest (type: "agent").
 * ACP backend agent CLIs like Claude Code, Codex, Qwen, etc.
 */
export type AgentToolManifest = ToolManifestBase & {
  type: 'agent';
  /** Full CLI path with optional arguments for spawning */
  defaultCliPath?: string;
  /** Whether this backend requires authentication before use */
  authRequired?: boolean;
  /** Whether this backend is enabled and should appear in the UI */
  enabled?: boolean;
  /** Whether this backend supports streaming responses */
  supportsStreaming?: boolean;
  /** Arguments to enable ACP mode when spawning the CLI */
  acpArgs?: string[];
  /** Command to install the CLI tool */
  installCommand?: string;
  /** Command to verify the CLI tool after installation */
  setupCommand?: string;
};

/**
 * Discriminated union of all tool.json manifest shapes.
 */
export type ToolManifest = UtilityToolManifest | AgentToolManifest;

/** Runtime status information for a loaded utility tool */
export type ToolStatus = {
  id: string;
  name: string;
  description?: string;
  cliCommand: string;
  installed: boolean;
  version?: string;
  loggedIn?: boolean;
  loginUser?: string;
  installCommand?: string;
  updateCommand?: string;
  loginCommand?: string;
  installUrl?: string;
  hasSkill: boolean;
  skillInstalled: boolean;
  /** Directory path where this tool's definition lives */
  toolDir: string;
};
