/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type {
  ClaudeCodeWorkspace,
  ClaudeCodePluginManifest,
  ClaudeCodeSkill,
  ClaudeCodeCommand,
  ClaudeCodeAgent,
  ClaudeCodeHook,
  ClaudeCodeMcpConfig,
  WorkspaceLoadOptions,
  WorkspaceLoadResult,
  ClaudeCodeHookType,
} from './types';

/**
 * Workspace Loader for Claude Code
 *
 * Scans a directory for Claude Code workspace structure:
 * - .claude-plugin/plugin.json (plugin manifests)
 * - skills/ (skill definitions)
 * - commands/ (slash commands)
 * - agents/ (specialized agents)
 * - hooks/ (lifecycle hooks)
 * - .mcp.json (MCP server config)
 */
export class WorkspaceLoader {
  private rootPath: string;
  private warnings: string[] = [];

  constructor(rootPath: string) {
    this.rootPath = path.resolve(rootPath);
  }

  /**
   * Load the Claude Code workspace
   */
  async load(options: WorkspaceLoadOptions = {}): Promise<WorkspaceLoadResult> {
    const {
      loadSkills = true,
      loadCommands = true,
      loadAgents = true,
      loadHooks = true,
      loadMcpConfig = true,
      scanPlugins = true,
    } = options;

    try {
      // Check if workspace exists
      if (!fs.existsSync(this.rootPath)) {
        return {
          success: false,
          error: `Workspace path does not exist: ${this.rootPath}`,
        };
      }

      const workspace: ClaudeCodeWorkspace = {
        rootPath: this.rootPath,
        plugins: [],
        skills: [],
        commands: [],
        agents: [],
        hooks: [],
        loadedAt: new Date(),
      };

      // Scan for plugins
      if (scanPlugins) {
        workspace.plugins = await this.scanPlugins();
      }

      // Load skills
      if (loadSkills) {
        workspace.skills = await this.loadSkills();
      }

      // Load commands
      if (loadCommands) {
        workspace.commands = await this.loadCommands();
      }

      // Load agents
      if (loadAgents) {
        workspace.agents = await this.loadAgents();
      }

      // Load hooks
      if (loadHooks) {
        workspace.hooks = await this.loadHooks();
      }

      // Load MCP config
      if (loadMcpConfig) {
        workspace.mcpConfig = await this.loadMcpConfig();
      }

      return {
        success: true,
        workspace,
        warnings: this.warnings.length > 0 ? this.warnings : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        warnings: this.warnings.length > 0 ? this.warnings : undefined,
      };
    }
  }

