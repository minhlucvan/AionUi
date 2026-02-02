/**
 * AionUi Plugin Manager
 *
 * Central orchestrator for the plugin system. Manages the full lifecycle:
 * install → register → activate → run hooks/adapters → deactivate → uninstall
 *
 * The PluginManager is a singleton that lives in the main Electron process
 * and communicates with the renderer via IPC bridges.
 */

import * as fs from 'fs';
import * as path from 'path';

import { PluginLoader } from './loader/PluginLoader';
import type {
  AIProvider,
  AdapterMessage,
  AionPlugin,
  ConversationContext,
  MessageHookContext,
  MessageHookResult,
  PluginContext,
  PluginHooks,
  PluginLogger,
  PluginPermission,
  PluginRegistryEntry,
  PluginSkill,
  PluginTool,
  ProviderAdapter,
  ProviderToolDefinition,
  ResponseHookContext,
  ResponseHookResult,
  ToolCallHookContext,
  ToolCallHookResult,
  ToolCallResultContext,
  ToolExecutionContext,
  ToolExecutionResult,
} from './types';

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

  /**
   * Initialize the plugin manager: load registry and activate enabled plugins.
   */
  async initialize(): Promise<void> {
    await this.loadRegistry();

    // Activate all plugins that were previously active
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

  /**
   * Shut down all active plugins gracefully.
   */
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
   * Install a plugin from npm.
   */
  async installFromNpm(
    packageName: string,
    version?: string,
  ): Promise<{ success: boolean; pluginId?: string; error?: string }> {
    const result = await this.loader.installFromNpm(packageName, version);
    if (!result.success || !result.entry) {
      return { success: false, error: result.error };
    }

    this.registry.set(result.entry.id, result.entry);
    await this.saveRegistry();

    return { success: true, pluginId: result.entry.id };
  }

  /**
   * Install a plugin from a GitHub repository.
   */
  async installFromGithub(
    repo: string,
    ref?: string,
  ): Promise<{ success: boolean; pluginId?: string; error?: string }> {
    const result = await this.loader.installFromGithub(repo, ref);
    if (!result.success || !result.entry) {
      return { success: false, error: result.error };
    }

    this.registry.set(result.entry.id, result.entry);
    await this.saveRegistry();

    return { success: true, pluginId: result.entry.id };
  }

  /**
   * Install a plugin from a local directory.
   */
  async installFromLocal(
    dirPath: string,
  ): Promise<{ success: boolean; pluginId?: string; error?: string }> {
    const result = await this.loader.installFromLocal(dirPath);
    if (!result.success || !result.entry) {
      return { success: false, error: result.error };
    }

    this.registry.set(result.entry.id, result.entry);
    await this.saveRegistry();

    return { success: true, pluginId: result.entry.id };
  }

  /**
   * Uninstall a plugin completely.
   */
  async uninstall(pluginId: string): Promise<{ success: boolean; error?: string }> {
    // Deactivate first if active
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
    }

    return result;
  }

  // ─── Activation / Deactivation ──────────────────────────────────────────

  /**
   * Activate a plugin (load and call activate()).
   */
  async activatePlugin(pluginId: string): Promise<{ success: boolean; error?: string }> {
    if (this.activePlugins.has(pluginId)) {
      return { success: true }; // Already active
    }

    const entry = this.registry.get(pluginId);
    if (!entry) {
      return { success: false, error: `Plugin "${pluginId}" not found` };
    }

    try {
      // Load the plugin
      const loadResult = await this.loader.loadPlugin(entry);
      if (!loadResult.success || !loadResult.plugin) {
        return { success: false, error: loadResult.error };
      }

      const plugin = loadResult.plugin;

      // Create plugin context
      const context = this.createPluginContext(entry);

      // Activate
      await plugin.activate(context);

      // Initialize the adapter for the current provider
      const adapter = plugin.adapters?.[this.currentProvider];
      if (adapter?.initialize) {
        await adapter.initialize({
          provider: this.currentProvider,
          settings: entry.settings,
          workspace: this.config.workspace,
        });
      }

      // Store as active
      this.activePlugins.set(pluginId, { entry, instance: plugin, context });

      // Update registry state
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

  /**
   * Deactivate a plugin (call deactivate() and unload).
   */
  async deactivatePlugin(pluginId: string): Promise<{ success: boolean; error?: string }> {
    const active = this.activePlugins.get(pluginId);
    if (!active) {
      return { success: true }; // Not active
    }

    try {
      // Dispose the current adapter
      const adapter = active.instance.adapters?.[this.currentProvider];
      if (adapter?.dispose) {
        await adapter.dispose();
      }

      // Call plugin deactivate
      if (active.instance.deactivate) {
        await active.instance.deactivate();
      }

      this.activePlugins.delete(pluginId);

      // Update registry
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

  // ─── Provider Management ────────────────────────────────────────────────

  /**
   * Switch the active AI provider. Re-initializes all plugin adapters.
   */
  async setActiveProvider(provider: AIProvider): Promise<void> {
    const previousProvider = this.currentProvider;
    this.currentProvider = provider;

    for (const [, active] of this.activePlugins) {
      // Dispose old adapter
      const oldAdapter = active.instance.adapters?.[previousProvider];
      if (oldAdapter?.dispose) {
        await oldAdapter.dispose();
      }

      // Initialize new adapter
      const newAdapter = active.instance.adapters?.[provider];
      if (newAdapter?.initialize) {
        await newAdapter.initialize({
          provider,
          settings: active.entry.settings,
          workspace: this.config.workspace,
        });
      }
    }

    // Notify plugins
    this.emit('provider:changed', { provider, previousProvider });
  }

  /**
   * Get the currently active AI provider.
   */
  getActiveProvider(): AIProvider {
    return this.currentProvider;
  }

  // ─── Hook Pipeline ──────────────────────────────────────────────────────

  /**
   * Run onBeforeMessage hooks across all active plugins.
   * Plugins run in priority order (lower = earlier).
   */
  async runBeforeMessageHooks(ctx: MessageHookContext): Promise<MessageHookResult> {
    let currentMessage = ctx.message;

    for (const active of this.getSortedActivePlugins()) {
      const hook = active.instance.hooks?.onBeforeMessage;
      if (!hook) continue;

      try {
        const result = await hook({ ...ctx, message: currentMessage });
        if (result.cancel) {
          return { message: currentMessage, cancel: true };
        }
        currentMessage = result.message;
      } catch (err) {
        console.error(`[PluginManager] Hook error in "${active.entry.id}":`, err);
      }
    }

    return { message: currentMessage };
  }

  /**
   * Run onAfterResponse hooks across all active plugins (reverse priority order).
   */
  async runAfterResponseHooks(ctx: ResponseHookContext): Promise<ResponseHookResult> {
    let currentResponse = ctx.response;

    // Run in reverse priority order for response processing
    const plugins = this.getSortedActivePlugins().reverse();

    for (const active of plugins) {
      const hook = active.instance.hooks?.onAfterResponse;
      if (!hook) continue;

      try {
        const result = await hook({ ...ctx, response: currentResponse });
        currentResponse = result.response;
      } catch (err) {
        console.error(`[PluginManager] Hook error in "${active.entry.id}":`, err);
      }
    }

    return { response: currentResponse };
  }

  /**
   * Run onBeforeToolCall hooks across all active plugins.
   */
  async runBeforeToolCallHooks(ctx: ToolCallHookContext): Promise<ToolCallHookResult> {
    let currentParams = ctx.params;

    for (const active of this.getSortedActivePlugins()) {
      const hook = active.instance.hooks?.onBeforeToolCall;
      if (!hook) continue;

      try {
        const result = await hook({ ...ctx, params: currentParams });
        if (result.cancel) {
          return { params: currentParams, cancel: true, cancelReason: result.cancelReason };
        }
        currentParams = result.params;
      } catch (err) {
        console.error(`[PluginManager] Hook error in "${active.entry.id}":`, err);
      }
    }

    return { params: currentParams };
  }

  /**
   * Run onAfterToolCall hooks (fire-and-forget, no pipeline).
   */
  async runAfterToolCallHooks(ctx: ToolCallResultContext): Promise<void> {
    for (const active of this.getSortedActivePlugins()) {
      const hook = active.instance.hooks?.onAfterToolCall;
      if (!hook) continue;

      try {
        await hook(ctx);
      } catch (err) {
        console.error(`[PluginManager] Hook error in "${active.entry.id}":`, err);
      }
    }
  }

  /**
   * Notify all plugins that a conversation was created.
   */
  async notifyConversationCreated(ctx: ConversationContext): Promise<void> {
    for (const active of this.getSortedActivePlugins()) {
      const hook = active.instance.hooks?.onConversationCreated;
      if (!hook) continue;

      try {
        await hook(ctx);
      } catch (err) {
        console.error(`[PluginManager] Hook error in "${active.entry.id}":`, err);
      }
    }
  }

  /**
   * Notify all plugins that a conversation ended.
   */
  async notifyConversationEnded(ctx: ConversationContext): Promise<void> {
    for (const active of this.getSortedActivePlugins()) {
      const hook = active.instance.hooks?.onConversationEnded;
      if (!hook) continue;

      try {
        await hook(ctx);
      } catch (err) {
        console.error(`[PluginManager] Hook error in "${active.entry.id}":`, err);
      }
    }
  }

  // ─── Adapter Pipeline ──────────────────────────────────────────────────

  /**
   * Transform an outgoing message through all active plugin adapters.
   */
  async transformRequest(message: AdapterMessage): Promise<AdapterMessage> {
    let current = message;

    for (const active of this.getSortedActivePlugins()) {
      const adapter = active.instance.adapters?.[this.currentProvider];
      if (!adapter?.transformRequest) continue;

      try {
        current = await adapter.transformRequest(current);
      } catch (err) {
        console.error(`[PluginManager] Adapter error in "${active.entry.id}":`, err);
      }
    }

    return current;
  }

  /**
   * Transform an incoming response through all active plugin adapters.
   */
  async transformResponse(message: AdapterMessage): Promise<AdapterMessage> {
    let current = message;

    const plugins = this.getSortedActivePlugins().reverse();

    for (const active of plugins) {
      const adapter = active.instance.adapters?.[this.currentProvider];
      if (!adapter?.transformResponse) continue;

      try {
        current = await adapter.transformResponse(current);
      } catch (err) {
        console.error(`[PluginManager] Adapter error in "${active.entry.id}":`, err);
      }
    }

    return current;
  }

  /**
   * Collect system prompts from all active plugin adapters.
   */
  async collectSystemPrompts(): Promise<string[]> {
    const prompts: string[] = [];

    for (const active of this.getSortedActivePlugins()) {
      const adapter = active.instance.adapters?.[this.currentProvider];
      if (!adapter?.getSystemPrompt) continue;

      try {
        const prompt = await adapter.getSystemPrompt();
        if (prompt) prompts.push(prompt);
      } catch (err) {
        console.error(`[PluginManager] Adapter error in "${active.entry.id}":`, err);
      }
    }

    return prompts;
  }

  /**
   * Collect tool definitions from all active plugin adapters.
   */
  async collectProviderTools(): Promise<ProviderToolDefinition[]> {
    const tools: ProviderToolDefinition[] = [];

    for (const active of this.getSortedActivePlugins()) {
      const adapter = active.instance.adapters?.[this.currentProvider];
      if (!adapter?.getTools) continue;

      try {
        const adapterTools = await adapter.getTools();
        // Namespace tool names to avoid collisions
        for (const tool of adapterTools) {
          tools.push({
            ...tool,
            name: `plugin:${active.entry.id}:${tool.name}`,
          });
        }
      } catch (err) {
        console.error(`[PluginManager] Adapter error in "${active.entry.id}":`, err);
      }
    }

    return tools;
  }

  // ─── Tool Execution ─────────────────────────────────────────────────────

  /**
   * Execute a plugin-provided tool.
   *
   * @param namespacedName - Tool name in format "plugin:<pluginId>:<toolName>"
   * @param params - Tool parameters
   * @param conversationId - ID of the current conversation
   */
  async executeTool(
    namespacedName: string,
    params: Record<string, unknown>,
    conversationId: string,
  ): Promise<ToolExecutionResult> {
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

    // Find the tool in the plugin
    const tool = active.instance.tools?.find((t) => t.name === toolName);
    if (!tool) {
      return { success: false, error: `Tool "${toolName}" not found in plugin "${pluginId}"` };
    }

    // Check if plugin has permission for the tool's requirements
    const context: ToolExecutionContext = {
      workspace: this.config.workspace,
      provider: this.currentProvider,
      conversationId,
      settings: active.entry.settings,
      logger: this.createPluginLogger(pluginId),
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

  /**
   * Check if a tool name belongs to a plugin.
   */
  isPluginTool(toolName: string): boolean {
    return toolName.startsWith('plugin:');
  }

  // ─── Skills ─────────────────────────────────────────────────────────────

  /**
   * Collect all skills from active plugins.
   */
  collectPluginSkills(): PluginSkill[] {
    const skills: PluginSkill[] = [];

    for (const [, active] of this.activePlugins) {
      if (active.instance.skills) {
        skills.push(...active.instance.skills);
      }
    }

    return skills;
  }

  // ─── Settings ───────────────────────────────────────────────────────────

  /**
   * Update settings for a plugin.
   */
  async updatePluginSettings(
    pluginId: string,
    settings: Record<string, unknown>,
  ): Promise<{ success: boolean; error?: string }> {
    const entry = this.registry.get(pluginId);
    if (!entry) {
      return { success: false, error: `Plugin "${pluginId}" not found` };
    }

    entry.settings = { ...entry.settings, ...settings };
    entry.updatedAt = new Date().toISOString();
    await this.saveRegistry();

    // Notify the plugin if it's active
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

  /**
   * Grant permissions to a plugin.
   */
  async grantPermissions(
    pluginId: string,
    permissions: PluginPermission[],
  ): Promise<{ success: boolean; error?: string }> {
    const entry = this.registry.get(pluginId);
    if (!entry) {
      return { success: false, error: `Plugin "${pluginId}" not found` };
    }

    const uniquePermissions = [...new Set([...entry.grantedPermissions, ...permissions])];
    entry.grantedPermissions = uniquePermissions;
    entry.updatedAt = new Date().toISOString();
    await this.saveRegistry();

    return { success: true };
  }

  /**
   * Revoke permissions from a plugin.
   */
  async revokePermissions(
    pluginId: string,
    permissions: PluginPermission[],
  ): Promise<{ success: boolean; error?: string }> {
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

  /** Get all registered plugins */
  getPlugins(): PluginRegistryEntry[] {
    return [...this.registry.values()];
  }

  /** Get a specific plugin entry */
  getPlugin(pluginId: string): PluginRegistryEntry | undefined {
    return this.registry.get(pluginId);
  }

  /** Get all currently active plugins */
  getActivePlugins(): PluginRegistryEntry[] {
    return [...this.activePlugins.values()].map((a) => a.entry);
  }

  /** Check if a plugin is active */
  isPluginActive(pluginId: string): boolean {
    return this.activePlugins.has(pluginId);
  }

  /** Check for updates on all npm-sourced plugins */
  async checkForUpdates(): Promise<
    Array<{ pluginId: string; currentVersion: string; latestVersion: string }>
  > {
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
    return [...this.activePlugins.values()].sort(
      (a, b) => (a.instance.priority ?? 100) - (b.instance.priority ?? 100),
    );
  }

  private createPluginContext(entry: PluginRegistryEntry): PluginContext {
    const settingsCallbacks: Array<(settings: Record<string, unknown>) => void> = [];
    const providerCallbacks: Array<(provider: AIProvider) => void> = [];
    const logger = this.createPluginLogger(entry.id);
    const grantedPerms = new Set(entry.grantedPermissions);

    const context: PluginContext = {
      pluginId: entry.id,
      settings: { ...entry.settings },
      workspace: this.config.workspace,
      pluginDir: entry.installPath,
      logger,
      activeProvider: this.currentProvider,

      onSettingsChange(callback) {
        settingsCallbacks.push(callback);
        return () => {
          const idx = settingsCallbacks.indexOf(callback);
          if (idx !== -1) settingsCallbacks.splice(idx, 1);
        };
      },

      onProviderChange(callback) {
        providerCallbacks.push(callback);
        return () => {
          const idx = providerCallbacks.indexOf(callback);
          if (idx !== -1) providerCallbacks.splice(idx, 1);
        };
      },
    };

    // Conditionally attach capability methods based on granted permissions
    if (grantedPerms.has('fs:read')) {
      context.readFile = async (filePath: string) => {
        const resolved = this.resolvePluginPath(filePath, entry);
        return fs.promises.readFile(resolved, 'utf-8');
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
        return globalThis.fetch(url, options);
      };
    }

    if (grantedPerms.has('shell:execute')) {
      const { exec: execCb } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(execCb);

      context.exec = async (
        command: string,
        options?: { cwd?: string; timeout?: number },
      ) => {
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
    // If the path is absolute, check it's within the workspace (unless fs:global is granted)
    if (path.isAbsolute(filePath)) {
      if (
        !entry.grantedPermissions.includes('fs:global') &&
        !filePath.startsWith(this.config.workspace)
      ) {
        throw new Error(
          `Plugin "${entry.id}" cannot access files outside workspace without fs:global permission`,
        );
      }
      return filePath;
    }

    // Relative paths resolve against workspace
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
      await fs.promises.writeFile(
        this.config.registryPath,
        JSON.stringify(entries, null, 2),
        'utf-8',
      );
    } catch (err) {
      console.error('[PluginManager] Failed to save registry:', err);
    }
  }
}
