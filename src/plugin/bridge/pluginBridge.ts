/**
 * Plugin IPC Bridge
 *
 * Exposes plugin management operations to the renderer process via
 * the existing IPC bridge pattern used throughout AionUi.
 *
 * This module registers handlers for plugin-related IPC channels so
 * the settings UI can install, activate, and configure plugins.
 *
 * IMPORTANT: Uses @office-ai/platform bridge.buildProvider() pattern
 * to properly connect with ipcBridge.ts exports
 */

import { ipcBridge } from '@/common';
import type { PluginManager } from '../PluginManager';

/**
 * Initialize the plugin IPC bridge.
 * Call this during main process bridge initialization (initPluginBridgeIfReady).
 */
export function initPluginBridge(pluginManager: PluginManager): void {
  // ── Query Handlers ──────────────────────────────────────────────────────

  ipcBridge.plugin.list.provider(async () => {
    try {
      const plugins = pluginManager.getPlugins();
      // Add isActive field for UI compatibility - check actual plugin state, not registry
      const pluginsWithActiveFlag = plugins.map(plugin => ({
        ...plugin,
        isActive: pluginManager.isPluginActive(plugin.id) && !plugin.error,
      }));
      console.log('[PluginBridge] Returning plugins:', pluginsWithActiveFlag.map(p => ({
        id: p.id,
        state: p.state,
        isActive: p.isActive,
        error: p.error
      })));
      return { success: true, data: pluginsWithActiveFlag };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcBridge.plugin.get.provider(async ({ pluginId }) => {
    try {
      const plugin = pluginManager.getPlugin(pluginId);
      if (!plugin) {
        return { success: false, error: 'Plugin not found' };
      }
      // Add isActive field for UI compatibility - check actual plugin state, not registry
      const pluginWithActiveFlag = {
        ...plugin,
        isActive: pluginManager.isPluginActive(plugin.id) && !plugin.error,
      };
      return { success: true, data: pluginWithActiveFlag };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcBridge.plugin.listActive.provider(async () => {
    try {
      const plugins = pluginManager.getActivePlugins();
      // Add isActive field for UI compatibility - these are already active by definition
      const pluginsWithActiveFlag = plugins.map(plugin => ({
        ...plugin,
        isActive: true, // Already filtered to active plugins
      }));
      return { success: true, data: pluginsWithActiveFlag };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // ── Installation Handlers ───────────────────────────────────────────────

  ipcBridge.plugin.installNpm.provider(async ({ packageName, version }) => {
    try {
      const result = await pluginManager.installFromNpm(packageName, version);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      return { success: true, data: { pluginId: result.pluginId! } };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcBridge.plugin.installGithub.provider(async ({ repository, ref }) => {
    try {
      const result = await pluginManager.installFromGithub(repository, ref);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      return { success: true, data: { pluginId: result.pluginId! } };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcBridge.plugin.installLocal.provider(async ({ path }) => {
    try {
      const result = await pluginManager.installFromLocal(path);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      return { success: true, data: { pluginId: result.pluginId! } };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcBridge.plugin.uninstall.provider(async ({ pluginId }) => {
    try {
      return await pluginManager.uninstall(pluginId);
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // ── Lifecycle Handlers ──────────────────────────────────────────────────

  ipcBridge.plugin.activate.provider(async ({ pluginId }) => {
    try {
      return await pluginManager.activatePlugin(pluginId);
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcBridge.plugin.deactivate.provider(async ({ pluginId }) => {
    try {
      return await pluginManager.deactivatePlugin(pluginId);
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // ── Settings & Permissions Handlers ─────────────────────────────────────

  ipcBridge.plugin.updateSettings.provider(async ({ pluginId, settings }) => {
    try {
      return await pluginManager.updatePluginSettings(pluginId, settings);
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcBridge.plugin.grantPermissions.provider(async ({ pluginId, permissions }) => {
    try {
      return await pluginManager.grantPermissions(pluginId, permissions);
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcBridge.plugin.revokePermissions.provider(async ({ pluginId, permissions }) => {
    try {
      return await pluginManager.revokePermissions(pluginId, permissions);
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // ── Update Check Handler ────────────────────────────────────────────────

  ipcBridge.plugin.checkUpdates.provider(async () => {
    try {
      const updates = await pluginManager.checkForUpdates();
      return { success: true, data: updates };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // ── Forward Plugin Events to Renderer ───────────────────────────────────

  pluginManager.on('plugin:activated', (data) => {
    // Emit through the bridge event system
    ipcBridge.plugin.pluginActivated.emit(data as { pluginId: string });
  });

  pluginManager.on('plugin:deactivated', (data) => {
    // Emit through the bridge event system
    ipcBridge.plugin.pluginDeactivated.emit(data as { pluginId: string });
  });

  pluginManager.on('plugin:error', (data) => {
    // Emit through the bridge event system
    ipcBridge.plugin.pluginError.emit(data as { pluginId: string; error: string });
  });
}

// ─── IPC Channel Names (for backward compatibility) ──────────────────────────

export const PLUGIN_CHANNELS = {
  // Query
  LIST: 'plugin:list',
  GET: 'plugin:get',
  LIST_ACTIVE: 'plugin:list-active',

  // Installation
  INSTALL_NPM: 'plugin:install-npm',
  INSTALL_GITHUB: 'plugin:install-github',
  INSTALL_LOCAL: 'plugin:install-local',
  UNINSTALL: 'plugin:uninstall',

  // Lifecycle
  ACTIVATE: 'plugin:activate',
  DEACTIVATE: 'plugin:deactivate',

  // Settings & Permissions
  UPDATE_SETTINGS: 'plugin:update-settings',
  GRANT_PERMISSIONS: 'plugin:grant-permissions',
  REVOKE_PERMISSIONS: 'plugin:revoke-permissions',

  // Updates
  CHECK_UPDATES: 'plugin:check-updates',

  // Events (main → renderer)
  PLUGIN_ACTIVATED: 'plugin:event:activated',
  PLUGIN_DEACTIVATED: 'plugin:event:deactivated',
  PLUGIN_ERROR: 'plugin:event:error',
} as const;
