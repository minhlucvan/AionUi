/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PreviewAppRegistry - Central registry for preview app management.
 *
 * Responsibilities:
 * - Register and discover preview app manifests
 * - Launch and stop app instances
 * - Route agent capability calls to running app instances
 * - Track all running instances
 */

import crypto from 'crypto';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import type { WebSocket } from 'ws';
import type {
  AppMessage,
  ExecuteAppCapabilityParams,
  LaunchPreviewAppParams,
  PreviewAppCapability,
  PreviewAppInfo,
  PreviewAppManifest,
} from '@/common/types/previewApp';
import { PreviewAppServer } from './PreviewAppServer';

type AppMessageListener = (instanceId: string, msg: AppMessage) => void;

/**
 * Resolve the `previewApps/` directory for both dev and production builds.
 * Uses the same strategy as `resolveBuiltinDir` in initStorage / toolRegistry.
 */
function resolvePreviewAppsDir(): string {
  const appPath = app.getAppPath();
  let candidates: string[];

  if (app.isPackaged) {
    const unpackedPath = appPath.replace('app.asar', 'app.asar.unpacked');
    candidates = [path.join(unpackedPath, 'previewApps'), path.join(appPath, 'previewApps')];
  } else {
    candidates = [
      path.join(appPath, 'previewApps'),
      path.join(appPath, '..', 'previewApps'),
      path.join(appPath, '..', '..', 'previewApps'),
      path.join(appPath, '..', '..', '..', 'previewApps'),
      path.join(process.cwd(), 'src', 'previewApps'),
      path.join(process.cwd(), 'previewApps'),
    ];
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  console.warn('[PreviewAppRegistry] Could not find previewApps directory, tried:', candidates);
  return candidates[0];
}

class PreviewAppRegistry {
  /** Registered app manifests (keyed by appId) */
  private manifests = new Map<string, PreviewAppManifest>();

  /** Running app instances (keyed by instanceId) */
  private instances = new Map<string, PreviewAppServer>();

  /** External message listeners */
  private messageListeners: AppMessageListener[] = [];

  /** Directory where builtin preview apps are stored */
  private builtinAppsDir: string;

  constructor() {
    this.builtinAppsDir = resolvePreviewAppsDir();
  }

  /**
   * Register a preview app manifest.
   * For builtin apps, validates the entry source directory exists.
   */
  registerApp(manifest: PreviewAppManifest): void {
    if (this.manifests.has(manifest.id)) {
      console.warn(`[PreviewAppRegistry] App '${manifest.id}' is already registered, overwriting`);
    }

    this.manifests.set(manifest.id, manifest);
    console.log(`[PreviewAppRegistry] Registered app: ${manifest.id} (${manifest.name})`);
  }

  /** Unregister an app manifest and stop any running instances */
  async unregisterApp(appId: string): Promise<void> {
    // Stop all instances of this app
    for (const [instanceId, server] of this.instances) {
      if (server.manifest.id === appId) {
        await server.stop();
        this.instances.delete(instanceId);
      }
    }

    this.manifests.delete(appId);
    console.log(`[PreviewAppRegistry] Unregistered app: ${appId}`);
  }

  /** Get all registered app manifests */
  getRegisteredApps(): PreviewAppManifest[] {
    return Array.from(this.manifests.values());
  }

  /** Get a specific manifest */
  getManifest(appId: string): PreviewAppManifest | undefined {
    return this.manifests.get(appId);
  }

  /**
   * Launch a preview app instance.
   * Creates a new server, starts it, and optionally opens a resource.
   */
  async launchApp(params: LaunchPreviewAppParams): Promise<PreviewAppInfo> {
    const manifest = this.manifests.get(params.appId);
    if (!manifest) {
      throw new Error(`App '${params.appId}' is not registered`);
    }

    const staticDir = this.resolveStaticDir(manifest);
    if (!fs.existsSync(staticDir)) {
      throw new Error(`App static directory not found: ${staticDir}`);
    }

    const sdkDir = path.join(this.builtinAppsDir, 'sdk');
    const server = new PreviewAppServer(manifest, staticDir, fs.existsSync(sdkDir) ? sdkDir : undefined);

    // Wire up message handling
    server.onMessage((msg: AppMessage, ws: WebSocket) => {
      this.handleAppMessage(server.instanceId, msg, ws, server);
    });

    // Start the server
    await server.start();

    // Track the instance
    this.instances.set(server.instanceId, server);

    // If a resource was provided, send it after the app connects
    if (params.resource) {
      // The app needs time to connect via WebSocket.
      // We'll send the open message once the app sends 'app:ready'
      const resource = params.resource;
      const originalHandler = server['messageHandler'];
      server.onMessage((msg, ws) => {
        if (msg.type === 'app:ready') {
          // Send the open command
          server.broadcast({
            id: crypto.randomUUID(),
            ts: Date.now(),
            type: 'backend:open',
            payload: {
              filePath: resource.filePath,
              content: resource.content,
              language: resource.language,
              contentType: resource.contentType,
              workspace: resource.workspace,
              metadata: resource.metadata,
            },
          });
        }
        // Still forward to the registry handler
        this.handleAppMessage(server.instanceId, msg, ws, server);
      });
      // If there was an original handler we need to keep it in the chain
      if (originalHandler) {
        const registryHandler = server['messageHandler']!;
        server.onMessage((msg, ws) => {
          registryHandler(msg, ws);
        });
      }
    }

    return this.toAppInfo(server);
  }

  /** Stop a running app instance */
  async stopApp(instanceId: string): Promise<void> {
    const server = this.instances.get(instanceId);
    if (!server) {
      throw new Error(`Instance '${instanceId}' not found`);
    }

    await server.stop();
    this.instances.delete(instanceId);
  }

  /** Stop all running instances */
  async stopAll(): Promise<void> {
    const stops = Array.from(this.instances.values()).map((s) => s.stop().catch(() => {}));
    await Promise.all(stops);
    this.instances.clear();
  }

  /** Get info about all running instances */
  getRunningInstances(): PreviewAppInfo[] {
    return Array.from(this.instances.values()).map((s) => this.toAppInfo(s));
  }

  /** Get info about a specific instance */
  getInstance(instanceId: string): PreviewAppInfo | undefined {
    const server = this.instances.get(instanceId);
    return server ? this.toAppInfo(server) : undefined;
  }

  /** Find running instances for a specific app */
  getInstancesByApp(appId: string): PreviewAppInfo[] {
    return Array.from(this.instances.values())
      .filter((s) => s.manifest.id === appId)
      .map((s) => this.toAppInfo(s));
  }

  /**
   * Execute a capability on a running app instance.
   * Used by agents to interact with preview apps.
   */
  async executeCapability(params: ExecuteAppCapabilityParams): Promise<unknown> {
    const server = this.instances.get(params.instanceId);
    if (!server) {
      throw new Error(`Instance '${params.instanceId}' not found`);
    }

    if (!server.hasConnectedClients()) {
      throw new Error(`App instance '${params.instanceId}' has no connected clients`);
    }

    // Check capability exists
    const cap = server.getCapabilities().find((c) => c.name === params.capability);
    if (!cap) {
      throw new Error(`Capability '${params.capability}' not found on instance '${params.instanceId}'`);
    }

    // Send execute message and wait for result
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Capability execution timed out: ${params.capability}`));
      }, 30000); // 30 second timeout

      const cleanup = () => {
        clearTimeout(timeout);
        const idx = this.messageListeners.indexOf(listener);
        if (idx !== -1) this.messageListeners.splice(idx, 1);
      };

      const listener: AppMessageListener = (instanceId, msg) => {
        if (instanceId === params.instanceId && msg.type === 'app:execute-result' && msg.payload.requestId === requestId) {
          cleanup();
          if (msg.payload.success) {
            resolve(msg.payload.data);
          } else {
            reject(new Error(msg.payload.error || 'Capability execution failed'));
          }
        }
      };

      this.messageListeners.push(listener);

      server.broadcast({
        id: requestId,
        ts: Date.now(),
        type: 'backend:execute',
        payload: {
          capability: params.capability,
          params: params.params,
          conversationId: params.conversationId,
        },
      });
    });
  }

  /** Get all capabilities across all running instances */
  getAllCapabilities(): PreviewAppCapability[] {
    const caps: PreviewAppCapability[] = [];
    for (const server of this.instances.values()) {
      caps.push(...server.getCapabilities());
    }
    return caps;
  }

  /** Send a content update to all instances tracking a specific file */
  broadcastContentUpdate(filePath: string, content: string, source: 'agent' | 'filesystem' | 'user'): void {
    for (const server of this.instances.values()) {
      server.broadcast({
        id: crypto.randomUUID(),
        ts: Date.now(),
        type: 'backend:content-update',
        payload: { filePath, content, source },
      });
    }
  }

  /** Send a theme change to all running instances */
  broadcastThemeChange(theme: 'light' | 'dark', colors?: Record<string, string>): void {
    for (const server of this.instances.values()) {
      server.broadcast({
        id: crypto.randomUUID(),
        ts: Date.now(),
        type: 'backend:theme',
        payload: { theme, colors },
      });
    }
  }

  /** Register listener for messages from apps */
  addMessageListener(listener: AppMessageListener): () => void {
    this.messageListeners.push(listener);
    return () => {
      const idx = this.messageListeners.indexOf(listener);
      if (idx !== -1) this.messageListeners.splice(idx, 1);
    };
  }

  /**
   * Load and register all builtin preview apps.
   * Each builtin app has a manifest.json in its directory.
   */
  async loadBuiltinApps(): Promise<void> {
    if (!fs.existsSync(this.builtinAppsDir)) {
      console.log(`[PreviewAppRegistry] Builtin apps directory not found: ${this.builtinAppsDir}`);
      return;
    }

    const entries = fs.readdirSync(this.builtinAppsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const manifestPath = path.join(this.builtinAppsDir, entry.name, 'manifest.json');
      if (!fs.existsSync(manifestPath)) continue;

      try {
        const manifestRaw = fs.readFileSync(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestRaw) as PreviewAppManifest;
        // Override entry for builtin apps
        manifest.entry = { kind: 'builtin', source: entry.name };
        this.registerApp(manifest);
      } catch (err) {
        console.error(`[PreviewAppRegistry] Failed to load manifest from ${manifestPath}:`, err);
      }
    }
  }

  // ==================== Private Helpers ====================

  private resolveStaticDir(manifest: PreviewAppManifest): string {
    if (manifest.entry.kind === 'builtin') {
      return path.join(this.builtinAppsDir, manifest.entry.source);
    }
    // External app: source is an absolute path
    return manifest.entry.source;
  }

  private handleAppMessage(instanceId: string, msg: AppMessage, ws: WebSocket, server: PreviewAppServer): void {
    // Handle file operations internally
    if (msg.type === 'app:file-read') {
      this.handleFileRead(msg, ws, server);
      return;
    }
    if (msg.type === 'app:file-write' || msg.type === 'app:save') {
      this.handleFileWrite(msg, ws, server);
      return;
    }

    // Notify all external listeners
    for (const listener of this.messageListeners) {
      listener(instanceId, msg);
    }
  }

  private async handleFileRead(msg: AppMessage & { type: 'app:file-read' }, ws: WebSocket, server: PreviewAppServer): Promise<void> {
    try {
      const content = fs.readFileSync(msg.payload.filePath, 'utf-8');
      server.send(ws, {
        id: crypto.randomUUID(),
        ts: Date.now(),
        type: 'backend:response',
        payload: {
          requestId: msg.id,
          success: true,
          data: content,
        },
      });
    } catch (err) {
      server.send(ws, {
        id: crypto.randomUUID(),
        ts: Date.now(),
        type: 'backend:response',
        payload: {
          requestId: msg.id,
          success: false,
          error: err instanceof Error ? err.message : 'Failed to read file',
        },
      });
    }
  }

  private async handleFileWrite(msg: AppMessage & { type: 'app:file-write' | 'app:save' }, ws: WebSocket, server: PreviewAppServer): Promise<void> {
    try {
      const filePath = msg.payload.filePath;
      const content = msg.payload.content;

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, content, 'utf-8');

      server.send(ws, {
        id: crypto.randomUUID(),
        ts: Date.now(),
        type: 'backend:response',
        payload: {
          requestId: msg.id,
          success: true,
        },
      });

      // Notify other listeners (e.g., for updating the preview context)
      for (const listener of this.messageListeners) {
        listener(server.instanceId, msg);
      }
    } catch (err) {
      server.send(ws, {
        id: crypto.randomUUID(),
        ts: Date.now(),
        type: 'backend:response',
        payload: {
          requestId: msg.id,
          success: false,
          error: err instanceof Error ? err.message : 'Failed to write file',
        },
      });
    }
  }

  private toAppInfo(server: PreviewAppServer): PreviewAppInfo {
    return {
      instanceId: server.instanceId,
      appId: server.manifest.id,
      name: server.manifest.name,
      description: server.manifest.description,
      url: server.getUrl(),
      port: server.getPort(),
      status: server.getStatus(),
      capabilities: server.manifest.capabilities || [],
      editable: server.manifest.editable,
      icon: server.manifest.icon,
    };
  }
}

/** Singleton registry instance */
export const previewAppRegistry = new PreviewAppRegistry();
