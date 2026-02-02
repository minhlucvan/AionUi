/**
 * AionUi Plugin Loader
 *
 * Handles discovering, downloading, and loading plugins from multiple sources:
 * - npm registry
 * - GitHub repositories
 * - Local filesystem (development)
 */

import { exec as execCb } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

import type {
  AionPlugin,
  PluginManifest,
  PluginRegistryEntry,
  PluginSource,
} from '../types';
import { validatePluginPackageJson } from '../types/manifest';

const exec = promisify(execCb);

// ─── Constants ───────────────────────────────────────────────────────────────

const PLUGIN_DIR_NAME = 'plugins';
const PLUGIN_PACKAGE_PREFIX = 'aionui-plugin-';
const PLUGIN_SCOPED_PREFIX = '@aionui/plugin-';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LoadPluginResult {
  success: boolean;
  entry?: PluginRegistryEntry;
  plugin?: AionPlugin;
  error?: string;
}

export interface PluginLoaderConfig {
  /** Base directory where plugins are stored */
  pluginsDir: string;

  /** AionUi host version (for compatibility checks) */
  hostVersion: string;

  /** Proxy URL for npm/git operations */
  proxy?: string;

  /** Timeout for install operations in ms */
  installTimeout?: number;
}

// ─── Plugin Loader Class ─────────────────────────────────────────────────────

export class PluginLoader {
  private config: PluginLoaderConfig;

  constructor(config: PluginLoaderConfig) {
    this.config = config;
    this.ensurePluginsDir();
  }

  /**
   * Install a plugin from the npm registry.
   *
   * @param packageName - npm package name (e.g., "aionui-plugin-github" or "@scope/plugin-name")
   * @param version - Optional version constraint (defaults to "latest")
   */
  async installFromNpm(packageName: string, version?: string): Promise<LoadPluginResult> {
    const spec = version ? `${packageName}@${version}` : packageName;
    const pluginDir = this.getPluginDir(packageName);

    try {
      // Create an isolated directory for this plugin
      await fs.promises.mkdir(pluginDir, { recursive: true });

      // Initialize a minimal package.json so npm install works
      const initPkg = { name: `aionui-host-${packageName}`, version: '1.0.0', private: true };
      await fs.promises.writeFile(
        path.join(pluginDir, 'package.json'),
        JSON.stringify(initPkg, null, 2),
      );

      // Run npm install
      const npmArgs = ['install', spec, '--save', '--production'];
      if (this.config.proxy) {
        npmArgs.push(`--proxy=${this.config.proxy}`);
      }

      await exec(`npm ${npmArgs.join(' ')}`, {
        cwd: pluginDir,
        timeout: this.config.installTimeout ?? 120_000,
      });

      // Load the installed plugin
      return this.loadFromDirectory(
        path.join(pluginDir, 'node_modules', packageName),
        'npm',
        packageName,
      );
    } catch (err) {
      return {
        success: false,
        error: `Failed to install npm package "${spec}": ${(err as Error).message}`,
      };
    }
  }

  /**
   * Install a plugin from a GitHub repository.
   *
   * @param repo - GitHub repo in "owner/repo" format or a full URL
   * @param ref - Optional branch/tag/commit (defaults to default branch)
   */
  async installFromGithub(repo: string, ref?: string): Promise<LoadPluginResult> {
    // Normalize to owner/repo format
    const normalized = this.normalizeGithubRepo(repo);
    if (!normalized) {
      return { success: false, error: `Invalid GitHub repo format: "${repo}"` };
    }

    const pluginDirName = normalized.replace('/', '__');
    const pluginDir = path.join(this.config.pluginsDir, pluginDirName);

    try {
      // Remove existing directory if present
      if (fs.existsSync(pluginDir)) {
        await fs.promises.rm(pluginDir, { recursive: true, force: true });
      }

      // Clone the repository (shallow)
      const cloneUrl = `https://github.com/${normalized}.git`;
      const cloneArgs = ['clone', '--depth', '1'];
      if (ref) {
        cloneArgs.push('--branch', ref);
      }
      cloneArgs.push(cloneUrl, pluginDir);

      await exec(`git ${cloneArgs.join(' ')}`, {
        timeout: this.config.installTimeout ?? 120_000,
      });

      // Install dependencies if package.json exists
      if (fs.existsSync(path.join(pluginDir, 'package.json'))) {
        await exec('npm install --production', {
          cwd: pluginDir,
          timeout: this.config.installTimeout ?? 120_000,
        });
      }

      // Run build script if present
      const pkgJsonPath = path.join(pluginDir, 'package.json');
      if (fs.existsSync(pkgJsonPath)) {
        const pkgJson = JSON.parse(await fs.promises.readFile(pkgJsonPath, 'utf-8'));
        if (pkgJson.scripts?.build) {
          await exec('npm run build', {
            cwd: pluginDir,
            timeout: this.config.installTimeout ?? 120_000,
          });
        }
      }

      return this.loadFromDirectory(pluginDir, 'github', normalized);
    } catch (err) {
      return {
        success: false,
        error: `Failed to install from GitHub "${normalized}": ${(err as Error).message}`,
      };
    }
  }

