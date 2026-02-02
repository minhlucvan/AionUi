/**
 * AionUi Plugin System - Core Type Definitions
 *
 * A plugin works like the current agents in AionUi — it bundles system prompts,
 * skills (SKILL.md), dedicated tools, and MCP server configs. Installing a plugin
 * adds new capabilities that work across all AI providers (Claude Code, Gemini, Codex).
 *
 * The plugin system mirrors how AcpBackendConfig + Skills + MCP already work:
 *   - System prompts → injected via presetRules / context (first-message prefix)
 *   - Skills        → SKILL.md files loaded by AcpSkillManager / loadSkillsContent
 *   - Tools         → MCP servers or function-calling tool definitions
 *
 * A plugin is the installable, distributable wrapper around those same primitives.
 */

import type { IMcpServerTransport, IMcpTool } from '@common/storage';

// ─── AI Provider Types ───────────────────────────────────────────────────────

/** Agent backends the plugin's capabilities work with */
export type AIProvider = 'claude' | 'gemini' | 'codex' | 'acp' | (string & {});

export const AI_PROVIDERS = ['claude', 'gemini', 'codex', 'acp'] as const;

// ─── Plugin Identity ─────────────────────────────────────────────────────────

export type PluginSource = 'npm' | 'github' | 'local';

export type PluginState = 'installed' | 'active' | 'inactive' | 'error';

export type PluginCategory = 'productivity' | 'ai-tools' | 'code-analysis' | 'document' | 'integration' | 'other';

// ─── Capabilities: Skills ────────────────────────────────────────────────────

/**
 * A skill bundled with the plugin.
 *
 * This is the same format as `/skills/{name}/SKILL.md` — YAML frontmatter
 * (name + description) plus markdown body. The plugin either:
 *   1. Ships a `skills/` directory with SKILL.md files (file-based), or
 *   2. Declares skills inline in the plugin code (code-based).
 *
 * At runtime, plugin skills merge into the same pool as built-in skills.
 * The agent sees them in [Available Skills] alongside docx, pdf, etc.
 */
export interface PluginSkillDefinition {
  /** Unique skill name (must not collide with built-in skills) */
  name: string;

  /** Short description shown in the skills index (~100 words max) */
  description: string;

  /**
   * Full SKILL.md body content — the instructions the agent reads.
   * If undefined, the system loads from the `skills/{name}/SKILL.md` file
   * inside the plugin directory instead.
   */
  body?: string;

  /**
   * Paths to bundled resource files relative to the plugin root.
   * These are the scripts/, references/, assets/ that the skill
   * instructions refer to (same as the built-in skill structure).
   */
  resources?: string[];
}

// ─── Capabilities: System Prompts ────────────────────────────────────────────

/**
 * System prompt / context rules the plugin injects.
 *
 * This works exactly like `context` in AcpBackendConfig or `presetRules`
 * in GeminiAgent — the text is prefixed to the first message as:
 *   [Assistant Rules - You MUST follow these instructions]
 *   {plugin context here}
 */
export interface PluginSystemPrompt {
  /**
   * The instruction text to inject. This is the "context" / "presetRules"
   * that tells the agent how to use the plugin's capabilities.
   *
   * Example: "You have access to a web search tool. When the user asks
   * about current events, use the web_search tool to find information."
   */
  content: string;

  /**
   * Priority for ordering when multiple plugins inject prompts.
   * Lower = earlier in the prompt. Default = 100.
   */
  priority?: number;

  /**
   * If set, only inject this prompt when the active provider matches.
   * Omit to inject for all providers.
   */
  providers?: AIProvider[];
}

// ─── Capabilities: Tools ─────────────────────────────────────────────────────

/**
 * A tool the plugin provides to the agent.
 *
 * Tools are registered as function-calling definitions that the agent
 * can invoke. The tool handler runs in the main process and returns
 * results back to the agent.
 *
 * Works like Gemini's coreTools or ACP's tool_call but defined in a
 * plugin package instead of baked into the host.
 */
export interface PluginToolDefinition {
  /** Tool name (namespaced at runtime as `plugin:{pluginId}:{name}`) */
  name: string;

  /** Description shown to the AI model so it knows when to use the tool */
  description: string;

  /** JSON Schema for the tool's input parameters */
  inputSchema: Record<string, unknown>;

  /**
   * The function that executes when the agent calls this tool.
   * Receives the parsed parameters and a context object.
   */
  handler: (params: Record<string, unknown>, context: ToolExecutionContext) => Promise<ToolResult>;

  /**
   * If set, this tool is only available when the active provider matches.
   * Omit to make available for all providers.
   */
  providers?: AIProvider[];
}

