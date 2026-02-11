/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PreviewAppServer - Manages an individual preview app's HTTP + WebSocket server.
 *
 * Each preview app runs its own Express server on a dynamically allocated port.
 * The server serves static assets and provides a WebSocket endpoint for
 * bidirectional protocol communication between the app and the backend.
 */

import crypto from 'crypto';
import express from 'express';
import type { Server } from 'http';
import { createServer } from 'http';
import path from 'path';
import { WebSocket, WebSocketServer } from 'ws';
import type {
  AppMessage,
  BackendMessage,
  PreviewAppCapability,
  PreviewAppCapabilityDeclaration,
  PreviewAppInstance,
  PreviewAppManifest,
  PreviewAppStatus,
} from '@/common/types/previewApp';

type MessageHandler = (msg: AppMessage, ws: WebSocket) => void;

export class PreviewAppServer {
  private app = express();
  private server: Server;
  private wss: WebSocketServer;
  private clients = new Set<WebSocket>();
  private status: PreviewAppStatus = 'stopped';
  private port = 0;
  private capabilities: PreviewAppCapability[] = [];
  private messageHandler: MessageHandler | null = null;
  readonly instanceId: string;

  constructor(
    readonly manifest: PreviewAppManifest,
    private staticDir: string,
    private sdkDir?: string
  ) {
    this.instanceId = crypto.randomUUID();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupRoutes(): void {
    // CORS: allow iframe embedding from any origin on localhost
    this.app.use((_req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      // Allow iframe embedding
      res.removeHeader('X-Frame-Options');
      next();
    });

    // Serve the SDK from all app servers at /__sdk/
    if (this.sdkDir) {
      this.app.use('/__sdk', express.static(this.sdkDir));
    }

    // Health check
    this.app.get('/__health', (_req, res) => {
      res.json({
        status: this.status,
        appId: this.manifest.id,
        instanceId: this.instanceId,
        capabilities: this.capabilities.map((c) => c.name),
      });
    });

    // Serve static app files
    this.app.use(express.static(this.staticDir));

    // Fallback to index.html for SPA routing
    this.app.get('*', (_req, res) => {
      const indexPath = path.join(this.staticDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          res.status(404).send('Not Found');
        }
      });
    });
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      console.log(`[PreviewAppServer:${this.manifest.id}] WebSocket client connected`);

      ws.on('message', (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString()) as AppMessage;
          this.handleAppMessage(msg, ws);
        } catch (err) {
          console.error(`[PreviewAppServer:${this.manifest.id}] Failed to parse message:`, err);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[PreviewAppServer:${this.manifest.id}] WebSocket client disconnected`);
      });

      ws.on('error', (err) => {
        console.error(`[PreviewAppServer:${this.manifest.id}] WebSocket error:`, err);
        this.clients.delete(ws);
      });
    });
  }

  private handleAppMessage(msg: AppMessage, ws: WebSocket): void {
    // Handle app:ready specially to register capabilities
    if (msg.type === 'app:ready') {
      this.registerCapabilities(msg.payload.capabilities);
    }

    // Forward to external handler
    if (this.messageHandler) {
      this.messageHandler(msg, ws);
    }
  }

  private registerCapabilities(declarations: PreviewAppCapabilityDeclaration[]): void {
    this.capabilities = declarations.map((decl) => ({
      ...decl,
      appId: this.manifest.id,
      instanceId: this.instanceId,
    }));
    console.log(
      `[PreviewAppServer:${this.manifest.id}] Registered ${this.capabilities.length} capabilities:`,
      this.capabilities.map((c) => c.name)
    );
  }

  /** Set handler for messages from the app */
  onMessage(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  /** Send a message to all connected app clients */
  broadcast(msg: BackendMessage): void {
    const payload = JSON.stringify(msg);
    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  /** Send a message to a specific client */
  send(ws: WebSocket, msg: BackendMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  /** Start the server on a random available port */
  async start(): Promise<void> {
    if (this.status === 'running') return;

    this.status = 'starting';
    return new Promise((resolve, reject) => {
      // Port 0 = OS assigns a random available port
      this.server.listen(0, '127.0.0.1', () => {
        const addr = this.server.address();
        if (addr && typeof addr === 'object') {
          this.port = addr.port;
        }
        this.status = 'running';
        console.log(`[PreviewAppServer:${this.manifest.id}] Running on http://127.0.0.1:${this.port}`);
        resolve();
      });

      this.server.on('error', (err) => {
        this.status = 'error';
        reject(err);
      });
    });
  }

  /** Stop the server and close all connections */
  async stop(): Promise<void> {
    if (this.status === 'stopped') return;

    this.status = 'stopping';

    // Close all WebSocket connections
    for (const ws of this.clients) {
      ws.close(1000, 'Server shutting down');
    }
    this.clients.clear();

    // Close the WebSocket server
    this.wss.close();

    // Close the HTTP server
    return new Promise((resolve) => {
      this.server.close(() => {
        this.status = 'stopped';
        console.log(`[PreviewAppServer:${this.manifest.id}] Stopped`);
        resolve();
      });
    });
  }

  getPort(): number {
    return this.port;
  }

  getUrl(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  getStatus(): PreviewAppStatus {
    return this.status;
  }

  getCapabilities(): PreviewAppCapability[] {
    return [...this.capabilities];
  }

  hasConnectedClients(): boolean {
    return this.clients.size > 0;
  }

  toInstance(): PreviewAppInstance {
    return {
      instanceId: this.instanceId,
      appId: this.manifest.id,
      status: this.status,
      port: this.port,
      url: this.getUrl(),
      capabilities: this.getCapabilities(),
      startedAt: Date.now(),
    };
  }
}
