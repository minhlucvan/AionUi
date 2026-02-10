/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Tool manifest schema as defined in tool.json files.
 * Each tool lives in `tools/<tool-dir>/tool.json` and may include
 * associated skills under `tools/<tool-dir>/skills/<skill-name>/SKILL.md`.
 */
export type ToolManifest = {
  /** Unique tool identifier (e.g. "gh", "docker") */
  id: string;
  /** Human-readable tool name */
  name: string;
  /** Short description of the tool */
  description: string;
  /** CLI command name used to invoke the tool */
  cliCommand: string;
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
  /** URL for manual installation guide / documentation */
  installUrl?: string;
  /** Skill names bundled with this tool (directories under tools/<id>/skills/) */
  skills?: string[];
};

/** Runtime status information for a loaded tool */
export type ToolStatus = {
  id: string;
  name: string;
  description: string;
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
