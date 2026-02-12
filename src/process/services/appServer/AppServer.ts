/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * AppServer - Single server that serves all apps.
 *
 * Two modes per app:
 *   Static  (no `command` in app.json): serves files from apps/<name>/
 *   Process (has `command`): spawns the app's own server, iframe points directly to it
 *
 * Static apps URL:  http://127.0.0.1:PORT/<appName>/?sid=<sessionId>
 * Process apps URL: http://127.0.0.1:APP_PORT/?sid=<sessionId>&wsPort=PORT
 *
 * SDK protocol WebSocket always lives at ws://127.0.0.1:PORT/__ws
 * (process apps pass wsPort query param so SDK knows where to connect)
 */

import type { ChildProcess } from 'child_process';
import { spawn } from 'child_process';
import crypto from 'crypto';
import { app as electronApp } from 'electron';
import express from 'express';
import fs from 'fs';
import type { IncomingMessage, Server } from 'http';
import { createServer } from 'http';
import type { Duplex } from 'stream';
import net from 'net';
import path from 'path';
import { WebSocket, WebSocketServer } from 'ws';
import type { AppCapability, AppConfig, AppInfo, AppResource, AppSession, WorkspacePreviewConfig } from '@/common/types/app';

type SessionState = {
  sessionId: string;
  appName: string;
  resource?: AppResource;
  ws: WebSocket | null;
  capabilities: AppCapability[];
};

type AppProcess = {
  appName: string;
  process: ChildProcess;
  port: number;
  ready: boolean;
};

type MessageListener = (sessionId: string, type: string, payload: Record<string, unknown>) => void;

