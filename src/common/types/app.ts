/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * App platform types.
 *
 * AionUi is a platform for AI-powered mini-apps. Each app:
 *   - Provides its own UI (served as iframe)
 *   - Exposes tools the AI agent can call (MCP-compatible schema)
 *   - Emits/receives events for real-time coordination
 *   - Integrates with the workspace and file system
 *
 * Apps can be:
 *   - Bundled: shipped with AionUi in src/apps/<appName>/app.json
 *   - Workspace: project-level in .aionui/app.json
 *   - Process: run their own server (React, Streamlit, etc.)
 *   - Static: served directly by AppServer (HTML + SDK)
 */

// ==================== App Tools (MCP-compatible) ====================

/**
 * Tool exposed by an app that the AI agent can call.
 * Schema follows MCP tool format for direct agent integration.
 */
export type AppTool = {
  name: string;
  description: string;
  /** JSON Schema for tool parameters */
  parameters?: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
};

/** @deprecated Use AppTool instead */
export type AppCapability = AppTool;

// ==================== App Config ====================

/** Config loaded from app.json (bundled or workspace) */
export type AppConfig = {
  name: string;
  description?: string;
  /** Content types this app handles (e.g., ['excalidraw', 'financial-chart']) */
  contentTypes?: string[];
  /** File extensions this app handles (e.g., ['.excalidraw']) */
  fileExtensions?: string[];
  /** Whether this app supports editing */
  editable?: boolean;
  /** Tools this app exposes to the AI agent */
  tools?: AppTool[];
  /** @deprecated Use tools instead */
  capabilities?: AppTool[];
  /** Events this app emits (for documentation / discovery) */
  events?: string[];
  /**
   * Command to start the app's own server (React, Streamlit, etc.).
   * If set, the iframe points directly to the app's server.
   * Use {port} placeholder for auto-assigned port.
   */
  command?: string;
  /** Fixed port for the app server (0 or omitted = auto-assign) */
  port?: number;
};

// ==================== Runtime Types ====================

/** Runtime session: one per opened app instance */
export type AppSession = {
  sessionId: string;
  appName: string;
  url: string;
  editable?: boolean;
  tools: AppTool[];
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

// ==================== Workspace App Config ====================

/**
 * Workspace app config (.aionui/app.json).
 * Turns a project into an AI-powered mini-app.
 *
 * Example - Streamlit dashboard:
 * {
 *   "name": "Financial Dashboard",
 *   "command": "streamlit run app.py --server.port {port}",
 *   "tools": [
 *     {
 *       "name": "update_chart",
 *       "description": "Update chart with new data",
 *       "parameters": {
 *         "type": "object",
 *         "properties": {
 *           "chartId": { "type": "string" },
 *           "data": { "type": "array" }
 *         },
 *         "required": ["chartId", "data"]
 *       }
 *     }
 *   ],
 *   "events": ["chart-clicked", "selection-changed"]
 * }
 */
export type WorkspaceAppConfig = {
  name?: string;
  description?: string;
  command: string;
  port?: number;
  tools?: AppTool[];
  events?: string[];
};

/** @deprecated Use WorkspaceAppConfig instead */
export type WorkspacePreviewConfig = WorkspaceAppConfig;

// ==================== Protocol Messages ====================

/** WebSocket message envelope (app ↔ backend) */
export type AppMessage = {
  id: string;
  ts: number;
  type: string;
  payload?: Record<string, unknown>;
};

/**
 * Protocol message types:
 *
 * App → Backend:
 *   app:ready          - App loaded, registers tools
 *   app:tool-result    - Result of a tool call
 *   app:event          - App emits a typed event
 *   app:content-changed - Content updated (dirty tracking)
 *   app:file-read      - Read a file
 *   app:file-write     - Write a file
 *   app:save           - Save current content
 *
 * Backend → App:
 *   backend:open       - Open a resource in the app
 *   backend:call-tool  - Call a tool on the app
 *   backend:event      - Send event to app
 *   backend:context    - Share workspace/conversation context
 *   backend:theme      - Theme change
 *   backend:content-update - External content update (from agent)
 */
