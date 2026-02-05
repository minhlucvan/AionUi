/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Claude Code Workspace Integration Types
 *
 * This module defines types for loading and managing Claude Code workspaces,
 * which enable full Claude Code plugin compatibility including skills, commands,
 * agents, hooks, and MCP server configurations.
 */

/**
 * Claude Code plugin manifest (.claude-plugin/plugin.json)
 */
export interface ClaudeCodePluginManifest {
  /** Plugin identifier */
  name: string;
  /** Plugin version */
  version: string;
  /** Human-readable display name */
  displayName?: string;
  /** Plugin description */
  description?: string;
  /** Plugin author */
  author?: string;
  /** Plugin license */
  license?: string;
  /** Plugin repository URL */
  repository?: string;
  /** Entry point for the plugin (if applicable) */
  main?: string;
  /** Dependencies */
  dependencies?: Record<string, string>;
}

/**
 * Claude Code skill definition
 * Skills are markdown files with YAML frontmatter
 */
export interface ClaudeCodeSkill {
  /** Skill identifier (filename without extension) */
  id: string;
  /** Skill display name */
  name: string;
  /** Skill description */
  description?: string;
  /** Skill content (markdown) */
  content: string;
  /** Skill file path */
  filePath: string;
  /** YAML frontmatter metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Claude Code command definition
 * Commands are markdown files that define slash commands
 */
export interface ClaudeCodeCommand {
  /** Command name (e.g., 'feature-dev', 'code-review') */
  name: string;
  /** Command description */
  description?: string;
  /** Command prompt/instruction (markdown content) */
  prompt: string;
  /** Command file path */
  filePath: string;
  /** Input hint for the command */
  inputHint?: string;
  /** YAML frontmatter metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Claude Code agent definition
 * Agents are specialized AI performers for specific tasks
 */
export interface ClaudeCodeAgent {
  /** Agent identifier */
  id: string;
  /** Agent display name */
  name: string;
  /** Agent description */
  description?: string;
  /** Agent system prompt */
  systemPrompt: string;
  /** Agent file path */
  filePath: string;
  /** Agent capabilities/tools */
  tools?: string[];
  /** YAML frontmatter metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Claude Code hook types
 */
export type ClaudeCodeHookType = 'SessionStart' | 'PreToolUse' | 'PostToolUse' | 'Stop';

/**
 * Claude Code hook definition
 * Hooks are event handlers that execute at specific lifecycle points
 */
export interface ClaudeCodeHook {
  /** Hook type */
  type: ClaudeCodeHookType;
  /** Hook name/identifier */
  name: string;
  /** Hook description */
  description?: string;
  /** Hook handler code or prompt */
  handler: string;
  /** Hook file path */
  filePath: string;
  /** Hook priority (higher = executed first) */
  priority?: number;
  /** YAML frontmatter metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Claude Code MCP server configuration (.mcp.json)
 */
export interface ClaudeCodeMcpConfig {
  /** MCP servers defined in the workspace */
  servers: Record<string, {
    /** Server command */
    command: string;
    /** Server arguments */
    args?: string[];
    /** Environment variables */
    env?: Record<string, string>;
    /** Transport type */
    transport?: 'stdio' | 'http' | 'sse';
    /** Server URL (for http/sse) */
    url?: string;
  }>;
}

/**
 * Loaded Claude Code workspace
 * Contains all parsed plugins, skills, commands, agents, hooks, and MCP configs
 */
export interface ClaudeCodeWorkspace {
  /** Workspace root path */
  rootPath: string;
  /** Detected plugins in the workspace */
  plugins: Array<{
    manifest: ClaudeCodePluginManifest;
    pluginDir: string;
  }>;
  /** Skills loaded from skills/ directories */
  skills: ClaudeCodeSkill[];
  /** Commands loaded from commands/ directories */
  commands: ClaudeCodeCommand[];
  /** Agents loaded from agents/ directories */
  agents: ClaudeCodeAgent[];
  /** Hooks loaded from hooks/ directories */
  hooks: ClaudeCodeHook[];
  /** MCP server configuration */
  mcpConfig?: ClaudeCodeMcpConfig;
  /** Workspace loaded timestamp */
  loadedAt: Date;
}

/**
 * Workspace loading options
 */
export interface WorkspaceLoadOptions {
  /** Whether to load skills */
  loadSkills?: boolean;
  /** Whether to load commands */
  loadCommands?: boolean;
  /** Whether to load agents */
  loadAgents?: boolean;
  /** Whether to load hooks */
  loadHooks?: boolean;
  /** Whether to load MCP config */
  loadMcpConfig?: boolean;
  /** Whether to scan for plugins */
  scanPlugins?: boolean;
}

/**
 * Workspace loading result
 */
export interface WorkspaceLoadResult {
  /** Whether loading succeeded */
  success: boolean;
  /** Loaded workspace (if successful) */
  workspace?: ClaudeCodeWorkspace;
  /** Error message (if failed) */
  error?: string;
  /** Warnings during loading */
  warnings?: string[];
}

/**
 * Assistant metadata (assistant.json)
 * Defines an assistant with an associated workspace template
 */
export interface AssistantMetadata {
  /** Assistant unique identifier */
  id: string;
  /** Assistant display name */
  name: string;
  /** Assistant version */
  version: string;
  /** Assistant description */
  description: string;
  /** Assistant author */
  author?: string;
  /** Path to workspace directory relative to assistant root */
  workspacePath: string;
  /** Assistant tags for categorization */
  tags?: string[];
  /** Preset agent type (claude, gemini, codex) */
  presetAgentType?: 'claude' | 'gemini' | 'codex';
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Loaded assistant with workspace
 */
export interface LoadedAssistant {
  /** Assistant metadata */
  metadata: AssistantMetadata;
  /** Assistant root directory path */
  assistantPath: string;
  /** Loaded workspace */
  workspace?: ClaudeCodeWorkspace;
  /** Workspace loading error (if any) */
  workspaceError?: string;
}

/**
 * Assistant loading result
 */
export interface AssistantLoadResult {
  /** Whether loading succeeded */
  success: boolean;
  /** Loaded assistant (if successful) */
  assistant?: LoadedAssistant;
  /** Error message (if failed) */
  error?: string;
  /** Warnings during loading */
  warnings?: string[];
}
