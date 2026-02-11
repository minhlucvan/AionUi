/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Preview App System Types
 *
 * Defines the protocol and interfaces for the extensible preview app architecture.
 * Preview apps are independent web applications that run on their own server,
 * communicate via WebSocket protocol, and can expose capabilities for agent interaction.
 */

// ==================== App Manifest & Registration ====================

/**
 * Static manifest declaring a preview app's identity and capabilities.
 * Used for registration and discovery.
 */
export type PreviewAppManifest = {
  /** Unique app identifier (e.g., 'code-editor', 'markdown-preview') */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Short description of what the app does */
  description: string;
  /** Semantic version string */
  version: string;
  /** File extensions this app can handle (e.g., ['.ts', '.js', '.py']) */
  fileExtensions?: string[];
  /** Content types this app can handle (e.g., ['code', 'markdown']) */
  contentTypes?: string[];
  /** MIME types this app can handle */
  mimeTypes?: string[];
  /** Whether this app supports editing (not just viewing) */
  editable?: boolean;
  /** App icon (URL or base64 data URI) */
  icon?: string;
  /** Capabilities this app exposes for agent interaction */
  capabilities?: PreviewAppCapabilityDeclaration[];
  /** App entry point configuration */
  entry: PreviewAppEntry;
};

/**
 * How to start/load the preview app.
 */
export type PreviewAppEntry = {
  /** 'builtin' = shipped with AionUi, 'external' = loaded from a path/URL */
  kind: 'builtin' | 'external';
  /**
   * For builtin: directory name under src/previewApps/
   * For external: absolute path to the app directory or a URL
   */
  source: string;
};

// ==================== App Capabilities (Agent-callable) ====================

/**
 * Declares a capability that the app exposes for agent interaction.
 */
export type PreviewAppCapabilityDeclaration = {
  /** Capability name (e.g., 'gotoLine', 'insertText', 'formatDocument') */
  name: string;
  /** Human-readable description for agent discovery */
  description: string;
  /** JSON Schema for the parameters this capability accepts */
  paramsSchema?: Record<string, unknown>;
};

/**
 * A registered capability with its runtime handler info.
 */
export type PreviewAppCapability = PreviewAppCapabilityDeclaration & {
  /** The app that registered this capability */
  appId: string;
  /** The app instance ID (for routing) */
  instanceId: string;
};

// ==================== App Instance (Runtime State) ====================

export type PreviewAppStatus = 'starting' | 'running' | 'stopping' | 'stopped' | 'error';

/**
 * Runtime state of a preview app instance.
 */
export type PreviewAppInstance = {
  /** Unique instance ID (generated at start) */
  instanceId: string;
  /** The app's manifest ID */
  appId: string;
  /** Current status */
  status: PreviewAppStatus;
  /** Port the app's HTTP server is listening on */
  port: number;
  /** Full URL to access the app (e.g., http://localhost:PORT) */
  url: string;
  /** Capabilities registered by this instance */
  capabilities: PreviewAppCapability[];
  /** Error message if status is 'error' */
  error?: string;
  /** Timestamp when the instance was started */
  startedAt: number;
};

// ==================== Protocol Messages (WebSocket) ====================

/**
 * Base message structure for all protocol messages.
 */
type PreviewAppMessageBase = {
  /** Unique message ID for request-response correlation */
  id: string;
  /** Timestamp */
  ts: number;
};

// --- Messages from Backend to App ---

/** Open a resource in the app */
export type BackendOpenMessage = PreviewAppMessageBase & {
  type: 'backend:open';
  payload: {
    filePath?: string;
    content?: string;
    language?: string;
    contentType?: string;
    workspace?: string;
    metadata?: Record<string, unknown>;
  };
};

/** Content was updated externally (e.g., agent wrote the file) */
export type BackendContentUpdateMessage = PreviewAppMessageBase & {
  type: 'backend:content-update';
  payload: {
    filePath: string;
    content: string;
    source: 'agent' | 'filesystem' | 'user';
  };
};

/** Execute an app capability (triggered by agent) */
export type BackendExecuteMessage = PreviewAppMessageBase & {
  type: 'backend:execute';
  payload: {
    capability: string;
    params: Record<string, unknown>;
    /** Conversation ID for context */
    conversationId?: string;
  };
};

/** Theme changed */
export type BackendThemeMessage = PreviewAppMessageBase & {
  type: 'backend:theme';
  payload: {
    theme: 'light' | 'dark';
    colors?: Record<string, string>;
  };
};

/** Response to an app request */
export type BackendResponseMessage = PreviewAppMessageBase & {
  type: 'backend:response';
  payload: {
    requestId: string;
    success: boolean;
    data?: unknown;
    error?: string;
  };
};

export type BackendMessage = BackendOpenMessage | BackendContentUpdateMessage | BackendExecuteMessage | BackendThemeMessage | BackendResponseMessage;

// --- Messages from App to Backend ---

/** App is ready and reports its capabilities */
export type AppReadyMessage = PreviewAppMessageBase & {
  type: 'app:ready';
  payload: {
    appId: string;
    capabilities: PreviewAppCapabilityDeclaration[];
  };
};

/** App requests to save current content */
export type AppSaveMessage = PreviewAppMessageBase & {
  type: 'app:save';
  payload: {
    filePath: string;
    content: string;
  };
};

/** App requests to read a file */
export type AppFileReadMessage = PreviewAppMessageBase & {
  type: 'app:file-read';
  payload: {
    filePath: string;
  };
};

/** App requests to write a file */
export type AppFileWriteMessage = PreviewAppMessageBase & {
  type: 'app:file-write';
  payload: {
    filePath: string;
    content: string;
  };
};

/** App reports the result of a capability execution */
export type AppExecuteResultMessage = PreviewAppMessageBase & {
  type: 'app:execute-result';
  payload: {
    requestId: string;
    success: boolean;
    data?: unknown;
    error?: string;
  };
};

/** App reports content was changed by the user */
export type AppContentChangedMessage = PreviewAppMessageBase & {
  type: 'app:content-changed';
  payload: {
    filePath?: string;
    content: string;
    isDirty: boolean;
  };
};

/** Generic request from app to backend */
export type AppRequestMessage = PreviewAppMessageBase & {
  type: 'app:request';
  payload: {
    action: string;
    data?: unknown;
  };
};

export type AppMessage = AppReadyMessage | AppSaveMessage | AppFileReadMessage | AppFileWriteMessage | AppExecuteResultMessage | AppContentChangedMessage | AppRequestMessage;

/** Union of all protocol messages */
export type PreviewAppProtocolMessage = BackendMessage | AppMessage;

// ==================== IPC Types (Renderer ↔ Main Process) ====================

/** Parameters for launching a preview app */
export type LaunchPreviewAppParams = {
  appId: string;
  /** Optional resource to open immediately */
  resource?: {
    filePath?: string;
    content?: string;
    language?: string;
    contentType?: string;
    workspace?: string;
    metadata?: Record<string, unknown>;
  };
};

/** Parameters for executing an app capability via agent */
export type ExecuteAppCapabilityParams = {
  instanceId: string;
  capability: string;
  params: Record<string, unknown>;
  conversationId?: string;
};

/** Info about a running preview app, sent to the renderer */
export type PreviewAppInfo = {
  instanceId: string;
  appId: string;
  name: string;
  description: string;
  url: string;
  port: number;
  status: PreviewAppStatus;
  capabilities: PreviewAppCapabilityDeclaration[];
  editable?: boolean;
  icon?: string;
};
