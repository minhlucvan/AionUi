/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Module-Based Hooks System
 *
 * Each hook module exports an object with event handlers:
 *   module.exports = {
 *     onWorkspaceInit: { handler: async (ctx) => {...}, priority: 10 },
 *     onSendMessage: (ctx) => {...}  // Shorthand
 *   };
 */

/**
 * Hook priority constants
 */
export const HOOK_PRIORITY = {
  CRITICAL: 1, // Security (runs first)
  HIGH: 10, // Core features
  NORMAL: 50, // Default
  LOW: 90, // Logging/analytics
  FINAL: 100, // Cleanup (runs last)
} as const;

/**
 * Hook events (extensible)
 */
export type HookEvent = 'onWorkspaceInit' | 'onConversationInit' | 'onSetup' | 'onSendMessage' | 'onFirstMessage' | 'onBuildSystemInstructions' | 'onError';

/**
 * Hook context (same for all hooks)
 */
export type HookContext = {
  event: HookEvent;
  content?: string;
  workspace: string;
  backend?: string;
  assistantPath?: string;
  conversationId?: string;
  enabledSkills?: string[];
  skillsSourceDir?: string;
  presetContext?: string;
  /** Whether this conversation is detected as a team conversation / 是否为团队会话 */
  isTeam?: boolean;
  /** Custom environment variables for the agent process / 自定义环境变量 */
  customEnv?: Record<string, string>;
  /** Team member definitions from assistant config / 来自助手配置的团队成员定义 */
  teamMembers?: import('@/common/agentTeam').IAgentTeamMemberDefinition[];
  utils: HookUtils;
};

/**
 * Hook result
 */
export type HookResult = {
  content?: string;
  blocked?: boolean;
  blockReason?: string;
  /** Hook can set isTeam to override team detection / Hook 可设置 isTeam 覆盖团队检测 */
  isTeam?: boolean;
  /** Hook can provide extra env vars to merge / Hook 可提供额外环境变量合并 */
  customEnv?: Record<string, string>;
  /** Hook can modify team members (e.g., add/remove/override definitions) */
  teamMembers?: import('@/common/agentTeam').IAgentTeamMemberDefinition[];
};

/**
 * Hook handler function
 */
export type HookHandler = (context: HookContext) => HookResult | Promise<HookResult>;

/**
 * Hook configuration (full format)
 */
export type HookConfig = {
  handler: HookHandler;
  priority?: number;
  enabled?: boolean;
};

/**
 * Hook module (object-based exports)
 */
export type HookModule = {
  onWorkspaceInit?: HookConfig | HookHandler;
  onConversationInit?: HookConfig | HookHandler;
  /** Fires after workspace init, before conversation is saved to DB. Can return isTeam/customEnv to merge into conversation extra. */
  onSetup?: HookConfig | HookHandler;
  onSendMessage?: HookConfig | HookHandler;
  onFirstMessage?: HookConfig | HookHandler;
  onBuildSystemInstructions?: HookConfig | HookHandler;
  onError?: HookConfig | HookHandler;
  [key: string]: HookConfig | HookHandler | undefined;
};

/**
 * Utility functions available to hooks
 */
export type HookUtils = {
  // File operations
  copyDirectory: (source: string, target: string, options?: { overwrite?: boolean }) => Promise<void>;
  readFile: (filePath: string, encoding?: BufferEncoding) => Promise<string>;
  writeFile: (filePath: string, content: string, encoding?: BufferEncoding) => Promise<void>;
  exists: (filePath: string) => Promise<boolean>;
  ensureDir: (dirPath: string) => Promise<void>;
  join: (...paths: string[]) => string;

  // Skill operations
  symlinkSkill: (skillName: string, targetDir: string) => Promise<void>;
  readSkillContent: (skillName: string) => Promise<string>;
  getSkillMetadata: (skillName: string) => Promise<{ name: string; description: string }>;
};

/**
 * Internal: Normalized hook (after parsing)
 */
export type NormalizedHook = {
  event: HookEvent;
  handler: HookHandler;
  priority: number;
  enabled: boolean;
  moduleName: string;
};
