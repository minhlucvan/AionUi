/**
 * AionUi Plugin System
 *
 * A plugin works like a current agent — it bundles system prompts, skills,
 * dedicated tools, and MCP servers. Users install plugins via npm or GitHub
 * to add new capabilities that work across Claude Code, Gemini, Codex, etc.
 *
 * Public API for the AionUi host.
 */

// Core manager
export { PluginManager } from './PluginManager';

// Loader
export { PluginLoader } from './loader/PluginLoader';

// IPC bridge
export { initPluginBridge, PLUGIN_CHANNELS } from './bridge/pluginBridge';

// Manifest validation
export {
  pluginManifestSchema,
  pluginPackageJsonSchema,
  validateManifest,
  validatePluginPackageJson,
} from './types/manifest';

// Types (re-export everything for consumers)
export type {
  AIProvider,
  AionPlugin,
  PluginCategory,
  PluginContext,
  PluginHooks,
  PluginLogger,
  PluginManifest,
  PluginMcpServer,
  PluginPackageJson,
  PluginPermission,
  PluginRegistryEntry,
  PluginSettingDefinition,
  PluginSkillDefinition,
  PluginSource,
  PluginState,
  PluginSystemPrompt,
  PluginToolDefinition,
  ToolExecutionContext,
  ToolResult,
} from './types';

export { AI_PROVIDERS } from './types';