/** Context provided to tool handlers at execution time */
export interface ToolExecutionContext {
  workspace: string;
  provider: AIProvider;
  conversationId: string;
  settings: Record<string, unknown>;
  logger: PluginLogger;
}

/** Result from a tool execution */
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  /** Optional UI rendering hint */
  display?: {
    type: 'text' | 'markdown' | 'json' | 'image' | 'diff';
    content: string;
  };
}

// ─── Capabilities: MCP Servers ───────────────────────────────────────────────

/**
 * An MCP server the plugin provides.
 *
 * This is the same shape as IMcpServer from the host's MCP management.
 * When a plugin is activated, its MCP servers are registered alongside
 * user-configured MCP servers in the MCP management system.
 *
 * The agent can then use MCP tools provided by these servers just like
 * any manually-added MCP server.
 */
export interface PluginMcpServer {
  /** Server name (shown in MCP management UI) */
  name: string;

  /** Human-readable description */
  description?: string;

  /** Transport configuration (stdio, sse, http, streamable_http) */
  transport: IMcpServerTransport;

  /** Pre-declared tools (optional — discovered at runtime if omitted) */
  tools?: IMcpTool[];

  /** Environment variables the server needs */
  env?: Record<string, string>;

  /**
   * If true, the MCP server binary is bundled inside the plugin package
   * and the command path is relative to the plugin root.
   */
  bundled?: boolean;
}

// ─── Plugin Settings ─────────────────────────────────────────────────────────

/** Settings field definition for auto-generated UI */
export interface PluginSettingDefinition {
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect';
  label: string;
  description?: string;
  default?: unknown;
  secret?: boolean;
  required?: boolean;
  options?: Array<{ label: string; value: string | number }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

// ─── Plugin Manifest ─────────────────────────────────────────────────────────

/**
 * The "aionui" field in a plugin's package.json.
 *
 * Declares what capabilities the plugin provides so the host can
 * register everything without loading the plugin code first.
 */
export interface PluginManifest {
  /** Manifest schema version (e.g., "1.0") */
  pluginVersion: string;

  /** Human-readable display name */
  displayName: string;

  /** Short description */
  description: string;

  /** Path to plugin icon (relative to package root) */
  icon?: string;

  /** Category for UI organization */
  category?: PluginCategory;

  /** Minimum AionUi host version required */
  minHostVersion?: string;

  /**
   * Skills provided by this plugin.
   *
   * Can be either:
   *   - A path to a skills/ directory containing SKILL.md files (string)
   *   - An array of inline skill declarations
   *
   * If a string path, the directory is scanned for {name}/SKILL.md files
   * using the same format as built-in skills.
   */
  skills?: string | Array<{ name: string; description: string }>;

  /**
   * MCP servers provided by this plugin.
   * Declared here so the host can show them in the MCP management UI
   * before the plugin code is loaded.
   */
  mcpServers?: Array<{
    name: string;
    description?: string;
    transport: string; // 'stdio' | 'sse' | 'http' | 'streamable_http'
  }>;

  /**
   * Tool names this plugin provides (for display in UI).
   * Actual tool definitions come from the plugin code.
   */
  tools?: Array<{ name: string; description: string }>;

  /**
   * Agents this plugin exposes (for display in UI before loading plugin code).
   * Actual agent definitions come from the plugin's `agents[]` property.
   */
  agents?: Array<{
    id: string;
    name: string;
    description: string;
    avatar?: string;
  }>;

  /** Permissions the plugin requires */
  permissions?: PluginPermission[];

  /** Settings schema for auto-generated settings UI */
  settings?: Record<string, PluginSettingDefinition>;
}

/** Full package.json structure with the aionui manifest */
export interface PluginPackageJson {
  name: string;
  version: string;
  description?: string;
  main?: string;
  types?: string;
  aionui: PluginManifest;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

// ─── Plugin Permissions ──────────────────────────────────────────────────────

export type PluginPermission = 'fs:read' | 'fs:write' | 'fs:global' | 'network:fetch' | 'shell:execute' | 'ui:panel' | 'ui:overlay' | 'clipboard' | 'mcp:server';

// ─── Plugin Registry Entry ───────────────────────────────────────────────────

/** Persisted metadata about an installed plugin */
export interface PluginRegistryEntry {
  id: string;
  version: string;
  source: PluginSource;
  sourceRef: string;
  installPath: string;
  manifest: PluginManifest;
  state: PluginState;
  grantedPermissions: PluginPermission[];
  settings: Record<string, unknown>;
  installedAt: string;
  updatedAt: string;
  error?: string;
}

// ─── Plugin Logger ───────────────────────────────────────────────────────────

export interface PluginLogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

// ─── Plugin Context ──────────────────────────────────────────────────────────

/**
 * Context given to a plugin at activation time.
 * This is the plugin's handle for interacting with the host.
 */
export interface PluginContext<TSettings = Record<string, unknown>> {
  /** Plugin's own ID */
  pluginId: string;

