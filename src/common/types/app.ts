/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Simplified app types for the preview app system.
 *
 * Each app lives in src/apps/<appName>/ with an app.json config.
 * Folder name = app name. No complex registry needed.
 */

/** Config loaded from apps/<appName>/app.json */
export type AppConfig = {
  name: string;
  description?: string;
  /** Content types this app handles (e.g., ['excalidraw', 'code']) */
  contentTypes?: string[];
  /** File extensions this app handles (e.g., ['.excalidraw']) */
  fileExtensions?: string[];
  /** Whether this app supports editing */
  editable?: boolean;
  /** Agent-callable capabilities */
  capabilities?: AppCapability[];
};

export type AppCapability = {
  name: string;
  description: string;
  paramsSchema?: Record<string, unknown>;
};

/** Runtime session: one per opened resource */
export type AppSession = {
  sessionId: string;
  appName: string;
  url: string;
  editable?: boolean;
  capabilities: AppCapability[];
};

/** Resource to open in an app */
export type AppResource = {
  filePath?: string;
  content?: string;
  language?: string;
  contentType?: string;
  workspace?: string;
};

/** App info returned from listing (config + folder name) */
export type AppInfo = AppConfig & {
  appName: string;
};
