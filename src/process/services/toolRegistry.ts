/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import type { ToolManifest, UtilityToolManifest, BackendToolManifest } from '@/common/types/tool';
import type { AcpBackendConfig, AcpBackendAll, PotentialAcpCli } from '@/types/acpTypes';

/** Default ACP launch arguments when not specified */
const DEFAULT_ACP_ARGS = ['--experimental-acp'];

/**
 * Resolves the `tools/` directory for both dev and production builds.
 * Uses the same strategy as `resolveBuiltinDir` in initStorage.
 */
function resolveToolsDir(): string {
  const appPath = app.getAppPath();
  let candidates: string[];

  if (app.isPackaged) {
    const unpackedPath = appPath.replace('app.asar', 'app.asar.unpacked');
    candidates = [
      path.join(unpackedPath, 'tools'),
      path.join(appPath, 'tools'),
    ];
  } else {
    candidates = [
      path.join(appPath, 'tools'),
      path.join(appPath, '..', 'tools'),
      path.join(appPath, '..', '..', 'tools'),
      path.join(appPath, '..', '..', '..', 'tools'),
      path.join(process.cwd(), 'tools'),
    ];
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  console.warn('[ToolRegistry] Could not find tools directory, tried:', candidates);
  return candidates[0];
}

/** A loaded tool with its resolved directory path */
export type LoadedTool<T extends ToolManifest = ToolManifest> = {
  manifest: T;
  /** Absolute path to the tool directory (e.g. .../tools/github-cli) */
  toolDir: string;
};

/**
 * Registry that dynamically discovers and loads tool definitions
 * from `tools/<tool-dir>/tool.json` files.
 *
 * Supports both utility tools and backend tools.
 */
class ToolRegistry {
  private tools: LoadedTool[] = [];
  private toolsDir = '';
  private initialized = false;

  // ─── Cached derived data (built once on init) ───

  private _acpBackendsAll: Record<string, AcpBackendConfig> = {};
  private _acpEnabledBackends: Record<string, AcpBackendConfig> = {};
  private _potentialAcpClis: PotentialAcpCli[] = [];

  /** Load all tools from the tools directory */
  initialize(): void {
    if (this.initialized) return;

    this.toolsDir = resolveToolsDir();
    this.tools = [];

    if (!fs.existsSync(this.toolsDir)) {
      console.warn(`[ToolRegistry] Tools directory not found: ${this.toolsDir}`);
      this._buildBackendCaches();
      this.initialized = true;
      return;
    }

    const entries = fs.readdirSync(this.toolsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const toolDir = path.join(this.toolsDir, entry.name);
      const manifestPath = path.join(toolDir, 'tool.json');

      if (!fs.existsSync(manifestPath)) {
        continue;
      }

      try {
        const raw = fs.readFileSync(manifestPath, 'utf-8');
        const manifest = JSON.parse(raw) as ToolManifest;

        if (!manifest.id || !manifest.name || !manifest.cliCommand) {
          console.warn(`[ToolRegistry] Invalid tool.json in ${entry.name}: missing required fields`);
          continue;
        }

        this.tools.push({ manifest, toolDir });
      } catch (error) {
        console.error(`[ToolRegistry] Failed to parse tool.json in ${entry.name}:`, error);
      }
    }

    this._buildBackendCaches();

    const utilCount = this.getUtilityTools().length;
    const backendCount = this.getBackendTools().length;
    console.log(`[ToolRegistry] Loaded ${this.tools.length} tool(s) from ${this.toolsDir} (${backendCount} backend, ${utilCount} utility)`);
    this.initialized = true;
  }

  /** Reload all tool definitions (e.g. after adding new tools) */
  reload(): void {
    this.initialized = false;
    this.initialize();
  }

  // ─── Generic accessors ───

  /** Get all loaded tools */
  getAll(): LoadedTool[] {
    this.ensureInitialized();
    return [...this.tools];
  }

  /** Find a tool by its id */
  getById(id: string): LoadedTool | undefined {
    this.ensureInitialized();
    return this.tools.find((t) => t.manifest.id === id);
  }

  // ─── Typed accessors by tool type ───

  /** Get all utility tools */
  getUtilityTools(): LoadedTool<UtilityToolManifest>[] {
    this.ensureInitialized();
    return this.tools.filter((t): t is LoadedTool<UtilityToolManifest> => t.manifest.type === 'utility');
  }

  /** Get all backend tools */
  getBackendTools(): LoadedTool<BackendToolManifest>[] {
    this.ensureInitialized();
    return this.tools.filter((t): t is LoadedTool<BackendToolManifest> => t.manifest.type === 'backend');
  }

  // ─── ACP backend data (replaces static ACP_BACKENDS_ALL) ───

  /**
   * All ACP backend configs, built from backend tool.json files + the special "custom" entry.
   */
  getAcpBackendsAll(): Record<string, AcpBackendConfig> {
    this.ensureInitialized();
    return this._acpBackendsAll;
  }

  /** Only enabled ACP backends */
  getAcpEnabledBackends(): Record<string, AcpBackendConfig> {
    this.ensureInitialized();
    return this._acpEnabledBackends;
  }

  /** Potential ACP CLI list for auto-detection */
  getPotentialAcpClis(): PotentialAcpCli[] {
    this.ensureInitialized();
    return this._potentialAcpClis;
  }

  /** Get config for a specific ACP backend */
  getAcpBackendConfig(backend: string): AcpBackendConfig | undefined {
    this.ensureInitialized();
    return this._acpBackendsAll[backend];
  }

  /** Check if an ACP backend is valid (exists and enabled) */
  isValidAcpBackend(backend: string): boolean {
    this.ensureInitialized();
    return backend in this._acpEnabledBackends;
  }

  /** Check if an ACP backend is enabled */
  isAcpBackendEnabled(backend: string): boolean {
    this.ensureInitialized();
    return this._acpBackendsAll[backend]?.enabled ?? false;
  }

  // ─── Skill helpers (utility tools) ───

  /**
   * Read skill content (SKILL.md) for a given tool and skill name.
   * Skills are stored at `tools/<tool-dir>/skills/<skill-name>/SKILL.md`.
   */
  getSkillContent(toolId: string, skillName: string): string | undefined {
    const tool = this.getById(toolId);
    if (!tool) return undefined;

    const skillPath = path.join(tool.toolDir, 'skills', skillName, 'SKILL.md');
    if (!fs.existsSync(skillPath)) return undefined;

    try {
      return fs.readFileSync(skillPath, 'utf-8');
    } catch (error) {
      console.error(`[ToolRegistry] Failed to read skill '${skillName}' for tool '${toolId}':`, error);
      return undefined;
    }
  }

  /** Get the first skill name associated with a utility tool */
  getFirstSkillName(toolId: string): string | undefined {
    const tool = this.getById(toolId);
    if (!tool || tool.manifest.type !== 'utility') return undefined;
    return tool.manifest.skills?.[0];
  }

  /** Check if a specific skill directory exists for a tool */
  hasSkillContent(toolId: string, skillName: string): boolean {
    const tool = this.getById(toolId);
    if (!tool) return false;
    const skillPath = path.join(tool.toolDir, 'skills', skillName, 'SKILL.md');
    return fs.existsSync(skillPath);
  }

  /** Get the absolute path to the tools directory */
  getToolsDir(): string {
    this.ensureInitialized();
    return this.toolsDir;
  }

  // ─── Internal ───

  /** Build the ACP backend caches from backend tools */
  private _buildBackendCaches(): void {
    this._acpBackendsAll = {};
    this._acpEnabledBackends = {};
    this._potentialAcpClis = [];

    // Build from backend tool manifests
    for (const { manifest } of this.getBackendTools()) {
      const config: AcpBackendConfig = {
        id: manifest.id,
        name: manifest.name,
        description: manifest.description,
        cliCommand: manifest.cliCommand,
        defaultCliPath: manifest.defaultCliPath,
        authRequired: manifest.authRequired,
        enabled: manifest.enabled,
        supportsStreaming: manifest.supportsStreaming,
        acpArgs: manifest.acpArgs,
        installCommand: manifest.installCommand,
        setupCommand: manifest.setupCommand,
        installUrl: manifest.installUrl,
      };

      this._acpBackendsAll[manifest.id] = config;

      if (config.enabled) {
        this._acpEnabledBackends[manifest.id] = config;
      }

      // Build potential CLI entry for detection (exclude gemini built-in and disabled)
      if (config.cliCommand && config.enabled && manifest.id !== 'gemini') {
        this._potentialAcpClis.push({
          cmd: config.cliCommand,
          args: config.acpArgs || DEFAULT_ACP_ARGS,
          name: config.name,
          backendId: manifest.id as AcpBackendAll,
        });
      }
    }

    // Always add the special "custom" entry (user-configured, not from tool.json)
    const customConfig: AcpBackendConfig = {
      id: 'custom',
      name: 'Custom Agent',
      cliCommand: undefined,
      authRequired: false,
      enabled: true,
      supportsStreaming: false,
    };
    this._acpBackendsAll['custom'] = customConfig;
    this._acpEnabledBackends['custom'] = customConfig;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      this.initialize();
    }
  }
}

/** Singleton tool registry instance */
export const toolRegistry = new ToolRegistry();