  /** Current plugin settings */
  settings: TSettings;

  /** Workspace root path */
  workspace: string;

  /** Absolute path to the plugin's install directory */
  pluginDir: string;

  /** Logger scoped to this plugin */
  logger: PluginLogger;

  /** Currently active AI provider */
  activeProvider: AIProvider;

  /** Path to the host's skills directory (for reference) */
  skillsDir: string;

  /** Subscribe to settings changes */
  onSettingsChange(callback: (settings: TSettings) => void): () => void;

  /** Subscribe to provider changes */
  onProviderChange(callback: (provider: AIProvider) => void): () => void;

  /** Read a file from the workspace (requires fs:read) */
  readFile?(path: string): Promise<string>;

  /** Write a file to the workspace (requires fs:write) */
  writeFile?(path: string, content: string): Promise<void>;

  /** Make an HTTP request (requires network:fetch) */
  fetch?(url: string, options?: RequestInit): Promise<Response>;

  /** Execute a shell command (requires shell:execute) */
  exec?(
    command: string,
    options?: { cwd?: string; timeout?: number }
  ): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }>;
}

// ─── Plugin Lifecycle Hooks ──────────────────────────────────────────────────

/**
 * Optional hooks for deeper integration.
 * Most plugins won't need these — skills + tools + MCP are enough.
 * Hooks are for advanced use cases like message filtering or analytics.
 */
export interface PluginHooks {
  /** Runs before the first message is sent (can modify the message) */
  onBeforeMessage?(ctx: { message: string; conversationId: string; provider: AIProvider }): Promise<{ message: string; cancel?: boolean }> | { message: string; cancel?: boolean };

  /** Runs after a response is received */
  onAfterResponse?(ctx: { response: string; conversationId: string; provider: AIProvider }): Promise<{ response: string }> | { response: string };

  /** When plugin settings change */
  onSettingsChanged?(settings: Record<string, unknown>): Promise<void> | void;
}

// ─── Plugin Agents ──────────────────────────────────────────────────────────

/**
 * A named agent that a plugin exposes.
 *
 * Each agent bundles a subset of the plugin's capabilities (system prompt,
 * skills, tools) into a selectable assistant. When the user picks this agent
 * in the assistant management UI, the host:
 *   1. Injects the agent's systemPrompt as the preset context
 *   2. Enables the agent's skills (loaded from the plugin)
 *   3. Makes the agent's tools available for function calling
 *
 * This maps directly to AcpBackendConfig (the host's assistant type).
 * Multiple agents can be defined per plugin — for example, a "Document"
 * plugin could expose both a "PDF Expert" and a "DOCX Editor" agent.
 *
 * @example
 * ```typescript
 * agents: [
 *   {
 *     id: 'pdf-tools',
 *     name: 'PDF Tools',
 *     description: 'Split, merge, convert, and fill PDF forms.',
 *     avatar: '📄',
 *     systemPrompt: 'You have access to PDF processing tools...',
 *     skills: ['pdf'],
 *     tools: ['pdf_split', 'pdf_merge', 'pdf_to_images'],
 *   },
 * ]
 * ```
 */
export interface PluginAgent {
  /** Agent ID, unique within the plugin. Namespaced at runtime as `plugin-{pluginId}-{agentId}` */
  id: string;

  /** Display name shown in the assistant list */
  name: string;

  /** Localized names */
  nameI18n?: Record<string, string>;

  /** Short description shown in the assistant list */
  description: string;

  /** Localized descriptions */
  descriptionI18n?: Record<string, string>;

  /** Avatar — emoji string or image path */
  avatar?: string;

  /**
   * The system prompt / context for this agent.
   * Injected as [Assistant Rules] in the first message when this agent is selected.
   * This is stored in AcpBackendConfig.context.
   *
   * If omitted, the plugin's global systemPrompts are joined and used instead.
   */
  systemPrompt?: string;

  /** Localized system prompts */
  systemPromptI18n?: Record<string, string>;

  /**
   * Skill names this agent uses (references PluginSkillDefinition.name).
   * These become the assistant's enabledSkills list.
   * If omitted, all plugin skills are enabled.
   */
  skills?: string[];

  /**
   * Tool names this agent uses (references PluginToolDefinition.name).
   * Only these tools are registered when this agent is active.
   * If omitted, all plugin tools are available.
   */
  tools?: string[];

  /**
   * Which AI provider this agent targets.
   * Determines which conversation type to create (Gemini, Claude ACP, Codex, etc).
   * Defaults to 'gemini'.
   */
  presetAgentType?: 'gemini' | 'claude' | 'codex' | 'opencode';