/** Resolve the apps/ directory for both dev and production builds */
function resolveAppsDir(): string {
  const appPath = electronApp.getAppPath();
  const candidates = electronApp.isPackaged
    ? [path.join(appPath.replace('app.asar', 'app.asar.unpacked'), 'apps'), path.join(appPath, 'apps')]
    : [
        path.join(appPath, 'apps'),
        path.join(appPath, '..', 'apps'),
        path.join(appPath, '..', '..', 'apps'),
        path.join(appPath, '..', '..', '..', 'apps'),
        path.join(process.cwd(), 'src', 'apps'),
        path.join(process.cwd(), 'apps'),
      ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  console.warn('[AppServer] Could not find apps directory, tried:', candidates);
  return candidates[0];
}

/** Find a free port */
function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = addr && typeof addr === 'object' ? addr.port : 0;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

class AppServer {
  private expressApp = express();
  private server: Server;
  private wss: WebSocketServer;
  private port = 0;
  private running = false;

  /** appName → config */
  private apps = new Map<string, AppConfig>();
  /** appName → spawned process (for process-based apps) */
  private processes = new Map<string, AppProcess>();
  /** sessionId → state */
  private sessions = new Map<string, SessionState>();
  /** ws → sessionId */
  private wsToSession = new Map<WebSocket, string>();
  /** appName → workspace dir (for workspace apps, overrides appsDir) */
  private workspaceDirs = new Map<string, string>();
  /** Message listeners for IPC forwarding */
  private listeners: MessageListener[] = [];

  readonly appsDir: string;

  constructor() {
    this.appsDir = resolveAppsDir();
    this.server = createServer(this.expressApp);
    // SDK protocol WebSocket on /__ws path only
    this.wss = new WebSocketServer({ noServer: true });
    this.loadApps();
    this.setupRoutes();
    this.setupWebSocket();
  }

  // ==================== App Discovery ====================

  /** Scan apps/ directory and load app.json configs */
  private loadApps(): void {
    if (!fs.existsSync(this.appsDir)) {
      console.log(`[AppServer] Apps directory not found: ${this.appsDir}`);
      return;
    }

    const entries = fs.readdirSync(this.appsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === 'sdk') continue;

      const configPath = path.join(this.appsDir, entry.name, 'app.json');
      if (!fs.existsSync(configPath)) continue;

      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as AppConfig;
        this.apps.set(entry.name, config);
        const mode = config.command ? 'process' : 'static';
        console.log(`[AppServer] Loaded app: ${entry.name} (${config.name}) [${mode}]`);
      } catch (err) {
        console.error(`[AppServer] Failed to load ${configPath}:`, err);
      }
    }
  }

  /** Get all loaded apps */
  listApps(): AppInfo[] {
    return Array.from(this.apps.entries()).map(([appName, config]) => ({
      ...config,
      appName,
    }));
  }

  /** Find which app handles a content type */
  matchApp(contentType: string): string | null {
    for (const [appName, config] of this.apps) {
      if (config.contentTypes?.includes(contentType)) return appName;
    }
    return null;
  }

  // ==================== HTTP Routes ====================

  private setupRoutes(): void {
    // CORS + iframe embedding
    this.expressApp.use((_req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.removeHeader('X-Frame-Options');
      next();
    });

    // SDK at /__sdk/
    const sdkDir = path.join(this.appsDir, 'sdk');
    if (fs.existsSync(sdkDir)) {
      this.expressApp.use('/__sdk', express.static(sdkDir));
    }

    // Health check
    this.expressApp.get('/__health', (_req, res) => {
      res.json({ status: 'running', port: this.port, apps: Array.from(this.apps.keys()) });
    });

    // Only static apps are served by this server.
    // Process apps run their own server; iframe points directly to them.
    for (const [appName, config] of this.apps) {
      if (config.command) continue; // process apps don't need routes here

      const appDir = path.join(this.appsDir, appName);
      this.expressApp.use(`/${appName}`, express.static(appDir));
      this.expressApp.get(`/${appName}/*`, (_req, res) => {
        res.sendFile(path.join(appDir, 'index.html'), (err) => {
          if (err) res.status(404).send('Not Found');
        });
      });
    }
  }

  // ==================== WebSocket ====================

  private setupWebSocket(): void {
    // SDK protocol WebSocket at /__ws
    this.server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
      const url = req.url || '';

      if (url.startsWith('/__ws')) {
        this.wss.handleUpgrade(req, socket, head, (ws) => {
          this.wss.emit('connection', ws, req);
        });
      } else {
        socket.destroy();
      }
    });

    // Handle SDK protocol connections
    this.wss.on('connection', (ws: WebSocket) => {
      ws.on('message', (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString());
          this.handleMessage(ws, msg);
        } catch (err) {
          console.error('[AppServer] Failed to parse message:', err);
        }
      });

      ws.on('close', () => {
        const sessionId = this.wsToSession.get(ws);
        if (sessionId) {
          const session = this.sessions.get(sessionId);
          if (session) session.ws = null;
          this.wsToSession.delete(ws);
        }
      });

      ws.on('error', (err) => {
        console.error('[AppServer] WebSocket error:', err);
        this.wsToSession.delete(ws);
      });
    });
  }

  private handleMessage(ws: WebSocket, msg: { type: string; id?: string; payload?: Record<string, unknown> }): void {
    const { type, id, payload } = msg;

    // app:ready → bind WS to session
    if (type === 'app:ready' && payload) {
      const sid = payload.sessionId as string;
      const session = sid ? this.sessions.get(sid) : undefined;
      if (session) {
        session.ws = ws;
        this.wsToSession.set(ws, sid);

        if (Array.isArray(payload.capabilities)) {
          session.capabilities = payload.capabilities as AppCapability[];
        }

        // Send the resource if one was queued
        if (session.resource) {
          this.sendToSession(sid, {
            id: crypto.randomUUID(),
            ts: Date.now(),
            type: 'backend:open',
            payload: session.resource,
          });
        }

        console.log(`[AppServer] Session ${sid} connected (${session.appName})`);
      }
      return;
    }

    // Resolve session from WS
    const sessionId = this.wsToSession.get(ws);
    if (!sessionId) return;

    // Handle file operations internally
    if (type === 'app:file-read' && payload) {
      this.handleFileRead(id || '', payload as { filePath: string }, ws);
      return;
    }
    if ((type === 'app:file-write' || type === 'app:save') && payload) {
      this.handleFileWrite(id || '', payload as { filePath: string; content: string }, ws);
      return;
    }

    // Forward to external listeners (IPC bridge)
    for (const listener of this.listeners) {
      listener(sessionId, type, payload || {});
    }
  }

  // ==================== Process Management ====================

  /** Spawn an app's own server (React dev server, Streamlit, etc.) */
  private async spawnApp(appName: string): Promise<AppProcess> {
    const config = this.apps.get(appName);
    if (!config?.command) throw new Error(`App '${appName}' has no command`);

    // Check if already running
    const existing = this.processes.get(appName);
    if (existing && existing.ready) return existing;

    const port = config.port || await findFreePort();
    const command = config.command.replace(/\{port\}/g, String(port));
    const appDir = this.workspaceDirs.get(appName) || path.join(this.appsDir, appName);

    console.log(`[AppServer] Spawning ${appName}: ${command} (port ${port})`);

    const [cmd, ...args] = command.split(/\s+/);
    const child = spawn(cmd, args, {
      cwd: appDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      env: { ...process.env, PORT: String(port) },
    });

    const appProcess: AppProcess = {
      appName,
      process: child,
      port,
      ready: false,
    };

    this.processes.set(appName, appProcess);

    child.stdout?.on('data', (data: Buffer) => {
      console.log(`[${appName}] ${data.toString().trim()}`);
    });
    child.stderr?.on('data', (data: Buffer) => {
      console.error(`[${appName}] ${data.toString().trim()}`);
    });
    child.on('exit', (code) => {
      console.log(`[AppServer] ${appName} process exited with code ${code}`);
      this.processes.delete(appName);
    });

    // Wait for the app server to be ready (poll the port)
    await this.waitForPort(port, 30000);
    appProcess.ready = true;
    console.log(`[AppServer] ${appName} ready on port ${port}`);

    return appProcess;
  }

  /** Wait until a port is accepting connections */
  private waitForPort(port: number, timeoutMs: number): Promise<void> {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const check = () => {
        if (Date.now() - start > timeoutMs) {
          return reject(new Error(`Timeout waiting for port ${port}`));
        }
        const sock = net.createConnection({ port, host: '127.0.0.1' });
        sock.on('connect', () => {
          sock.destroy();
          resolve();
        });
        sock.on('error', () => {
          sock.destroy();
          setTimeout(check, 500);
        });
      };
      check();
    });
  }

  /** Stop a spawned app process */
  private stopProcess(appName: string): void {
    const proc = this.processes.get(appName);
    if (!proc) return;

    proc.process.kill('SIGTERM');
    this.processes.delete(appName);

    // Force kill after 5s
    setTimeout(() => {
      try { proc.process.kill('SIGKILL'); } catch { /* already dead */ }
    }, 5000);
  }

  // ==================== Session Management ====================

  /** Open a resource in an app → creates a session, returns URL */
  async open(appName: string, resource?: AppResource): Promise<AppSession> {
    const config = this.apps.get(appName);
    if (!config) throw new Error(`App '${appName}' not found`);

    // Spawn process app if needed
    if (config.command && !this.processes.get(appName)?.ready) {
      await this.spawnApp(appName);
    }

    const sessionId = crypto.randomUUID();
    let url: string;

    if (config.command) {
      // Process app: iframe points directly to the app's own server
      const proc = this.processes.get(appName);
      url = `http://127.0.0.1:${proc!.port}/?sid=${sessionId}&wsPort=${this.port}`;
    } else {
      // Static app: served by our AppServer
      url = `http://127.0.0.1:${this.port}/${appName}/?sid=${sessionId}`;
    }

    this.sessions.set(sessionId, {
      sessionId,
      appName,
      resource,
      ws: null,
      capabilities: config.capabilities || [],
    });

    return {
      sessionId,
      appName,
      url,
      editable: config.editable,
      capabilities: config.capabilities || [],
    };
  }

  /** Close a session */
  close(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (session.ws && session.ws.readyState === WebSocket.OPEN) {
      session.ws.close(1000, 'Session closed');
    }
    this.sessions.delete(sessionId);
  }

  // ==================== Workspace Preview ====================

  /** Read .aionui/preview.json from a workspace */
  getWorkspaceConfig(workspace: string): WorkspacePreviewConfig | null {
    const configPath = path.join(workspace, '.aionui', 'preview.json');
    if (!fs.existsSync(configPath)) return null;

    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as WorkspacePreviewConfig;
    } catch {
      return null;
    }
  }

  /** Open a workspace's dev server as a live preview */
  async openWorkspacePreview(workspace: string): Promise<AppSession> {
    const config = this.getWorkspaceConfig(workspace);
    if (!config?.command) {
      throw new Error(`No .aionui/preview.json with command found in ${workspace}`);
    }

    // Derive a stable app name from the workspace folder
    const appName = `ws:${path.basename(workspace)}`;

    // Register as a dynamic app if not already registered
    if (!this.apps.has(appName)) {
      this.apps.set(appName, {
        name: config.name || path.basename(workspace),
        command: config.command,
        port: config.port,
      });
      this.workspaceDirs.set(appName, workspace);
      console.log(`[AppServer] Registered workspace app: ${appName} (${workspace})`);
    }

    // Check if there's already a running session for this workspace
    for (const session of this.sessions.values()) {
      if (session.appName === appName) {
        const proc = this.processes.get(appName);
        if (proc?.ready) {
          return {
            sessionId: session.sessionId,
            appName,
            url: `http://127.0.0.1:${proc.port}/?sid=${session.sessionId}&wsPort=${this.port}`,
            editable: false,
            capabilities: [],
          };
        }
      }
    }

    return this.open(appName);
  }

  /** Execute a capability on a session */
  async execute(sessionId: string, capability: string, params: Record<string, unknown>): Promise<unknown> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session '${sessionId}' not found`);
    if (!session.ws || session.ws.readyState !== WebSocket.OPEN) {
      throw new Error(`Session '${sessionId}' has no active connection`);
    }

    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Capability '${capability}' timed out`));
      }, 30000);

      const cleanup = () => {
        clearTimeout(timeout);
        const idx = this.listeners.indexOf(listener);
        if (idx !== -1) this.listeners.splice(idx, 1);
      };

      const listener: MessageListener = (sid, type, payload) => {
        if (sid === sessionId && type === 'app:execute-result' && payload.requestId === requestId) {
          cleanup();
          if (payload.success) {
            resolve(payload.data);
          } else {
            reject(new Error((payload.error as string) || 'Execution failed'));
          }
        }
      };

      this.listeners.push(listener);

      this.sendToSession(sessionId, {
        id: requestId,
        ts: Date.now(),
        type: 'backend:execute',
        payload: { capability, params },
      });
    });
  }

  /** Send a content update to all sessions tracking a file */
  broadcastContentUpdate(filePath: string, content: string, source: string): void {
    const msg = {
      id: crypto.randomUUID(),
      ts: Date.now(),
      type: 'backend:content-update',
      payload: { filePath, content, source },
    };
    for (const session of this.sessions.values()) {
      if (session.ws && session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify(msg));
      }
    }
  }

  /** Add a message listener */
  onMessage(listener: MessageListener): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx !== -1) this.listeners.splice(idx, 1);
    };
  }

  // ==================== Server Lifecycle ====================

  async start(): Promise<void> {
    if (this.running) return;

    return new Promise((resolve, reject) => {
      this.server.listen(0, '127.0.0.1', () => {
        const addr = this.server.address();
        if (addr && typeof addr === 'object') this.port = addr.port;
        this.running = true;
        console.log(`[AppServer] Running on http://127.0.0.1:${this.port} (${this.apps.size} apps)`);
        resolve();
      });
      this.server.on('error', reject);
    });
  }

  async stop(): Promise<void> {
    if (!this.running) return;

    // Close all sessions
    for (const session of this.sessions.values()) {
      if (session.ws) session.ws.close(1000, 'Server shutting down');
    }
    this.sessions.clear();
    this.wsToSession.clear();

    // Stop all spawned processes
    for (const appName of this.processes.keys()) {
      this.stopProcess(appName);
    }

    this.wss.close();
    return new Promise((resolve) => {
      this.server.close(() => {
        this.running = false;
        console.log('[AppServer] Stopped');
        resolve();
      });
    });
  }

  getPort(): number {
    return this.port;
  }

  isRunning(): boolean {
    return this.running;
  }

  // ==================== Helpers ====================

  private sendToSession(sessionId: string, msg: Record<string, unknown>): void {
    const session = this.sessions.get(sessionId);
    if (session?.ws && session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(JSON.stringify(msg));
    }
  }

  private handleFileRead(requestId: string, payload: { filePath: string }, ws: WebSocket): void {
    try {
      const content = fs.readFileSync(payload.filePath, 'utf-8');
      ws.send(JSON.stringify({
        id: crypto.randomUUID(), ts: Date.now(), type: 'backend:response',
        payload: { requestId, success: true, data: content },
      }));
    } catch (err) {
      ws.send(JSON.stringify({
        id: crypto.randomUUID(), ts: Date.now(), type: 'backend:response',
        payload: { requestId, success: false, error: err instanceof Error ? err.message : 'Read failed' },
      }));
    }
  }

  private handleFileWrite(requestId: string, payload: { filePath: string; content: string }, ws: WebSocket): void {
    try {
      const dir = path.dirname(payload.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(payload.filePath, payload.content, 'utf-8');

      ws.send(JSON.stringify({
        id: crypto.randomUUID(), ts: Date.now(), type: 'backend:response',
        payload: { requestId, success: true },
      }));
    } catch (err) {
      ws.send(JSON.stringify({
        id: crypto.randomUUID(), ts: Date.now(), type: 'backend:response',
        payload: { requestId, success: false, error: err instanceof Error ? err.message : 'Write failed' },
      }));
    }
  }
}

/** Singleton app server */
export const appServer = new AppServer();
