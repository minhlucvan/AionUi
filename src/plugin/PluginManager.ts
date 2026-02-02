/**
 * AionUi Plugin Manager
 *
 * Central orchestrator for the plugin system. A plugin works like an installable
 * agent capability — it bundles system prompts, skills (SKILL.md), tools, and
 * MCP servers. The PluginManager merges these into the existing agent pipeline.
 *
 * Integration points with the existing codebase:
 *   - Skills    → merged into AcpSkillManager / loadSkillsContent pool
 *   - Prompts   → injected via prepareFirstMessage / prepareFirstMessageWithSkillsIndex
 *   - Tools     → registered alongside Gemini coreTools / ACP tool definitions
 *   - MCP       → registered alongside user-configured MCP servers
 *
 * Lifecycle: install → register → activate → capabilities available → deactivate → uninstall
 */

import { exec as execCb } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

import { PluginLoader } from './loader/PluginLoader';
import type { AIProvider, AionPlugin, PluginContext, PluginLogger, PluginMcpServer, PluginPermission, PluginRegistryEntry, PluginSkillDefinition, PluginToolDefinition, ToolExecutionContext, ToolResult } from './types';

const execAsync = promisify(execCb);

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActivePlugin {
  entry: PluginRegistryEntry;
  instance: AionPlugin;
  context: PluginContext;
}

interface PluginManagerConfig {
  /** Directory to store installed plugins */
  pluginsDir: string;

  /** Path to the plugin registry JSON file */
  registryPath: string;

  /** AionUi host version */
  hostVersion: string;

  /** Current workspace path */
  workspace: string;

  /** Host skills directory (where built-in skills live) */
  skillsDir: string;

  /** Proxy for network operations */
  proxy?: string;
}

type PluginEventListener = (...args: unknown[]) => void;

// ─── Plugin Manager ──────────────────────────────────────────────────────────

export class PluginManager {
  private config: PluginManagerConfig;
  private loader: PluginLoader;
  private registry: Map<string, PluginRegistryEntry> = new Map();
  private activePlugins: Map<string, ActivePlugin> = new Map();
  private currentProvider: AIProvider = 'gemini';
  private eventListeners: Map<string, Set<PluginEventListener>> = new Map();

  constructor(config: PluginManagerConfig) {
    this.config = config;
    this.loader = new PluginLoader({
      pluginsDir: config.pluginsDir,
      hostVersion: config.hostVersion,
      proxy: config.proxy,
    });
  }

  // ─── Initialization ──────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    await this.loadRegistry();