  /** Example prompts shown in the UI */
  prompts?: string[];

  /** Localized example prompts */
  promptsI18n?: Record<string, string[]>;

  /** Whether this agent is enabled by default. Defaults to false. */
  enabledByDefault?: boolean;
}

// ─── Main Plugin Interface ───────────────────────────────────────────────────

/**
 * AionPlugin — The main interface every plugin implements.
 *
 * A plugin is an installable capability package (npm or GitHub) that works
 * like a built-in agent feature: it has system prompts, skills, tools, and
 * MCP servers. When installed and activated, these capabilities become
 * available to whichever AI agent the user is talking to.
 *
 * @example Minimal plugin — adds a skill only
 * ```typescript
 * const plugin: AionPlugin = {
 *   id: 'aionui-plugin-diagram',
 *   version: '1.0.0',
 *   activate(ctx) {
 *     ctx.logger.info('Diagram plugin ready');
 *   },
 *   skills: [
 *     { name: 'mermaid', description: 'Create Mermaid diagrams from text descriptions' }
 *   ],
 * };
 * ```
 *
 * @example Full plugin — system prompt + tools + MCP + skills
 * ```typescript
 * const plugin: AionPlugin = {
 *   id: 'aionui-plugin-github',
 *   version: '2.0.0',
 *   activate(ctx) { ... },
 *
 *   // System prompts injected into the agent context
 *   systemPrompts: [
 *     { content: 'You can manage GitHub repos. Use the github_* tools...' }
 *   ],
 *
 *   // Skills (SKILL.md format) the agent can load on demand
 *   skills: [
 *     { name: 'github-pr', description: 'Create and review pull requests' }
 *   ],
 *
 *   // Tools the agent can call
 *   tools: [
 *     { name: 'github_create_pr', description: '...', inputSchema: {...}, handler: ... }
 *   ],
 *
 *   // MCP servers that provide additional tools
 *   mcpServers: [
 *     { name: 'github-mcp', transport: { type: 'stdio', command: 'github-mcp-server' } }
 *   ],
 * };
 * ```
 */
export interface AionPlugin<TSettings = Record<string, unknown>> {
  /** Unique plugin identifier (should match npm package name) */
  readonly id: string;

  /** Semantic version string */
  readonly version: string;

  /** Called when the plugin is activated by the host */
  activate(context: PluginContext<TSettings>): Promise<void> | void;

  /** Called when the plugin is deactivated (shutdown/uninstall) */
  deactivate?(): Promise<void> | void;

  // ── Capability: System Prompts ────────────────────────────────────────────

  /**
   * System prompts / context rules this plugin provides.
   * These get injected into the first message as [Assistant Rules],
   * just like presetRules or AcpBackendConfig.context.
   */
  systemPrompts?: PluginSystemPrompt[];

  // ── Capability: Skills ────────────────────────────────────────────────────

  /**
   * Skills this plugin provides.
   *
   * Can be:
   *   - PluginSkillDefinition[] — inline skill definitions
   *   - A plugin that ships a skills/ directory with SKILL.md files
   *     (declared in manifest, auto-discovered by the host)
   *
   * Plugin skills merge into the built-in skill pool. The agent sees them
   * in [Available Skills] alongside docx, pdf, pptx, etc.
   */
  skills?: PluginSkillDefinition[];

  // ── Capability: Tools ─────────────────────────────────────────────────────

  /**
   * Tools this plugin provides to the agent.
   * Registered as function-calling tools that the agent can invoke.
   * Tool names are namespaced at runtime to avoid collisions.
   */
  tools?: PluginToolDefinition[];

  // ── Capability: MCP Servers ───────────────────────────────────────────────

  /**
   * MCP servers this plugin provides.
   * Registered alongside user-configured MCP servers.
   * The agent can use tools from these servers like any other MCP tool.
   */
  mcpServers?: PluginMcpServer[];

  // ── Capability: Agents ────────────────────────────────────────────────────

  /**
   * Named agents this plugin exposes.
   *
   * Each agent is a pre-configured assistant that bundles a subset of the
   * plugin's system prompt, skills, and tools into a selectable entity.
   * Agents appear in the assistant management UI alongside built-in presets.
   *
   * When a plugin defines agents, the plugin-level systemPrompts[] are NOT
   * injected globally — instead, each agent carries its own systemPrompt
   * that is used as the assistant's context when selected.
   */
  agents?: PluginAgent[];

  // ── Optional: Hooks ───────────────────────────────────────────────────────

  /**
   * Advanced lifecycle hooks. Most plugins don't need these —
   * system prompts + skills + tools + MCP cover most use cases.
   */
  hooks?: PluginHooks;

  /** Priority for ordering (lower = earlier). Default = 100. */
  priority?: number;
}