  /**
   * Scan for Claude Code plugins in the workspace
   */
  private async scanPlugins(): Promise<Array<{ manifest: ClaudeCodePluginManifest; pluginDir: string }>> {
    const plugins: Array<{ manifest: ClaudeCodePluginManifest; pluginDir: string }> = [];

    // Check root .claude-plugin/plugin.json
    const rootPluginManifest = path.join(this.rootPath, '.claude-plugin', 'plugin.json');
    if (fs.existsSync(rootPluginManifest)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(rootPluginManifest, 'utf-8'));
        plugins.push({ manifest, pluginDir: this.rootPath });
      } catch (error) {
        this.warnings.push(`Failed to parse plugin manifest at ${rootPluginManifest}: ${error}`);
      }
    }

    // TODO: Scan subdirectories for additional plugins if needed

    return plugins;
  }

  /**
   * Load skills from skills/ directories
   */
  private async loadSkills(): Promise<ClaudeCodeSkill[]> {
    return this.loadMarkdownFiles('skills', (filePath, content, metadata) => {
      const id = path.basename(filePath, path.extname(filePath));
      return {
        id,
        name: (metadata?.name as string) || id,
        description: metadata?.description as string,
        content,
        filePath,
        metadata,
      };
    });
  }

  /**
   * Load commands from commands/ directories
   */
  private async loadCommands(): Promise<ClaudeCodeCommand[]> {
    return this.loadMarkdownFiles('commands', (filePath, content, metadata) => {
      const name = path.basename(filePath, path.extname(filePath));
      return {
        name,
        description: metadata?.description as string,
        prompt: content,
        filePath,
        inputHint: metadata?.inputHint as string,
        metadata,
      };
    });
  }

  /**
   * Load agents from agents/ directories
   */
  private async loadAgents(): Promise<ClaudeCodeAgent[]> {
    return this.loadMarkdownFiles('agents', (filePath, content, metadata) => {
      const id = path.basename(filePath, path.extname(filePath));
      return {
        id,
        name: (metadata?.name as string) || id,
        description: metadata?.description as string,
        systemPrompt: content,
        filePath,
        tools: metadata?.tools as string[],
        metadata,
      };
    });
  }

  /**
   * Load hooks from hooks/ directories
   */
  private async loadHooks(): Promise<ClaudeCodeHook[]> {
    const hooks: ClaudeCodeHook[] = [];

    // Hook types map directories to hook types
    const hookDirs: Array<{ dir: string; type: ClaudeCodeHookType }> = [
      { dir: 'SessionStart', type: 'SessionStart' },
      { dir: 'PreToolUse', type: 'PreToolUse' },
      { dir: 'PostToolUse', type: 'PostToolUse' },
      { dir: 'Stop', type: 'Stop' },
    ];

    for (const { dir, type } of hookDirs) {
      const hooksDir = path.join(this.rootPath, 'hooks', dir);
      if (!fs.existsSync(hooksDir)) continue;

      try {
        const files = fs.readdirSync(hooksDir).filter((f) => f.endsWith('.md') || f.endsWith('.markdown'));

        for (const file of files) {
          const filePath = path.join(hooksDir, file);
          try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const { content, metadata } = this.parseMarkdownWithFrontmatter(fileContent);

            hooks.push({
              type,
              name: path.basename(file, path.extname(file)),
              description: metadata?.description as string,
              handler: content,
              filePath,
              priority: metadata?.priority as number,
              metadata,
            });
          } catch (error) {
            this.warnings.push(`Failed to load hook ${filePath}: ${error}`);
          }
        }
      } catch (error) {
        // Directory doesn't exist or can't be read, skip
      }
    }

    return hooks;
  }

  /**
   * Load MCP configuration from .mcp.json
   */
  private async loadMcpConfig(): Promise<ClaudeCodeMcpConfig | undefined> {
    const mcpConfigPath = path.join(this.rootPath, '.mcp.json');
    if (!fs.existsSync(mcpConfigPath)) {
      return undefined;
    }

    try {
      const config = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf-8'));
      return config as ClaudeCodeMcpConfig;
    } catch (error) {
      this.warnings.push(`Failed to parse .mcp.json: ${error}`);
      return undefined;
    }
  }

  /**
   * Generic loader for markdown files in a directory
   */
  private async loadMarkdownFiles<T>(
    dirName: string,
    transform: (filePath: string, content: string, metadata?: Record<string, unknown>) => T,
  ): Promise<T[]> {
    const items: T[] = [];
    const targetDir = path.join(this.rootPath, dirName);

    if (!fs.existsSync(targetDir)) {
      return items;
    }

    try {
      const files = fs.readdirSync(targetDir).filter((f) => f.endsWith('.md') || f.endsWith('.markdown'));

      for (const file of files) {
        const filePath = path.join(targetDir, file);
        try {
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          const { content, metadata } = this.parseMarkdownWithFrontmatter(fileContent);
          items.push(transform(filePath, content, metadata));
        } catch (error) {
          this.warnings.push(`Failed to load ${dirName}/${file}: ${error}`);
        }
      }
    } catch (error) {
      this.warnings.push(`Failed to read ${dirName} directory: ${error}`);
    }

    // Also scan for nested plugin directories
    if (fs.existsSync(targetDir)) {
      try {
        const entries = fs.readdirSync(targetDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const pluginDir = path.join(targetDir, entry.name);
            const pluginManifestPath = path.join(pluginDir, '.claude-plugin', 'plugin.json');

            // If it's a plugin directory, scan its own dirName folder
            if (fs.existsSync(pluginManifestPath)) {
              const pluginTargetDir = path.join(pluginDir, dirName);
              if (fs.existsSync(pluginTargetDir)) {
                try {
                  const pluginFiles = fs.readdirSync(pluginTargetDir).filter((f) => f.endsWith('.md') || f.endsWith('.markdown'));

                  for (const file of pluginFiles) {
                    const filePath = path.join(pluginTargetDir, file);
                    try {
                      const fileContent = fs.readFileSync(filePath, 'utf-8');
                      const { content, metadata } = this.parseMarkdownWithFrontmatter(fileContent);
                      items.push(transform(filePath, content, metadata));
                    } catch (error) {
                      this.warnings.push(`Failed to load plugin ${dirName}/${file}: ${error}`);
                    }
                  }
                } catch (error) {
                  // Skip if can't read plugin directory
                }
              }
            }
          }
        }
      } catch (error) {
        // Skip if can't read entries
      }
    }

    return items;
  }

  /**
   * Parse markdown file with YAML frontmatter
   */
  private parseMarkdownWithFrontmatter(content: string): { content: string; metadata?: Record<string, unknown> } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return { content };
    }

    try {
      const metadata = yaml.load(match[1]) as Record<string, unknown>;
      return {
        content: match[2].trim(),
        metadata,
      };
    } catch (error) {
      this.warnings.push(`Failed to parse YAML frontmatter: ${error}`);
      return { content };
    }
  }
}

/**
 * Convenience function to load a Claude Code workspace
 */
export async function loadClaudeCodeWorkspace(rootPath: string, options?: WorkspaceLoadOptions): Promise<WorkspaceLoadResult> {
  const loader = new WorkspaceLoader(rootPath);
  return loader.load(options);
}
