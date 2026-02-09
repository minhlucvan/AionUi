/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDataPath } from '@process/utils';
import { spawn, execSync, type ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

export type LocalServerStatus = 'stopped' | 'starting' | 'running' | 'error';

export interface LocalServerInfo {
  status: LocalServerStatus;
  port: number;
  pid?: number;
  error?: string;
  pythonPath?: string;
}

export interface LocalServerConfig {
  port: number;
  llmBaseUrl: string;
  llmApiKey: string;
  chatModel: string;
  embedModel: string;
}

const DEFAULT_PORT = 11411;
const HEALTH_CHECK_INTERVAL_MS = 10000;
const STARTUP_TIMEOUT_MS = 30000;

/**
 * Manages a local memU Python server process.
 *
 * Handles:
 * - Python environment detection (python3/python)
 * - memU + dependencies installation check
 * - Server process lifecycle (start/stop/restart)
 * - Health monitoring
 * - Graceful shutdown
 */
export class LocalMemuManager {
  private process: ChildProcess | null = null;
  private status: LocalServerStatus = 'stopped';
  private port: number = DEFAULT_PORT;
  private error: string | undefined;
  private pythonPath: string | null = null;
  private healthInterval: ReturnType<typeof setInterval> | null = null;
  private dbPath: string;

  constructor() {
    this.dbPath = path.join(getDataPath(), 'memu_local.db');
  }

  /**
   * Get current server status info
   */
  getInfo(): LocalServerInfo {
    return {
      status: this.status,
      port: this.port,
      pid: this.process?.pid,
      error: this.error,
      pythonPath: this.pythonPath ?? undefined,
    };
  }

  /**
   * Get the local server base URL
   */
  getBaseUrl(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  /**
   * Detect Python 3 installation
   * Returns the path to python3 or python, whichever is available
   */
  detectPython(): string | null {
    if (this.pythonPath) return this.pythonPath;

    const candidates = process.platform === 'win32' ? ['python', 'python3', 'py -3'] : ['python3', 'python'];

    for (const cmd of candidates) {
      try {
        const version = execSync(`${cmd} --version 2>&1`, { timeout: 5000, encoding: 'utf-8' }).trim();
        // Ensure it's Python 3.10+
        const match = version.match(/Python (\d+)\.(\d+)/);
        if (match) {
          const major = parseInt(match[1]);
          const minor = parseInt(match[2]);
          if (major >= 3 && minor >= 10) {
            this.pythonPath = cmd;
            console.log(`[LocalMemuManager] Found Python: ${cmd} (${version})`);
            return cmd;
          }
        }
      } catch {
        // Not found, try next
      }
    }

    console.warn('[LocalMemuManager] Python 3.10+ not found');
    return null;
  }

  /**
   * Check if memU and dependencies are installed
   */
  checkDependencies(): { installed: boolean; missing: string[] } {
    const python = this.detectPython();
    if (!python) return { installed: false, missing: ['python3.10+'] };

    const required = ['memu', 'fastapi', 'uvicorn'];
    const missing: string[] = [];

    for (const pkg of required) {
      try {
        execSync(`${python} -c "import ${pkg}"`, { timeout: 5000, stdio: 'pipe' });
      } catch {
        missing.push(pkg);
      }
    }

    return { installed: missing.length === 0, missing };
  }

  /**
   * Install memU and dependencies
   */
  async installDependencies(): Promise<{ success: boolean; error?: string }> {
    const python = this.detectPython();
    if (!python) return { success: false, error: 'Python 3.10+ not found' };

    try {
      const packages = ['memu-py', 'fastapi', 'uvicorn[standard]'];
      execSync(`${python} -m pip install ${packages.join(' ')}`, {
        timeout: 120000,
        stdio: 'pipe',
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: `pip install failed: ${error.message}` };
    }
  }

  /**
   * Start the local memU server
   */
  async start(config: LocalServerConfig): Promise<{ success: boolean; error?: string }> {
    if (this.status === 'running') {
      return { success: true };
    }

    const python = this.detectPython();
    if (!python) {
      this.status = 'error';
      this.error = 'Python 3.10+ not found on this system';
      return { success: false, error: this.error };
    }

    // Check dependencies
    const deps = this.checkDependencies();
    if (!deps.installed) {
      this.status = 'error';
      this.error = `Missing packages: ${deps.missing.join(', ')}. Run: pip install ${deps.missing.join(' ')}`;
      return { success: false, error: this.error };
    }

    this.port = config.port || DEFAULT_PORT;
    this.status = 'starting';
    this.error = undefined;

    // Find the Python server script
    const serverScript = this.findServerScript();
    if (!serverScript) {
      this.status = 'error';
      this.error = 'memU server script not found';
      return { success: false, error: this.error };
    }

    return new Promise((resolve) => {
      const args = [
        serverScript,
        '--port',
        String(this.port),
        '--host',
        '127.0.0.1',
        '--db-path',
        this.dbPath,
      ];

      if (config.llmBaseUrl) args.push('--llm-base-url', config.llmBaseUrl);
      if (config.llmApiKey) args.push('--llm-api-key', config.llmApiKey);
      if (config.chatModel) args.push('--chat-model', config.chatModel);
      if (config.embedModel) args.push('--embed-model', config.embedModel);

      const env = { ...process.env };
      if (config.llmApiKey) env.OPENAI_API_KEY = config.llmApiKey;
      if (config.llmBaseUrl) env.OPENAI_BASE_URL = config.llmBaseUrl;

      this.process = spawn(python, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env,
      });

      let startupResolved = false;

      // Listen for startup signal on stdout
      this.process.stdout?.on('data', (data: Buffer) => {
        const output = data.toString().trim();
        console.log(`[memU-local] ${output}`);

        if (!startupResolved) {
          try {
            const msg = JSON.parse(output);
            if (msg.status === 'starting') {
              // Server is initializing, wait for health check
            }
          } catch {
            // Non-JSON output, ignore
          }
        }
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        const output = data.toString().trim();
        if (output) console.log(`[memU-local] ${output}`);
      });

      this.process.on('exit', (code, signal) => {
        console.log(`[LocalMemuManager] Server exited (code: ${code}, signal: ${signal})`);
        this.status = 'stopped';
        this.process = null;
        this.stopHealthCheck();

        if (!startupResolved) {
          startupResolved = true;
          this.status = 'error';
          this.error = `Server exited during startup (code: ${code})`;
          resolve({ success: false, error: this.error });
        }
      });

      this.process.on('error', (err) => {
        console.error(`[LocalMemuManager] Process error:`, err);
        this.status = 'error';
        this.error = err.message;

        if (!startupResolved) {
          startupResolved = true;
          resolve({ success: false, error: this.error });
        }
      });

      // Poll health endpoint to detect when server is ready
      const startTime = Date.now();
      const checkReady = async () => {
        if (startupResolved) return;

        try {
          const resp = await fetch(`http://127.0.0.1:${this.port}/health`, { signal: AbortSignal.timeout(2000) });
          if (resp.ok) {
            startupResolved = true;
            this.status = 'running';
            this.error = undefined;
            this.startHealthCheck();
            console.log(`[LocalMemuManager] Server ready on port ${this.port}`);
            resolve({ success: true });
            return;
          }
        } catch {
          // Not ready yet
        }

        if (Date.now() - startTime > STARTUP_TIMEOUT_MS) {
          startupResolved = true;
          this.status = 'error';
          this.error = 'Server startup timed out';
          this.stop();
          resolve({ success: false, error: this.error });
          return;
        }

        setTimeout(checkReady, 500);
      };

      // Start checking after a short delay
      setTimeout(checkReady, 1000);
    });
  }

  /**
   * Stop the local memU server
   */
  stop(): void {
    this.stopHealthCheck();

    if (this.process) {
      try {
        this.process.kill('SIGTERM');
      } catch {
        // Process may already be dead
      }
      this.process = null;
    }

    this.status = 'stopped';
    this.error = undefined;
    console.log('[LocalMemuManager] Server stopped');
  }

  /**
   * Check if the server is healthy
   */
  async isHealthy(): Promise<boolean> {
    if (this.status !== 'running') return false;

    try {
      const resp = await fetch(`http://127.0.0.1:${this.port}/health`, { signal: AbortSignal.timeout(3000) });
      return resp.ok;
    } catch {
      return false;
    }
  }

  /**
   * Find the memu_local_server.py script
   * Searches in resources/ and common packaged locations
   */
  private findServerScript(): string | null {
    const candidates = [
      // Development: relative to project root
      path.join(__dirname, '..', '..', '..', '..', 'resources', 'memu', 'memu_local_server.py'),
      // Packaged: resources directory relative to app
      path.join(process.resourcesPath || '', 'memu', 'memu_local_server.py'),
      // Packaged alt: extraResources
      path.join(process.resourcesPath || '', 'app', 'resources', 'memu', 'memu_local_server.py'),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        console.log(`[LocalMemuManager] Found server script at: ${candidate}`);
        return candidate;
      }
    }

    console.error('[LocalMemuManager] Server script not found. Searched:', candidates);
    return null;
  }

  private startHealthCheck(): void {
    this.stopHealthCheck();
    this.healthInterval = setInterval(async () => {
      const healthy = await this.isHealthy();
      if (!healthy && this.status === 'running') {
        console.warn('[LocalMemuManager] Health check failed, server may have crashed');
        this.status = 'error';
        this.error = 'Server health check failed';
      }
    }, HEALTH_CHECK_INTERVAL_MS);
  }

  private stopHealthCheck(): void {
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
      this.healthInterval = null;
    }
  }
}
