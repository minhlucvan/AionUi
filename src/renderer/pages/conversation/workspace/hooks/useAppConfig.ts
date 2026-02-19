/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { AppConfig } from '@/common/types/appConfig';
import { APP_CONFIG_FILE } from '@/common/types/appConfig';
import { useCallback, useEffect, useState } from 'react';

/**
 * Hook to detect and read app.json from the workspace directory.
 *
 * When a workspace contains an app.json file, this hook parses it
 * and returns the app configuration for the preview system.
 *
 * @param workspace - Absolute path to the workspace directory
 * @returns {{ appConfig, loading, refresh }}
 */
export const useAppConfig = (workspace: string | undefined) => {
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAppConfig = useCallback(async () => {
    if (!workspace) {
      setAppConfig(null);
      return;
    }

    setLoading(true);
    try {
      const separator = workspace.includes('\\') ? '\\' : '/';
      const configPath = `${workspace}${separator}${APP_CONFIG_FILE}`;
      const content = await ipcBridge.fs.readFile.invoke({ path: configPath });

      if (content) {
        const parsed = JSON.parse(content) as AppConfig;
        // Validate required fields
        if (parsed.name && parsed.url) {
          setAppConfig(parsed);
        } else {
          setAppConfig(null);
        }
      }
    } catch {
      // app.json doesn't exist or is invalid - that's normal
      setAppConfig(null);
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  useEffect(() => {
    void loadAppConfig();
  }, [loadAppConfig]);

  return { appConfig, loading, refresh: loadAppConfig };
};
