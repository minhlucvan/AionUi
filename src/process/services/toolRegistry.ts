/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import type { ToolManifest } from '@/common/types/tool';

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
type LoadedTool = {
  manifest: ToolManifest;
  /** Absolute path to the tool directory (e.g. .../tools/github-cli) */
  toolDir: string;
};

/**
 * Registry that dynamically discovers and loads tool definitions
 * from `tools/<tool-dir>/tool.json` files.
 */
class ToolRegistry {
  private tools: LoadedTool[] = [];
  private toolsDir = '';
  private initialized = false;

  /** Load all tools from the tools directory */
  initialize(): void {
    if (this.initialized) return;

    this.toolsDir = resolveToolsDir();
    this.tools = [];

    if (!fs.existsSync(this.toolsDir)) {
      console.warn(`[ToolRegistry] Tools directory not found: ${this.toolsDir}`);
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
        console.log(`[ToolRegistry] Loaded tool: ${manifest.name} (${manifest.id}) from ${entry.name}`);
      } catch (error) {
        console.error(`[ToolRegistry] Failed to parse tool.json in ${entry.name}:`, error);
      }
    }

    console.log(`[ToolRegistry] ${this.tools.length} tool(s) loaded from ${this.toolsDir}`);
    this.initialized = true;
  }

  /** Reload all tool definitions (e.g. after adding new tools) */
  reload(): void {
    this.initialized = false;
    this.initialize();
  }

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

  /** Get the first skill name associated with a tool (for backward compat) */
  getFirstSkillName(toolId: string): string | undefined {
    const tool = this.getById(toolId);
    if (!tool) return undefined;
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

  private ensureInitialized(): void {
    if (!this.initialized) {
      this.initialize();
    }
  }
}

/** Singleton tool registry instance */
export const toolRegistry = new ToolRegistry();
