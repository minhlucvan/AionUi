/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Schema for app.json workspace configuration file
 *
 * Place an `app.json` file in the workspace root to define previewable apps.
 * When detected, a "Preview App" button appears in the conversation header.
 *
 * Example app.json:
 * ```json
 * {
 *   "name": "My Dash App",
 *   "type": "dash",
 *   "url": "http://localhost:8050"
 * }
 * ```
 *
 * Multiple apps:
 * ```json
 * {
 *   "apps": [
 *     { "name": "Dashboard", "type": "dash", "url": "http://localhost:8050" },
 *     { "name": "API Docs", "type": "fastapi", "url": "http://localhost:8000/docs" }
 *   ]
 * }
 * ```
 */

/**
 * Single app entry in the workspace app config
 */
export type WorkspaceApp = {
  /** Display name for the app (shown in preview tab title) */
  name: string;
  /** Framework type (dash, flask, streamlit, fastapi, gradio, vite, nextjs, custom) */
  type?: string;
  /** URL to preview (e.g., http://localhost:8050) */
  url: string;
  /** Optional description */
  description?: string;
  /** Optional icon (icon-park icon name or emoji) */
  icon?: string;
};

/**
 * Raw app.json file structure (supports single app or multiple apps)
 */
export type WorkspaceAppConfig =
  | WorkspaceApp
  | {
      apps: WorkspaceApp[];
    };

/**
 * Normalized config always returns an array of apps
 */
export type NormalizedAppConfig = {
  apps: WorkspaceApp[];
};

/** Filename to look for in workspace root */
export const APP_CONFIG_FILENAME = 'app.json';

/**
 * Normalize raw app.json config into a consistent array format
 */
export function normalizeAppConfig(raw: WorkspaceAppConfig): NormalizedAppConfig {
  if ('apps' in raw && Array.isArray(raw.apps)) {
    return { apps: raw.apps.filter(isValidApp) };
  }
  // Single app object
  if (isValidApp(raw as WorkspaceApp)) {
    return { apps: [raw as WorkspaceApp] };
  }
  return { apps: [] };
}

/**
 * Validate that an app entry has the minimum required fields
 */
function isValidApp(app: WorkspaceApp): boolean {
  return Boolean(app && typeof app.name === 'string' && app.name.trim() && typeof app.url === 'string' && app.url.trim());
}
