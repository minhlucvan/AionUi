/**
 * Built-in Plugin Registry
 *
 * Maps the existing built-in skills (pdf, pptx, docx, xlsx) to their
 * plugin implementations. When the plugin system initializes, these are
 * automatically registered and activated so they appear alongside the
 * built-in skills in the UI.
 *
 * Since the built-in skill files are already copied to getSkillsDir() by
 * initBuiltinAssistantRules(), plugin skills are instantly discoverable
 * by AcpSkillManager and loadSkillsContent(). The plugin system adds:
 *   - System prompts (injected into agent messages)
 *   - Tool definitions (available for function calling)
 *   - MCP servers (registered with the MCP management)
 *
 * In production, the plugin code is bundled alongside the app.
 * In development, it's loaded from the examples/ directory.
 */

import * as path from 'path';
import type { AionPlugin, PluginRegistryEntry } from '../types';

// ─── Built-in Plugin Manifest ─────────────────────────────────────────────────

export interface BuiltinPluginDescriptor {
  /** Plugin package directory name (e.g., 'plugin-pdf') */
  dirName: string;

  /** Plugin ID (must match the plugin's `id` field) */
  id: string;

  /** Skill names this plugin provides (for matching with enabledSkills) */
  skillNames: string[];

  /** Display name for the UI */
  displayName: string;
}

/**
 * Registry of built-in skill plugins.
 *
 * Each entry maps a built-in skill to its plugin package. The plugin
 * provides system prompts and tools that enhance the skill beyond
 * just the SKILL.md content.
 */
export const BUILTIN_PLUGINS: BuiltinPluginDescriptor[] = [
  {
    dirName: 'plugin-pdf',
    id: 'aionui-plugin-pdf',
    skillNames: ['pdf'],
    displayName: 'PDF Tools',
  },
  {
    dirName: 'plugin-pptx',
    id: 'aionui-plugin-pptx',
    skillNames: ['pptx'],
    displayName: 'PowerPoint Tools',
  },
  {
    dirName: 'plugin-docx',
    id: 'aionui-plugin-docx',
    skillNames: ['docx'],
    displayName: 'Word Document Tools',
  },
  {
    dirName: 'plugin-xlsx',
    id: 'aionui-plugin-xlsx',
    skillNames: ['xlsx'],
    displayName: 'Excel Tools',
  },
  // ── New plugins providing assistants ───────────────────────────────────
  {
    dirName: 'plugin-content-converters',
    id: 'aionui-plugin-content-converters',
    skillNames: ['pdf', 'pptx'], // Uses skills from other plugins
    displayName: 'Content Converters',
  },
  {
    dirName: 'plugin-creators',
    id: 'aionui-plugin-creators',
    skillNames: [],
    displayName: 'Creators',
  },
];

/**
 * Resolve the directory where built-in plugin packages live.
 *
 * In packaged app: {app.asar.unpacked}/builtin-plugins/
 * In development:  {projectRoot}/plugins/
 */
export function resolveBuiltinPluginsDir(): string {
  // In production, plugins would be under builtin-plugins/ in the app bundle
  // In development, use process.cwd() to get the project root
  // (because __dirname points to .webpack/main which is not reliable)
  const pluginsDir = path.join(process.cwd(), 'plugins');
  return pluginsDir;
}

/**
 * Load a built-in plugin module and return the AionPlugin instance.
 *
 * This loads the plugin's src/index.ts (or compiled dist/index.js)
 * and returns the default export.
 */
export function loadBuiltinPlugin(descriptor: BuiltinPluginDescriptor): AionPlugin | null {
  const pluginsDir = resolveBuiltinPluginsDir();
  const pluginDir = path.join(pluginsDir, descriptor.dirName);

  try {
    // Use eval('require') to prevent webpack from intercepting the require() call
    // This allows us to load external plugins at runtime
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-eval
    const dynamicRequire = eval('require');

    // Try compiled output first
    let pluginModule: { default?: AionPlugin };
    try {
      const distPath = path.join(pluginDir, 'dist', 'index.js');
      pluginModule = dynamicRequire(distPath);
    } catch (distErr) {
      // Fallback to source if dist not available
      try {
        const srcPath = path.join(pluginDir, 'src', 'index.js');
        pluginModule = dynamicRequire(srcPath);
      } catch (srcErr) {
        throw new Error(`Failed to load from dist or src: ${(distErr as Error).message}`);
      }
    }

    const plugin = (pluginModule.default || pluginModule) as AionPlugin;
    if (!plugin || !plugin.id || typeof plugin.activate !== 'function') {
      console.warn(`[BuiltinPlugins] Plugin "${descriptor.id}" does not export a valid AionPlugin`);
      return null;
    }

    return plugin as AionPlugin;
  } catch (err) {
    console.warn(`[BuiltinPlugins] Failed to load plugin "${descriptor.id}":`, (err as Error).message);
    return null;
  }
}

/**
 * Create a registry entry for a built-in plugin.
 * Built-in plugins are pre-registered with state='active' and all permissions granted.
 */
export function createBuiltinRegistryEntry(descriptor: BuiltinPluginDescriptor, plugin: AionPlugin): PluginRegistryEntry {
  const pluginsDir = resolveBuiltinPluginsDir();
  const installPath = path.join(pluginsDir, descriptor.dirName);

  return {
    id: plugin.id,
    version: plugin.version,
    source: 'local',
    sourceRef: installPath,
    installPath,
    manifest: {
      pluginVersion: '1.0',
      displayName: descriptor.displayName,
      description: `Built-in ${descriptor.displayName} plugin`,
      category: 'document',
    },
    state: 'active',
    // Built-in plugins get all permissions automatically
    grantedPermissions: ['fs:read', 'fs:write', 'shell:execute'],
    settings: {},
    installedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Get the skill names for a given set of enabled skills that are provided
 * by built-in plugins. Used to determine which plugins should be active
 * for the current conversation.
 *
 * @param enabledSkills - The skills the user has enabled on their assistant
 * @returns The built-in plugin descriptors whose skills are enabled
 */
export function getActiveBuiltinPlugins(enabledSkills: string[]): BuiltinPluginDescriptor[] {
  if (!enabledSkills || enabledSkills.length === 0) return [];

  const enabledSet = new Set(enabledSkills);
  return BUILTIN_PLUGINS.filter((desc) => desc.skillNames.some((name) => enabledSet.has(name)));
}
