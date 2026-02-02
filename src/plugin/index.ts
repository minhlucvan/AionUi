/**
 * AionUi Plugin System
 *
 * Public API for the plugin system. This module is used by the AionUi host
 * to manage plugins. Plugin authors should import from '@aionui/plugin-sdk'
 * instead (which re-exports the relevant types and base classes).
 */

// Core manager
export { PluginManager } from './PluginManager';

// Loader
export { PluginLoader } from './loader/PluginLoader';

// Adapter base classes
export { BaseProviderAdapter, ClaudeAdapter, CodexAdapter, GeminiAdapter } from './adapters';

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
  AdapterMessage,
  AIProvider,
  AionPlugin,
  ConversationContext,
  MessageHookContext,
  MessageHookResult,
  PluginCategory,
  PluginContext,
  PluginHooks,
  PluginLogger,
  PluginManifest,
  PluginPackageJson,
  PluginPermission,
  PluginRegistryEntry,
  PluginSettingDefinition,
  PluginSkill,
  PluginSource,
  PluginState,
  PluginTool,
  ProviderAdapter,
  ProviderAdapterConfig,
  ProviderToolDefinition,
  ResponseHookContext,
  ResponseHookResult,
  ToolCallHookContext,
  ToolCallHookResult,
  ToolCallResultContext,
  ToolExecutionContext,
  ToolExecutionResult,
} from './types';

export { AI_PROVIDERS } from './types';