  /**
   * Install a plugin from a local directory (for development).
   *
   * @param dirPath - Absolute path to the plugin directory
   */
  async installFromLocal(dirPath: string): Promise<LoadPluginResult> {
    const resolvedPath = path.resolve(dirPath);
    if (!fs.existsSync(resolvedPath)) {
      return { success: false, error: `Directory does not exist: "${resolvedPath}"` };
    }

    return this.loadFromDirectory(resolvedPath, 'local', resolvedPath);
  }

  /**
   * Load a plugin that's already installed.
   *
   * @param entry - Registry entry for the installed plugin
   */
  async loadPlugin(entry: PluginRegistryEntry): Promise<LoadPluginResult> {
    return this.loadFromDirectory(entry.installPath, entry.source, entry.sourceRef);
  }

  /**
   * Uninstall a plugin by removing its directory.
   */
  async uninstall(entry: PluginRegistryEntry): Promise<{ success: boolean; error?: string }> {
    try {
      // For npm installs, the plugin is nested inside a host directory
      const dirToRemove =
        entry.source === 'npm'
          ? path.resolve(entry.installPath, '..', '..')
          : entry.installPath;

      if (fs.existsSync(dirToRemove)) {
        await fs.promises.rm(dirToRemove, { recursive: true, force: true });
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * Check if a newer version is available for an npm plugin.
   */
  async checkForUpdate(
    packageName: string,
    currentVersion: string,
  ): Promise<{ available: boolean; latestVersion?: string }> {
    try {
      const { stdout } = await exec(`npm view ${packageName} version`, { timeout: 15_000 });
      const latestVersion = stdout.trim();
      return {
        available: latestVersion !== currentVersion,
        latestVersion,
      };
    } catch {
      return { available: false };
    }
  }

  /**
   * Scan the plugins directory to discover all installed plugins.
   */
  async discoverInstalled(): Promise<LoadPluginResult[]> {
    const results: LoadPluginResult[] = [];

    if (!fs.existsSync(this.config.pluginsDir)) {
      return results;
    }

    const entries = await fs.promises.readdir(this.config.pluginsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const dirPath = path.join(this.config.pluginsDir, entry.name);

      // Check if this is an npm install (has node_modules)
      const nodeModulesDir = path.join(dirPath, 'node_modules');
      if (fs.existsSync(nodeModulesDir)) {
        // Scan node_modules for the actual plugin
        const modules = await fs.promises.readdir(nodeModulesDir, { withFileTypes: true });
        for (const mod of modules) {
          if (!mod.isDirectory() || mod.name.startsWith('.')) continue;

          if (mod.name.startsWith('@')) {
            // Scoped package
            const scoped = await fs.promises.readdir(path.join(nodeModulesDir, mod.name), {
              withFileTypes: true,
            });
            for (const scopedMod of scoped) {
              if (!scopedMod.isDirectory()) continue;
              const fullPath = path.join(nodeModulesDir, mod.name, scopedMod.name);
              const result = await this.tryLoadAsPlugin(fullPath, 'npm');
              if (result) results.push(result);
            }
          } else {
            const fullPath = path.join(nodeModulesDir, mod.name);
            const result = await this.tryLoadAsPlugin(fullPath, 'npm');
            if (result) results.push(result);
          }
        }
      } else {
        // Direct directory (GitHub or local install)
        const result = await this.tryLoadAsPlugin(dirPath, 'github');
        if (result) results.push(result);
      }
    }

    return results;
  }

  // ─── Private Methods ────────────────────────────────────────────────────────

  private async loadFromDirectory(
    dirPath: string,
    source: PluginSource,
    sourceRef: string,
  ): Promise<LoadPluginResult> {
    try {
      // 1. Read and validate package.json
      const pkgJsonPath = path.join(dirPath, 'package.json');
      if (!fs.existsSync(pkgJsonPath)) {
        return { success: false, error: `No package.json found in "${dirPath}"` };
      }

      const raw = JSON.parse(await fs.promises.readFile(pkgJsonPath, 'utf-8'));
      const validation = validatePluginPackageJson(raw);

      if (!validation.valid) {
        const errorMessages = validation.errors?.map((e) => `  ${e.path}: ${e.message}`).join('\n');
        return {
          success: false,
          error: `Invalid plugin manifest:\n${errorMessages}`,
        };
      }

      const manifest = validation.manifest!;
      const packageJson = validation.packageJson!;

      // 2. Check host version compatibility
      if (manifest.minHostVersion) {
        const compatible = this.checkVersionCompatibility(
          this.config.hostVersion,
          manifest.minHostVersion,
        );
        if (!compatible) {
          return {
            success: false,
            error: `Plugin requires AionUi >= ${manifest.minHostVersion}, but host is ${this.config.hostVersion}`,
          };
        }
      }

      // 3. Resolve the plugin entry point
      const mainFile = raw.main || './dist/index.js';
      const entryPath = path.resolve(dirPath, mainFile);

      if (!fs.existsSync(entryPath)) {
        return {
          success: false,
          error: `Plugin entry point not found: "${entryPath}"`,
        };
      }

      // 4. Load the plugin module
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pluginModule = require(entryPath);
      const plugin: AionPlugin = pluginModule.default || pluginModule;

      if (!plugin.id || !plugin.version || typeof plugin.activate !== 'function') {
        return {
          success: false,
          error: 'Plugin must export an object with id, version, and activate()',
        };
      }

      // 5. Load provider adapters from manifest paths
      if (manifest.adapters) {
        plugin.adapters = plugin.adapters || {};
        for (const [provider, adapterPath] of Object.entries(manifest.adapters)) {
          if (plugin.adapters[provider]) continue; // already set in code

          const resolvedAdapterPath = path.resolve(dirPath, adapterPath);
          if (fs.existsSync(resolvedAdapterPath)) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const adapterModule = require(resolvedAdapterPath);
            plugin.adapters[provider] = adapterModule.default || adapterModule;
          }
        }
      }

      // 6. Build registry entry
      const entry: PluginRegistryEntry = {
        id: packageJson.name,
        version: packageJson.version,
        source,
        sourceRef,
        installPath: dirPath,
        manifest,
        state: 'installed',
        grantedPermissions: [],
        settings: this.extractDefaultSettings(manifest),
        installedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return { success: true, entry, plugin };
    } catch (err) {
      return {
        success: false,
        error: `Failed to load plugin from "${dirPath}": ${(err as Error).message}`,
      };
    }
  }

  private async tryLoadAsPlugin(dirPath: string, source: PluginSource): Promise<LoadPluginResult | null> {
    const pkgJsonPath = path.join(dirPath, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) return null;

    try {
      const raw = JSON.parse(await fs.promises.readFile(pkgJsonPath, 'utf-8'));
      if (!raw.aionui) return null; // Not an AionUi plugin

      const name = raw.name || path.basename(dirPath);
      return this.loadFromDirectory(dirPath, source, name);
    } catch {
      return null;
    }
  }

  private normalizeGithubRepo(input: string): string | null {
    // Handle full URLs
    const urlMatch = input.match(
      /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/,
    );
    if (urlMatch) {
      return urlMatch[1].replace(/\.git$/, '');
    }

    // Handle owner/repo format
    if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(input)) {
      return input;
    }

    return null;
  }

  private checkVersionCompatibility(hostVersion: string, requiredVersion: string): boolean {
    const host = hostVersion.split('.').map(Number);
    const required = requiredVersion.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      if ((host[i] || 0) > (required[i] || 0)) return true;
      if ((host[i] || 0) < (required[i] || 0)) return false;
    }

    return true; // exact match
  }

  private extractDefaultSettings(manifest: PluginManifest): Record<string, unknown> {
    const defaults: Record<string, unknown> = {};
    if (manifest.settings) {
      for (const [key, def] of Object.entries(manifest.settings)) {
        if (def.default !== undefined) {
          defaults[key] = def.default;
        }
      }
    }
    return defaults;
  }

  private ensurePluginsDir(): void {
    if (!fs.existsSync(this.config.pluginsDir)) {
      fs.mkdirSync(this.config.pluginsDir, { recursive: true });
    }
  }

  private getPluginDir(packageName: string): string {
    const safeName = packageName.replace(/[/@]/g, '_');
    return path.join(this.config.pluginsDir, safeName);
  }
}
