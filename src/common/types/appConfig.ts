/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * app.json configuration schema
 *
 * Placed in the workspace root directory to declare previewable web apps.
 * When detected, a "Preview App" button appears in the workspace toolbar.
 *
 * Example app.json:
 * ```json
 * {
 *   "name": "Finance Dashboard",
 *   "url": "http://localhost:8050",
 *   "type": "dash",
 *   "description": "Interactive financial analysis dashboard",
 *   "icon": "chart-line"
 * }
 * ```
 */
export type AppConfig = {
  /** Display name of the app */
  name: string;
  /** URL to preview (e.g., http://localhost:8050) */
  url: string;
  /** Framework type (dash, flask, streamlit, etc.) - for display only */
  type?: string;
  /** Short description of the app */
  description?: string;
  /** Icon identifier (icon-park icon name) */
  icon?: string;
};

/** File name for app configuration */
export const APP_CONFIG_FILE = 'app.json';
