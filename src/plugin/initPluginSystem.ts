/**
 * Plugin System Initialization
 *
 * Bootstraps the plugin system at application startup. This module:
 *   1. Creates the singleton PluginManager
 *   2. Auto-registers and activates built-in plugins (pdf, pptx, docx, xlsx)
 *   3. Installs plugin skill files (SKILL.md + scripts) to the host skills directory
 *   4. Loads user-installed plugins from the registry
 *
 * The initialization runs BEFORE initBuiltinAssistantRules() — plugins are
 * the primary source of skill files for pdf, pptx, docx, xlsx. The old
 * initBuiltinAssistantRules() will skip any skills already installed by plugins.
 *
 * Usage in initStorage.ts:
 *   import { initPluginSystem, getPluginManager } from '../plugin/initPluginSystem';
 *   // Before initBuiltinAssistantRules():
 *   await initPluginSystem({ skillsDir, workspace });
 *
 * Usage in agentUtils.ts:
 *   import { getPluginManager } from '../plugin/initPluginSystem';
 *   const pm = getPluginManager();
 *   const pluginPrompts = pm?.collectSystemPrompts(provider);
 */

import * as path from 'path';
import { PluginManager } from './PluginManager';
import { BUILTIN_PLUGINS, createBuiltinRegistryEntry, loadBuiltinPlugin } from './builtin/builtinPlugins';

// ─── Singleton ─────────────────────────────────────────────────────────────────

let pluginManager: PluginManager | null = null;

/**
 * Get the global PluginManager instance.
 * Returns null if the plugin system hasn't been initialized yet.
 */
export function getPluginManager(): PluginManager | null {
  return pluginManager;
}

// ─── Configuration ──────────────────────────────────────────────────────────────

export interface PluginSystemConfig {
  /** Path to the host's skills directory (getSkillsDir()) */
  skillsDir: string;

  /** Current workspace path */
  workspace: string;

  /** Path to the host's assistants directory (getAssistantsDir()) */
  assistantsDir?: string;

  /** AionUi host version */
  hostVersion?: string;

  /** Directory for user-installed plugins (default: {userData}/plugins) */
  pluginsDir?: string;

  /** Path to the plugin registry JSON (default: {userData}/plugins/registry.json) */
  registryPath?: string;

  /** Proxy for network operations */
  proxy?: string;
}

// ─── Initialization ─────────────────────────────────────────────────────────────

/**
 * Initialize the plugin system.
 *
 * This should be called once during application startup, after
 * initBuiltinAssistantRules() has copied skill files to the user directory.
 *
 * Steps:
 *   1. Create the PluginManager singleton
 *   2. Load and activate built-in plugins
 *   3. Initialize the user plugin registry (loads previously installed plugins)
 */
export async function initPluginSystem(config: PluginSystemConfig): Promise<void> {
  if (pluginManager) {
    console.warn('[PluginSystem] Already initialized, skipping');
    return;
  }

  const pluginsDir = config.pluginsDir ?? path.join(config.skillsDir, '..', 'plugins');
  const registryPath = config.registryPath ?? path.join(pluginsDir, 'registry.json');

  // 1. Create the PluginManager
  pluginManager = new PluginManager({
    pluginsDir,
    registryPath,
    hostVersion: config.hostVersion ?? '1.7.0',
    workspace: config.workspace,
    skillsDir: config.skillsDir,
    assistantsDir: config.assistantsDir,
    proxy: config.proxy,
  });

  // 2. Auto-register and activate built-in plugins
  await registerBuiltinPlugins(pluginManager, config);

  // 3. Initialize user-installed plugins from the registry
  try {
    await pluginManager.initialize();
  } catch (err) {
    console.error('[PluginSystem] Failed to initialize user plugins:', err);
  }

  console.log(`[PluginSystem] Initialized with ${pluginManager.getActivePlugins().length} active plugins`);
}

/**
 * Shutdown the plugin system.
 * Called during application quit to deactivate all plugins gracefully.
 */
export async function shutdownPluginSystem(): Promise<void> {
  if (pluginManager) {
    await pluginManager.shutdown();
    pluginManager = null;
  }
}

// ─── Built-in Plugin Registration ───────────────────────────────────────────────

/**
 * Register, activate, and install built-in plugins.
 *
 * Built-in plugins are loaded from the bundled examples/ directory (dev)
 * or builtin-plugins/ directory (production). They are pre-activated with
 * all permissions granted.
 *
 * After registration, each plugin's skill files (SKILL.md + scripts + docs)
 * are installed to the host skills directory. This makes plugins the primary
 * source of skill content — the old initBuiltinAssistantRules() will skip
 * any skills that plugins have already installed.
 */
async function registerBuiltinPlugins(manager: PluginManager, config: PluginSystemConfig): Promise<void> {
  let registered = 0;

  for (const descriptor of BUILTIN_PLUGINS) {
    // Skip if already registered (from a previous init or saved registry)
    if (manager.isPluginActive(descriptor.id)) {
      continue;
    }

    try {
      const plugin = loadBuiltinPlugin(descriptor);
      if (!plugin) continue;

      const entry = createBuiltinRegistryEntry(descriptor, plugin);

      // Create a minimal context and activate the plugin
      const context = {
        pluginId: plugin.id,
        settings: {},
        workspace: config.workspace,
        pluginDir: entry.installPath,
        logger: {
          debug: (msg: string, ...args: unknown[]) => console.debug(`[Plugin:${plugin.id}]`, msg, ...args),
          info: (msg: string, ...args: unknown[]) => console.info(`[Plugin:${plugin.id}]`, msg, ...args),
          warn: (msg: string, ...args: unknown[]) => console.warn(`[Plugin:${plugin.id}]`, msg, ...args),
          error: (msg: string, ...args: unknown[]) => console.error(`[Plugin:${plugin.id}]`, msg, ...args),
        },
        activeProvider: 'gemini' as const,
        skillsDir: config.skillsDir,
        onSettingsChange: () => () => {},
        onProviderChange: () => () => {},
      };

      // Activate the plugin (captures pluginDir, etc.)
      await plugin.activate(context);

      // Register it as active in the manager (also installs skills to skillsDir)
      manager.registerBuiltinPlugin(plugin, entry);

      registered++;
      console.log(`[PluginSystem] Registered built-in plugin: ${descriptor.displayName} (${descriptor.id})`);
    } catch (err) {
      console.error(`[PluginSystem] Failed to register built-in plugin "${descriptor.id}":`, err);
    }
  }

  if (registered > 0) {
    console.log(`[PluginSystem] ${registered} built-in plugins registered`);
  }
}
