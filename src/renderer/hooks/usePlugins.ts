/**
 * usePlugins - React hook for plugin management
 *
 * Provides access to the plugin system via IPC bridge:
 * - Query installed plugins
 * - Install from npm, GitHub, or local sources
 * - Activate/deactivate plugins
 * - Check for updates
 * - Listen to plugin events
 */

import { useCallback, useEffect, useState } from 'react';
import { plugin } from '@/common/ipcBridge';
import type { PluginRegistryEntry, PluginPermission } from '@/plugin/types';

/**
 * Hook for querying and managing the full plugin list
 */
export function usePlugins() {
  const [plugins, setPlugins] = useState<PluginRegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlugins = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await plugin.list.invoke();
      if (result.success && result.data) {
        setPlugins(result.data);
      } else {
        setError(result.msg || 'Failed to fetch plugins');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPlugins();

    // Listen for plugin events
    const unlistenActivated = plugin.pluginActivated.on(() => {
      void fetchPlugins();
    });

    const unlistenDeactivated = plugin.pluginDeactivated.on(() => {
      void fetchPlugins();
    });

    return () => {
      unlistenActivated();
      unlistenDeactivated();
    };
  }, [fetchPlugins]);

  return {
    plugins,
    loading,
    error,
    refetch: fetchPlugins,
  };
}

/**
 * Hook for querying active plugins only
 */
export function useActivePlugins() {
  const [plugins, setPlugins] = useState<PluginRegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlugins = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await plugin.listActive.invoke();
      if (result.success && result.data) {
        setPlugins(result.data);
      } else {
        setError(result.msg || 'Failed to fetch active plugins');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPlugins();
  }, [fetchPlugins]);

  return {
    plugins,
    loading,
    error,
    refetch: fetchPlugins,
  };
}

/**
 * Hook for plugin installation operations
 */
export function usePluginInstall() {
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const installFromNpm = useCallback(async (packageName: string, version?: string) => {
    try {
      setInstalling(true);
      setError(null);
      const result = await plugin.installNpm.invoke({ packageName, version });
      const errorMsg = result.msg;
      if (!result.success) {
        setError(errorMsg || 'Failed to install plugin');
        return { success: false, error: errorMsg };
      }
      return { success: true, pluginId: result.data?.pluginId };
    } catch (err) {
      const errorMsg = (err as Error).message;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setInstalling(false);
    }
  }, []);

  const installFromGithub = useCallback(async (repo: string, ref?: string) => {
    try {
      setInstalling(true);
      setError(null);
      const result = await plugin.installGithub.invoke({ repo, ref });
      const errorMsg = result.msg;
      if (!result.success) {
        setError(errorMsg || 'Failed to install plugin');
        return { success: false, error: errorMsg };
      }
      return { success: true, pluginId: result.data?.pluginId };
    } catch (err) {
      const errorMsg = (err as Error).message;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setInstalling(false);
    }
  }, []);

  const installFromLocal = useCallback(async (dirPath: string) => {
    try {
      setInstalling(true);
      setError(null);
      const result = await plugin.installLocal.invoke({ dirPath });
      const errorMsg = result.msg;
      if (!result.success) {
        setError(errorMsg || 'Failed to install plugin');
        return { success: false, error: errorMsg };
      }
      return { success: true, pluginId: result.data?.pluginId };
    } catch (err) {
      const errorMsg = (err as Error).message;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setInstalling(false);
    }
  }, []);

  return {
    installFromNpm,
    installFromGithub,
    installFromLocal,
    installing,
    error,
  };
}

/**
 * Hook for plugin lifecycle management (activate/deactivate/uninstall)
 */
export function usePluginActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activate = useCallback(async (pluginId: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await plugin.activate.invoke({ pluginId });
      const errorMsg = result.msg;
      if (!result.success) {
        setError(errorMsg || 'Failed to activate plugin');
        return { success: false, error: errorMsg };
      }
      return { success: true };
    } catch (err) {
      const errorMsg = (err as Error).message;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  const deactivate = useCallback(async (pluginId: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await plugin.deactivate.invoke({ pluginId });
      const errorMsg = result.msg;
      if (!result.success) {
        setError(errorMsg || 'Failed to deactivate plugin');
        return { success: false, error: errorMsg };
      }
      return { success: true };
    } catch (err) {
      const errorMsg = (err as Error).message;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  const uninstall = useCallback(async (pluginId: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await plugin.uninstall.invoke({ pluginId });
      const errorMsg = result.msg;
      if (!result.success) {
        setError(errorMsg || 'Failed to uninstall plugin');
        return { success: false, error: errorMsg };
      }
      return { success: true };
    } catch (err) {
      const errorMsg = (err as Error).message;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    activate,
    deactivate,
    uninstall,
    loading,
    error,
  };
}

/**
 * Hook for checking plugin updates
 */
export function usePluginUpdates() {
  const [updates, setUpdates] = useState<Array<{ pluginId: string; currentVersion: string; latestVersion: string }>>([]);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkUpdates = useCallback(async () => {
    try {
      setChecking(true);
      setError(null);
      const result = await plugin.checkUpdates.invoke();
      if (result.success && result.data) {
        setUpdates(result.data);
      } else {
        setError(result.msg || 'Failed to check updates');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setChecking(false);
    }
  }, []);

  return {
    updates,
    checkUpdates,
    checking,
    error,
  };
}

/**
 * Hook for managing plugin permissions
 */
export function usePluginPermissions(pluginId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grantPermissions = useCallback(
    async (permissions: PluginPermission[]) => {
      try {
        setLoading(true);
        setError(null);
        const result = await plugin.grantPermissions.invoke({ pluginId, permissions });
        const errorMsg = result.msg;
        if (!result.success) {
          setError(errorMsg || 'Failed to grant permissions');
          return { success: false, error: errorMsg };
        }
        return { success: true };
      } catch (err) {
        const errorMsg = (err as Error).message;
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setLoading(false);
      }
    },
    [pluginId]
  );

  const revokePermissions = useCallback(
    async (permissions: PluginPermission[]) => {
      try {
        setLoading(true);
        setError(null);
        const result = await plugin.revokePermissions.invoke({ pluginId, permissions });
        const errorMsg = result.msg;
        if (!result.success) {
          setError(errorMsg || 'Failed to revoke permissions');
          return { success: false, error: errorMsg };
        }
        return { success: true };
      } catch (err) {
        const errorMsg = (err as Error).message;
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setLoading(false);
      }
    },
    [pluginId]
  );

  return {
    grantPermissions,
    revokePermissions,
    loading,
    error,
  };
}