    for (const [id, entry] of this.registry) {
      if (entry.state === 'active') {
        try {
          await this.activatePlugin(id);
        } catch (err) {
          console.error(`[PluginManager] Failed to activate plugin "${id}":`, err);
          entry.state = 'error';
          entry.error = (err as Error).message;
        }
      }
    }
  }

  async shutdown(): Promise<void> {
    const activeIds = [...this.activePlugins.keys()];
    for (const id of activeIds) {
      try {
        await this.deactivatePlugin(id);
      } catch (err) {
        console.error(`[PluginManager] Error deactivating plugin "${id}":`, err);
      }
    }
    await this.saveRegistry();
  }

  // ─── Installation ────────────────────────────────────────────────────────

  /**
   * Register a built-in plugin directly (bypasses install/load flow).
   *
   * Used by initPluginSystem to register the built-in skill plugins
   * (pdf, pptx, docx, xlsx) that are bundled with the app. These plugins
   * are pre-activated during startup so their system prompts and tools
   * are immediately available.
   *
   * Unlike installFromNpm/Github, this does NOT:
   *   - Download or copy files
   *   - Validate the manifest
   *   - Copy skill files (they're already in getSkillsDir via initBuiltinAssistantRules)
   *   - Persist to the registry file (built-in plugins are re-registered each startup)
   */
  registerBuiltinPlugin(plugin: AionPlugin, entry: PluginRegistryEntry): void {
    // Add to registry (in-memory only, not persisted)
    this.registry.set(entry.id, entry);

    // Create the plugin context
    const context = this.createPluginContext(entry);

    // Register as active
    this.activePlugins.set(entry.id, {
      entry,
      instance: plugin,
      context,
    });

    this.emit('plugin:activated', { pluginId: entry.id, builtin: true });
  }

  async installFromNpm(packageName: string, version?: string): Promise<{ success: boolean; pluginId?: string; error?: string }> {
    const result = await this.loader.installFromNpm(packageName, version);
    if (!result.success || !result.entry) {
      return { success: false, error: result.error };
    }

    this.registry.set(result.entry.id, result.entry);
    await this.saveRegistry();
    this.emit('plugin:installed', { pluginId: result.entry.id, source: 'npm' });

    return { success: true, pluginId: result.entry.id };
  }

  async installFromGithub(repo: string, ref?: string): Promise<{ success: boolean; pluginId?: string; error?: string }> {
    const result = await this.loader.installFromGithub(repo, ref);
    if (!result.success || !result.entry) {
      return { success: false, error: result.error };
    }

    this.registry.set(result.entry.id, result.entry);
    await this.saveRegistry();
    this.emit('plugin:installed', { pluginId: result.entry.id, source: 'github' });

    return { success: true, pluginId: result.entry.id };
  }

  async installFromLocal(dirPath: string): Promise<{ success: boolean; pluginId?: string; error?: string }> {
    const result = await this.loader.installFromLocal(dirPath);
    if (!result.success || !result.entry) {
      return { success: false, error: result.error };
    }

    this.registry.set(result.entry.id, result.entry);
    await this.saveRegistry();
    this.emit('plugin:installed', { pluginId: result.entry.id, source: 'local' });

    return { success: true, pluginId: result.entry.id };
  }

  async uninstall(pluginId: string): Promise<{ success: boolean; error?: string }> {
    if (this.activePlugins.has(pluginId)) {
      await this.deactivatePlugin(pluginId);
    }

    const entry = this.registry.get(pluginId);
    if (!entry) {
      return { success: false, error: `Plugin "${pluginId}" not found in registry` };
    }

    const result = await this.loader.uninstall(entry);
    if (result.success) {
      this.registry.delete(pluginId);
      await this.saveRegistry();
      this.emit('plugin:uninstalled', { pluginId });
    }

    return result;
  }

  // ─── Activation / Deactivation ──────────────────────────────────────────

  async activatePlugin(pluginId: string): Promise<{ success: boolean; error?: string }> {
    if (this.activePlugins.has(pluginId)) {
      return { success: true };
    }

    const entry = this.registry.get(pluginId);
    if (!entry) {
      return { success: false, error: `Plugin "${pluginId}" not found` };
    }

    try {
      const loadResult = await this.loader.loadPlugin(entry);
      if (!loadResult.success || !loadResult.plugin) {
        return { success: false, error: loadResult.error };
      }

      const plugin = loadResult.plugin;
      const context = this.createPluginContext(entry);

      // Call activate()
      await plugin.activate(context);

      // If plugin has file-based skills, copy them to the host skills dir
      await this.installPluginSkills(plugin, entry);

      // If plugin has MCP servers, register them
      if (plugin.mcpServers?.length) {
        this.registerPluginMcpServers(plugin, entry);
      }

      this.activePlugins.set(pluginId, { entry, instance: plugin, context });

      entry.state = 'active';
      entry.error = undefined;
      await this.saveRegistry();

      this.emit('plugin:activated', { pluginId });

      return { success: true };
    } catch (err) {
      entry.state = 'error';
      entry.error = (err as Error).message;
      await this.saveRegistry();
      return { success: false, error: (err as Error).message };
    }
  }

  async deactivatePlugin(pluginId: string): Promise<{ success: boolean; error?: string }> {
    const active = this.activePlugins.get(pluginId);
    if (!active) {
      return { success: true };
    }

    try {
      // Unregister MCP servers
      if (active.instance.mcpServers?.length) {
        this.unregisterPluginMcpServers(active.instance, active.entry);
      }

      // Call deactivate()
      if (active.instance.deactivate) {
        await active.instance.deactivate();
      }

      this.activePlugins.delete(pluginId);

      const entry = this.registry.get(pluginId);
      if (entry) {
        entry.state = 'inactive';
        await this.saveRegistry();
      }

      this.emit('plugin:deactivated', { pluginId });

      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  // ─── Capability: System Prompts ─────────────────────────────────────────
  //
  // Collected by prepareFirstMessage / prepareFirstMessageWithSkillsIndex
  // and injected as [Assistant Rules] in the first message, exactly like
  // presetRules / AcpBackendConfig.context.

  /**
   * Collect all system prompts from active plugins.
   * Returns them sorted by priority and filtered for the given provider.
   *
   * Called by agentUtils.ts when composing the first message.
   */
  collectSystemPrompts(provider?: AIProvider): string[] {
    const effectiveProvider = provider ?? this.currentProvider;
    const prompts: Array<{ content: string; priority: number }> = [];

    for (const [, active] of this.activePlugins) {
      if (!active.instance.systemPrompts) continue;

      for (const prompt of active.instance.systemPrompts) {
        // Filter by provider if specified
        if (prompt.providers && !prompt.providers.includes(effectiveProvider)) {
          continue;
        }

        prompts.push({
          content: prompt.content,
          priority: prompt.priority ?? 100,
        });
      }
    }

    // Sort by priority (lower = earlier)
    prompts.sort((a, b) => a.priority - b.priority);

    return prompts.map((p) => p.content);
  }

  // ─── Capability: Skills ─────────────────────────────────────────────────
  //
  // Plugin skills merge into the same pool as built-in /skills/*.
  // They appear in [Available Skills] alongside docx, pdf, etc.

  /**
   * Collect all skill definitions from active plugins.
   * Returns PluginSkillDefinition[] that can be merged with
   * AcpSkillManager's skill index.
   */
  collectPluginSkills(): PluginSkillDefinition[] {
    const skills: PluginSkillDefinition[] = [];

    for (const [, active] of this.activePlugins) {
      if (!active.instance.skills) continue;
      skills.push(...active.instance.skills);
    }

    return skills;
  }

  /**
   * Get the names of all skills provided by active plugins.
   * Used to extend the enabledSkills list.
   */
  getPluginSkillNames(): string[] {
    return this.collectPluginSkills().map((s) => s.name);
  }

  /**
   * Install plugin skill files into the host skills directory.
   * This makes them discoverable by AcpSkillManager and loadSkillsContent.
   *
   * Supports two modes:
   *   1. File-based: Plugin ships a `skills/{name}/` directory with SKILL.md
   *      and scripts/references — the entire directory tree is copied.
   *   2. Code-based: Skill has an inline `body` — SKILL.md is generated.
   *
   * This is key for the migration pattern: built-in skills (pdf, pptx, docx, xlsx)
   * can be packaged as plugins and their entire skill directories (SKILL.md +
   * scripts + references + schemas) are installed into the host skills dir.
   */
  private async installPluginSkills(plugin: AionPlugin, entry: PluginRegistryEntry): Promise<void> {
    if (!plugin.skills?.length) return;

    for (const skill of plugin.skills) {
      const destSkillDir = path.join(this.config.skillsDir, skill.name);

      // Don't overwrite existing built-in skills
      if (fs.existsSync(destSkillDir)) {
        console.warn(`[PluginManager] Skill "${skill.name}" already exists, skipping (plugin: ${entry.id})`);
        continue;
      }

      // Check if the plugin ships a file-based skill directory
      const pluginSkillDir = path.join(entry.installPath, 'skills', skill.name);
      const pluginSkillMd = path.join(pluginSkillDir, 'SKILL.md');

      if (fs.existsSync(pluginSkillMd)) {
        // ── File-based skill: copy the entire directory tree ──────────────
        // This preserves scripts/, references/, schemas/, templates/, etc.
        await this.copyDirectoryRecursive(pluginSkillDir, destSkillDir);
        console.log(`[PluginManager] Installed skill "${skill.name}" from plugin "${entry.id}" (file-based, full directory)`);
      } else {
        // ── Code-based skill: generate SKILL.md from inline definition ────
        await fs.promises.mkdir(destSkillDir, { recursive: true });
        const skillContent = this.buildSkillMd(skill);
        await fs.promises.writeFile(path.join(destSkillDir, 'SKILL.md'), skillContent, 'utf-8');

        // Copy bundled resources if any (flattened into skill dir)
        if (skill.resources) {
          for (const resource of skill.resources) {
            const srcPath = path.join(entry.installPath, resource);
            const destPath = path.join(destSkillDir, path.basename(resource));
            if (fs.existsSync(srcPath)) {
              await fs.promises.copyFile(srcPath, destPath);
            }
          }
        }

        console.log(`[PluginManager] Installed skill "${skill.name}" from plugin "${entry.id}" (code-based)`);
      }
    }
  }

  /**
   * Recursively copy a directory tree.
   * Used to install file-based plugin skills with all their scripts,
   * references, schemas, and other bundled resources.
   */
  private async copyDirectoryRecursive(src: string, dest: string): Promise<void> {
    await fs.promises.mkdir(dest, { recursive: true });

    const entries = await fs.promises.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectoryRecursive(srcPath, destPath);
      } else {
        await fs.promises.copyFile(srcPath, destPath);
      }
    }
  }

  private buildSkillMd(skill: PluginSkillDefinition): string {
    const frontmatter = `---\nname: ${skill.name}\ndescription: '${skill.description.replace(/'/g, "\\'")}'\n---\n`;

    if (skill.body) {
      return frontmatter + '\n' + skill.body;
    }

    return frontmatter + `\n# ${skill.name}\n\n${skill.description}\n`;
  }

  // ─── Capability: Tools ──────────────────────────────────────────────────
  //
  // Plugin tools are function-calling definitions. The PluginManager
  // namespaces them and handles execution when the agent calls them.

  /**
   * Collect all tool definitions from active plugins.
   * Returns them with namespaced names for the given provider.
   */
  collectPluginTools(provider?: AIProvider): PluginToolDefinition[] {
    const effectiveProvider = provider ?? this.currentProvider;
    const tools: PluginToolDefinition[] = [];

    for (const [, active] of this.activePlugins) {
      if (!active.instance.tools) continue;

      for (const tool of active.instance.tools) {
        // Filter by provider if tool specifies providers
        if (tool.providers && !tool.providers.includes(effectiveProvider)) {
          continue;
        }

        tools.push({
          ...tool,
          // Namespace to avoid collisions: plugin:pluginId:toolName
          name: `plugin:${active.entry.id}:${tool.name}`,
        });
      }
    }

    return tools;
  }

  /**
   * Execute a plugin tool by its namespaced name.
   *
   * The tool handler receives a ToolExecutionContext that includes the
   * workspace, provider, settings, and logger. For plugins with shell:execute
   * permission, the context also includes `exec` and `pluginDir` so tool
   * handlers can run bundled scripts without storing module-level state.
   */
  async executeTool(namespacedName: string, params: Record<string, unknown>, conversationId: string): Promise<ToolResult> {
    const parts = namespacedName.split(':');
    if (parts.length < 3 || parts[0] !== 'plugin') {
      return { success: false, error: `Invalid plugin tool name: "${namespacedName}"` };
    }

    const pluginId = parts[1];
    const toolName = parts.slice(2).join(':');
    const active = this.activePlugins.get(pluginId);

    if (!active) {
      return { success: false, error: `Plugin "${pluginId}" is not active` };
    }

    const tool = active.instance.tools?.find((t) => t.name === toolName);
    if (!tool) {
      return { success: false, error: `Tool "${toolName}" not found in plugin "${pluginId}"` };
    }

    // Build the execution context.
    // We extend it with exec and pluginDir from the plugin's activation context
    // so tool handlers can run bundled scripts. The base ToolExecutionContext type
    // doesn't declare these, but plugins that need shell access cast or check for them.
    const context: ToolExecutionContext & {
      exec?: PluginContext['exec'];
      pluginDir?: string;
    } = {
      workspace: this.config.workspace,
      provider: this.currentProvider,
      conversationId,
      settings: {
        ...active.entry.settings,
        _pluginDir: active.entry.installPath,
      },
      logger: this.createPluginLogger(pluginId),
      // Pass exec from the plugin's activation context if available
      exec: active.context.exec,
      pluginDir: active.entry.installPath,
    };

    try {
      return await tool.handler(params, context);
    } catch (err) {
      return {
        success: false,
        error: `Tool "${toolName}" failed: ${(err as Error).message}`,
      };
    }
  }

  isPluginTool(toolName: string): boolean {
    return toolName.startsWith('plugin:');
  }

  // ─── Capability: MCP Servers ────────────────────────────────────────────
  //
  // Plugin MCP servers are registered alongside user-configured servers.
  // The agent sees tools from plugin MCP servers just like any other.

  /**
   * Collect all MCP server configs from active plugins.
   * Returns them in the format expected by the MCP management system.
   */
  collectPluginMcpServers(): PluginMcpServer[] {
    const servers: PluginMcpServer[] = [];

    for (const [, active] of this.activePlugins) {
      if (!active.instance.mcpServers) continue;

      for (const server of active.instance.mcpServers) {
        // Resolve bundled server command paths
        const resolved = { ...server };
        if (server.bundled && server.transport.type === 'stdio') {
          const transport = { ...server.transport };
          transport.command = path.resolve(active.entry.installPath, transport.command);
          resolved.transport = transport;
        }

        servers.push(resolved);
      }
    }

    return servers;
  }

  /**
   * Register plugin MCP servers with the host's MCP management.
   * Called during plugin activation.
   */
  private registerPluginMcpServers(plugin: AionPlugin, entry: PluginRegistryEntry): void {
    if (!plugin.mcpServers?.length) return;

    for (const server of plugin.mcpServers) {
      console.log(`[PluginManager] Registering MCP server "${server.name}" from plugin "${entry.id}"`);
      // The actual IMcpServer registration will be handled by the bridge
      // which calls back to the MCP services to add the server config
    }

    this.emit('plugin:mcp-servers-changed', {
      pluginId: entry.id,
      servers: plugin.mcpServers.map((s) => s.name),
    });
  }

  private unregisterPluginMcpServers(plugin: AionPlugin, entry: PluginRegistryEntry): void {
    if (!plugin.mcpServers?.length) return;

    for (const server of plugin.mcpServers) {
      console.log(`[PluginManager] Unregistering MCP server "${server.name}" from plugin "${entry.id}"`);
    }

    this.emit('plugin:mcp-servers-changed', {
      pluginId: entry.id,
      servers: [],
    });
  }

  // ─── Hooks ──────────────────────────────────────────────────────────────

  /**
   * Run onBeforeMessage hooks from all active plugins.
   * Returns the (possibly modified) message.
   */
  async runBeforeMessageHooks(message: string, conversationId: string, provider?: AIProvider): Promise<{ message: string; cancel?: boolean }> {
    let current = message;

    for (const active of this.getSortedActivePlugins()) {
      const hook = active.instance.hooks?.onBeforeMessage;
      if (!hook) continue;

      try {
        const result = await hook({
          message: current,
          conversationId,
          provider: provider ?? this.currentProvider,
        });
        if (result.cancel) {
          return { message: current, cancel: true };
        }
        current = result.message;
      } catch (err) {
        console.error(`[PluginManager] Hook error in "${active.entry.id}":`, err);
      }
    }

    return { message: current };
  }

  /**
   * Run onAfterResponse hooks from all active plugins.
   */
  async runAfterResponseHooks(response: string, conversationId: string, provider?: AIProvider): Promise<{ response: string }> {
    let current = response;

    for (const active of this.getSortedActivePlugins().reverse()) {
      const hook = active.instance.hooks?.onAfterResponse;
      if (!hook) continue;

      try {
        const result = await hook({
          response: current,
          conversationId,
          provider: provider ?? this.currentProvider,
        });
        current = result.response;
      } catch (err) {
        console.error(`[PluginManager] Hook error in "${active.entry.id}":`, err);
      }
    }

    return { response: current };
  }

  // ─── Provider Management ────────────────────────────────────────────────

  setActiveProvider(provider: AIProvider): void {
    this.currentProvider = provider;
    this.emit('provider:changed', { provider });
  }

  getActiveProvider(): AIProvider {
    return this.currentProvider;
  }

  // ─── Settings & Permissions ─────────────────────────────────────────────

  async updatePluginSettings(pluginId: string, settings: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
    const entry = this.registry.get(pluginId);
    if (!entry) {
      return { success: false, error: `Plugin "${pluginId}" not found` };
    }

    entry.settings = { ...entry.settings, ...settings };
    entry.updatedAt = new Date().toISOString();
    await this.saveRegistry();

    // Notify plugin if active
    const active = this.activePlugins.get(pluginId);
    if (active?.instance.hooks?.onSettingsChanged) {
      try {
        await active.instance.hooks.onSettingsChanged(entry.settings);
      } catch (err) {
        console.error(`[PluginManager] Settings change error in "${pluginId}":`, err);
      }
    }

    return { success: true };
  }

  async grantPermissions(pluginId: string, permissions: PluginPermission[]): Promise<{ success: boolean; error?: string }> {
    const entry = this.registry.get(pluginId);
    if (!entry) {
      return { success: false, error: `Plugin "${pluginId}" not found` };
    }

    entry.grantedPermissions = [...new Set([...entry.grantedPermissions, ...permissions])];
    entry.updatedAt = new Date().toISOString();
    await this.saveRegistry();

    return { success: true };
  }

  async revokePermissions(pluginId: string, permissions: PluginPermission[]): Promise<{ success: boolean; error?: string }> {
    const entry = this.registry.get(pluginId);
    if (!entry) {
      return { success: false, error: `Plugin "${pluginId}" not found` };
    }

    entry.grantedPermissions = entry.grantedPermissions.filter((p) => !permissions.includes(p));
    entry.updatedAt = new Date().toISOString();
    await this.saveRegistry();

    return { success: true };
  }

  // ─── Query Methods ──────────────────────────────────────────────────────

  getPlugins(): PluginRegistryEntry[] {
    return [...this.registry.values()];
  }

  getPlugin(pluginId: string): PluginRegistryEntry | undefined {
    return this.registry.get(pluginId);
  }

  getActivePlugins(): PluginRegistryEntry[] {
    return [...this.activePlugins.values()].map((a) => a.entry);
  }

  isPluginActive(pluginId: string): boolean {
    return this.activePlugins.has(pluginId);
  }

  async checkForUpdates(): Promise<Array<{ pluginId: string; currentVersion: string; latestVersion: string }>> {
    const updates: Array<{
      pluginId: string;
      currentVersion: string;
      latestVersion: string;
    }> = [];

    for (const [id, entry] of this.registry) {
      if (entry.source !== 'npm') continue;

      const result = await this.loader.checkForUpdate(entry.sourceRef, entry.version);
      if (result.available && result.latestVersion) {
        updates.push({
          pluginId: id,
          currentVersion: entry.version,
          latestVersion: result.latestVersion,
        });
      }
    }

    return updates;
  }

  // ─── Events ─────────────────────────────────────────────────────────────

  on(event: string, listener: PluginEventListener): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);

    return () => {
      this.eventListeners.get(event)?.delete(listener);
    };
  }

  private emit(event: string, data: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(data);
        } catch (err) {
          console.error(`[PluginManager] Event listener error for "${event}":`, err);
        }
      }
    }
  }

  // ─── Private Helpers ────────────────────────────────────────────────────

  private getSortedActivePlugins(): ActivePlugin[] {
    return [...this.activePlugins.values()].sort((a, b) => (a.instance.priority ?? 100) - (b.instance.priority ?? 100));
  }

  private createPluginContext(entry: PluginRegistryEntry): PluginContext {
    const logger = this.createPluginLogger(entry.id);
    const grantedPerms = new Set(entry.grantedPermissions);

    const context: PluginContext = {
      pluginId: entry.id,
      settings: { ...entry.settings },
      workspace: this.config.workspace,
      pluginDir: entry.installPath,
      logger,
      activeProvider: this.currentProvider,
      skillsDir: this.config.skillsDir,

      onSettingsChange(_callback) {
        // Simple subscriber pattern
        const unsub = () => {};
        return unsub;
      },

      onProviderChange(_callback) {
        const unsub = () => {};
        return unsub;
      },
    };

    // Grant capabilities based on permissions
    if (grantedPerms.has('fs:read')) {
      context.readFile = async (filePath: string) => {
        const resolved = this.resolvePluginPath(filePath, entry);
        return await fs.promises.readFile(resolved, 'utf-8');
      };
    }

    if (grantedPerms.has('fs:write')) {
      context.writeFile = async (filePath: string, content: string) => {
        const resolved = this.resolvePluginPath(filePath, entry);
        await fs.promises.mkdir(path.dirname(resolved), { recursive: true });
        await fs.promises.writeFile(resolved, content, 'utf-8');
      };
    }

    if (grantedPerms.has('network:fetch')) {
      context.fetch = async (url: string, options?: RequestInit) => {
        return await globalThis.fetch(url, options);
      };
    }

    if (grantedPerms.has('shell:execute')) {
      context.exec = async (command: string, options?: { cwd?: string; timeout?: number }) => {
        const result = await execAsync(command, {
          cwd: options?.cwd ?? this.config.workspace,
          timeout: options?.timeout ?? 30_000,
        });
        return {
          stdout: result.stdout?.toString() ?? '',
          stderr: result.stderr?.toString() ?? '',
          exitCode: 0,
        };
      };
    }

    return context;
  }

  private resolvePluginPath(filePath: string, entry: PluginRegistryEntry): string {
    if (path.isAbsolute(filePath)) {
      if (!entry.grantedPermissions.includes('fs:global') && !filePath.startsWith(this.config.workspace)) {
        throw new Error(`Plugin "${entry.id}" cannot access files outside workspace without fs:global permission`);
      }
      return filePath;
    }

    return path.resolve(this.config.workspace, filePath);
  }

  private createPluginLogger(pluginId: string): PluginLogger {
    const prefix = `[Plugin:${pluginId}]`;
    return {
      debug: (msg: string, ...args: unknown[]) => console.debug(prefix, msg, ...args),
      info: (msg: string, ...args: unknown[]) => console.info(prefix, msg, ...args),
      warn: (msg: string, ...args: unknown[]) => console.warn(prefix, msg, ...args),
      error: (msg: string, ...args: unknown[]) => console.error(prefix, msg, ...args),
    };
  }

  // ─── Registry Persistence ──────────────────────────────────────────────

  private async loadRegistry(): Promise<void> {
    try {
      if (fs.existsSync(this.config.registryPath)) {
        const raw = await fs.promises.readFile(this.config.registryPath, 'utf-8');
        const entries: PluginRegistryEntry[] = JSON.parse(raw);
        this.registry.clear();
        for (const entry of entries) {
          this.registry.set(entry.id, entry);
        }
      }
    } catch (err) {
      console.error('[PluginManager] Failed to load registry:', err);
      this.registry.clear();
    }
  }

  private async saveRegistry(): Promise<void> {
    try {
      const dir = path.dirname(this.config.registryPath);
      await fs.promises.mkdir(dir, { recursive: true });

      const entries = [...this.registry.values()];
      await fs.promises.writeFile(this.config.registryPath, JSON.stringify(entries, null, 2), 'utf-8');
    } catch (err) {
      console.error('[PluginManager] Failed to save registry:', err);
    }
  }
}
