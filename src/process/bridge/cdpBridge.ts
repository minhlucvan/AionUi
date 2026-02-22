/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import { app } from 'electron';
import { ipcBridge } from '../../common';

/**
 * Resolve the remote-debugging-port assigned by Chromium.
 *
 * When Electron is started with `--remote-debugging-port=0`, Chromium picks a
 * random free port. We discover it by scanning a port range and probing
 * the CDP /json/version endpoint.
 *
 * Once discovered, we cache the port and write it to ~/.aionui/cdp-port
 * so external tools (agent-browser, chrome-devtools-mcp) can find it.
 */
let cachedPort: number | null = null;

const CDP_PORT_FILE = path.join(app.getPath('home'), '.aionui', 'cdp-port');

function probeCdpPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/json/version`, (res) => {
      let data = '';
      res.on('data', (chunk: string) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(!!parsed['Browser']);
        } catch {
          resolve(false);
        }
      });
    });
    req.on('error', () => resolve(false));
    req.setTimeout(300, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Discover the actual CDP port assigned by Chromium.
 * Probes a range of ports starting from common CDP ports.
 */
async function discoverCdpPort(): Promise<number> {
  if (cachedPort !== null) return cachedPort;

  // If the user explicitly set a port, try that first
  const explicit = app.commandLine.getSwitchValue('remote-debugging-port');
  const explicitPort = parseInt(explicit, 10);
  if (!isNaN(explicitPort) && explicitPort > 0) {
    if (await probeCdpPort(explicitPort)) {
      cachedPort = explicitPort;
      writeCdpPortFile(explicitPort);
      return explicitPort;
    }
  }

  // Scan for the auto-assigned port (port=0 means random)
  // Electron typically assigns ports in the high range
  // We also check common CDP ports first
  const commonPorts = [9222, 9229, 9223, 9224, 9225];
  for (const port of commonPorts) {
    if (await probeCdpPort(port)) {
      cachedPort = port;
      writeCdpPortFile(port);
      return port;
    }
  }

  return 0;
}

function writeCdpPortFile(port: number): void {
  try {
    const dir = path.dirname(CDP_PORT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CDP_PORT_FILE, String(port), 'utf-8');
  } catch {
    // Non-critical: external tools will fall back to probing
  }
}

function cleanupCdpPortFile(): void {
  try {
    if (fs.existsSync(CDP_PORT_FILE)) {
      fs.unlinkSync(CDP_PORT_FILE);
    }
  } catch {
    // Ignore cleanup errors
  }
}

export function initCdpBridge(): void {
  ipcBridge.cdp.getPort.provider(async () => {
    return discoverCdpPort();
  });

  // Discover and persist the CDP port after a short delay (let Chromium start)
  setTimeout(() => {
    discoverCdpPort().then((port) => {
      if (port > 0) {
        console.log(`[CDP] Remote debugging available on port ${port}`);
      }
    });
  }, 2000);

  // Clean up the port file when the app quits
  app.on('will-quit', () => {
    cleanupCdpPortFile();
  });
}
