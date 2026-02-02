/**
 * AionUi Plugin System - Core Type Definitions
 *
 * These types define the contract between the AionUi host and plugins.
 * Plugins implement these interfaces to integrate with any supported AI provider.
 */

// ─── AI Provider Types ───────────────────────────────────────────────────────

/** Supported AI provider identifiers */
export type AIProvider = 'claude' | 'gemini' | 'codex' | 'acp' | (string & {});

/** All known built-in providers */
export const AI_PROVIDERS = ['claude', 'gemini', 'codex', 'acp'] as const;

// ─── Plugin Identity ─────────────────────────────────────────────────────────

/** Where the plugin was installed from */
export type PluginSource = 'npm' | 'github' | 'local';

/** Current runtime state of a plugin */
export type PluginState = 'installed' | 'active' | 'inactive' | 'error';

/** Plugin category for organization */
export type PluginCategory =
  | 'productivity'
  | 'ai-tools'
  | 'code-analysis'
  | 'document'
  | 'integration'
  | 'theme'
  | 'other';

/** Permissions a plugin can request */
export type PluginPermission =
  | 'fs:read'
  | 'fs:write'
  | 'fs:global'
  | 'network:fetch'
  | 'shell:execute'
  | 'ui:panel'
  | 'ui:overlay'
  | 'clipboard'
  | 'mcp:server';

// ─── Plugin Manifest ─────────────────────────────────────────────────────────

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

/** The "aionui" field in a plugin's package.json */
export interface PluginManifest {
  /** Plugin manifest schema version */
  pluginVersion: string;

  /** Human-readable display name */
  displayName: string;

  /** Short description */
  description: string;

  /** Path to plugin icon (relative to package root) */
  icon?: string;

  /** Plugin category */
  category?: PluginCategory;

  /** Declared capabilities */
  capabilities?: Array<'tools' | 'skills' | 'ui' | 'hooks' | 'adapters'>;

  /** Minimum AionUi version required */
  minHostVersion?: string;

  /** Adapter entry points per AI provider (relative paths to compiled JS) */
  adapters?: Partial<Record<AIProvider, string>>;

  /** Permissions the plugin requires */
  permissions?: PluginPermission[];

  /** Settings schema */
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

// ─── Plugin Registry Entry ───────────────────────────────────────────────────

/** Persisted metadata about an installed plugin */
export interface PluginRegistryEntry {
  /** Unique ID (typically the npm package name) */
  id: string;

  /** Installed version */
  version: string;

  /** Where it was installed from */
  source: PluginSource;

  /** GitHub repo or npm package reference */
  sourceRef: string;

  /** Absolute path to the installed plugin directory */
  installPath: string;

  /** Resolved manifest from package.json */
  manifest: PluginManifest;

  /** Current state */
  state: PluginState;

  /** User-granted permissions */
  grantedPermissions: PluginPermission[];

  /** User-configured settings values */
  settings: Record<string, unknown>;

  /** ISO timestamp of installation */
  installedAt: string;

  /** ISO timestamp of last update */
  updatedAt: string;

  /** Error message if state is 'error' */
  error?: string;
}

// ─── Adapter Types ───────────────────────────────────────────────────────────

/** A message flowing through the adapter pipeline */
export interface AdapterMessage {
  /** The text or structured content */
  content: string | Array<{ type: string; text?: string; data?: string }>;

  /** Role of the message sender */
  role: 'user' | 'assistant' | 'system' | 'tool';

  /** Associated message ID */
  msgId?: string;

  /** Conversation context ID */
  conversationId?: string;

  /** Attached files */
  files?: string[];

  /** Arbitrary metadata plugins can attach */
  metadata?: Record<string, unknown>;
}

/** Configuration passed to adapter.initialize() */
export interface ProviderAdapterConfig {
  /** Which AI provider this adapter is running against */
  provider: AIProvider;

  /** Plugin settings values */
  settings: Record<string, unknown>;

  /** Workspace root path */
  workspace: string;
}

/** Tool definition that an adapter provides to a specific AI provider */
export interface ProviderToolDefinition {
  /** Tool name (will be namespaced as plugin:<pluginId>:<name>) */
  name: string;

  /** Description for the AI model */
  description: string;

  /** JSON Schema for the tool parameters */
  parameters: Record<string, unknown>;

  /** Handler function */
  handler: (params: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Provider Adapter Interface
 *
 * Each plugin can supply an adapter per AI provider. The adapter transforms
 * messages, injects tools, and customizes behavior for that specific provider.
 *
 * All methods are optional — implement only what your plugin needs.
 */
export interface ProviderAdapter {
  /** Transform an outgoing user message before it reaches the agent */
  transformRequest?(message: AdapterMessage): AdapterMessage | Promise<AdapterMessage>;

  /** Transform an incoming agent response before it reaches the UI */
  transformResponse?(message: AdapterMessage): AdapterMessage | Promise<AdapterMessage>;

  /** Return a system prompt fragment to inject */
  getSystemPrompt?(): string | Promise<string>;

  /** Return tool definitions for this provider */
  getTools?(): ProviderToolDefinition[] | Promise<ProviderToolDefinition[]>;

  /** Post-process a tool call result before it goes back to the agent */
  handleToolResult?(toolName: string, result: unknown): unknown | Promise<unknown>;

  /** Provider-specific initialization */
  initialize?(config: ProviderAdapterConfig): Promise<void> | void;

  /** Cleanup when adapter is no longer needed */
  dispose?(): Promise<void> | void;
}

// ─── Plugin Tool Types ───────────────────────────────────────────────────────

/** A tool definition that works across all providers */
export interface PluginTool {
  /** Tool name (will be namespaced) */
  name: string;

  /** Human-readable description */
  description: string;

  /** JSON Schema for parameters */
  parameters: Record<string, unknown>;

  /** The handler that executes the tool */
  handler: (
    params: Record<string, unknown>,
    context: ToolExecutionContext,
  ) => Promise<ToolExecutionResult>;
}

/** Context provided to tool handlers at execution time */
export interface ToolExecutionContext {
  /** Current workspace path */
  workspace: string;

  /** Which AI provider triggered this tool */
  provider: AIProvider;

  /** The conversation this tool call belongs to */
  conversationId: string;

  /** Plugin settings */
  settings: Record<string, unknown>;

  /** Logger scoped to this plugin */
  logger: PluginLogger;
}

/** Result from a tool execution */
export interface ToolExecutionResult {
  /** Whether the tool succeeded */
  success: boolean;

  /** Result data (will be serialized for the agent) */
  data?: unknown;

  /** Error message if failed */
  error?: string;

  /** How to render the result in the UI */
  display?: {
    type: 'text' | 'markdown' | 'json' | 'image' | 'diff';
    content: string;
  };
}

// ─── Plugin Skill Types ──────────────────────────────────────────────────────

/** A skill definition bundled with a plugin */
export interface PluginSkill {
  /** Skill name */
  name: string;

  /** Short description (used for context matching) */
  description: string;

  /** Full skill instructions (SKILL.md content) */
  instructions: string;

  /** Bundled resource paths relative to plugin root */
  resources?: string[];
}

// ─── Plugin Hooks ────────────────────────────────────────────────────────────

/** Context for message-level hooks */
export interface MessageHookContext {
  message: AdapterMessage;
  conversationId: string;
  provider: AIProvider;
  pluginSettings: Record<string, unknown>;
}

/** Result from onBeforeMessage hook */
export interface MessageHookResult {
  /** Modified message (or original if unchanged) */
  message: AdapterMessage;

  /** If true, skip this message entirely */
  cancel?: boolean;
}

/** Context for response-level hooks */
export interface ResponseHookContext {
  response: AdapterMessage;
  originalMessage: AdapterMessage;
  conversationId: string;
  provider: AIProvider;
  pluginSettings: Record<string, unknown>;
}

/** Result from onAfterResponse hook */
export interface ResponseHookResult {
  /** Modified response */
  response: AdapterMessage;
}

/** Context for tool call hooks */
export interface ToolCallHookContext {
  toolName: string;
  params: Record<string, unknown>;
  conversationId: string;
  provider: AIProvider;
}

/** Result from onBeforeToolCall hook */
export interface ToolCallHookResult {
  /** Modified parameters */
  params: Record<string, unknown>;

  /** If true, block this tool call */
  cancel?: boolean;

  /** Reason for cancellation (shown to user) */
  cancelReason?: string;
}

/** Context for tool result hooks */
export interface ToolCallResultContext {
  toolName: string;
  params: Record<string, unknown>;
  result: unknown;
  conversationId: string;
  provider: AIProvider;
}

/** Context for conversation-level hooks */
export interface ConversationContext {
  conversationId: string;
  provider: AIProvider;
}

/**
 * Plugin Lifecycle Hooks
 *
 * These hooks fire at key points in the message/conversation lifecycle.
 * All hooks are optional and run in plugin priority order.
 */
export interface PluginHooks {
  /** Before a message is sent to any agent */
  onBeforeMessage?(ctx: MessageHookContext): Promise<MessageHookResult> | MessageHookResult;

  /** After a response is received from any agent */
  onAfterResponse?(ctx: ResponseHookContext): Promise<ResponseHookResult> | ResponseHookResult;

  /** Before a tool call executes */
  onBeforeToolCall?(ctx: ToolCallHookContext): Promise<ToolCallHookResult> | ToolCallHookResult;

  /** After a tool call completes */
  onAfterToolCall?(ctx: ToolCallResultContext): Promise<void> | void;

  /** When a new conversation is created */
  onConversationCreated?(ctx: ConversationContext): Promise<void> | void;

  /** When a conversation ends or is closed */
  onConversationEnded?(ctx: ConversationContext): Promise<void> | void;

  /** When plugin settings are changed by the user */
  onSettingsChanged?(settings: Record<string, unknown>): Promise<void> | void;
}

// ─── Plugin Context ──────────────────────────────────────────────────────────

/** Logger interface provided to plugins */
export interface PluginLogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Context provided to a plugin during activation.
 * This is the plugin's API surface for interacting with the host.
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
  exec?(command: string, options?: { cwd?: string; timeout?: number }): Promise<{ stdout: string; stderr: string; exitCode: number }>;
}

// ─── Main Plugin Interface ───────────────────────────────────────────────────

/**
 * AionPlugin — The main interface every plugin must implement.
 *
 * A plugin is a standard npm package whose default export satisfies this interface.
 * The host calls activate() on startup, then uses adapters/tools/hooks throughout
 * the plugin's lifetime, and calls deactivate() on shutdown or uninstall.
 *
 * @example
 * ```typescript
 * import type { AionPlugin, PluginContext } from '@aionui/plugin-sdk';
 *
 * const plugin: AionPlugin = {
 *   id: 'aionui-plugin-example',
 *   version: '1.0.0',
 *   activate(ctx) {
 *     ctx.logger.info('Plugin activated!');
 *   },
 * };
 *
 * export default plugin;
 * ```
 */
export interface AionPlugin<TSettings = Record<string, unknown>> {
  /** Unique plugin identifier (should match npm package name) */
  readonly id: string;

  /** Semantic version string */
  readonly version: string;

  /** Called when the plugin is activated by the host */
  activate(context: PluginContext<TSettings>): Promise<void> | void;

  /** Called when the plugin is deactivated (shutdown / uninstall) */
  deactivate?(): Promise<void> | void;

  /** Provider-specific adapters keyed by provider name */
  adapters?: Partial<Record<AIProvider, ProviderAdapter>>;

  /** Cross-provider tools this plugin provides */
  tools?: PluginTool[];

  /** Skill definitions bundled with this plugin */
  skills?: PluginSkill[];

  /** Lifecycle hooks */
  hooks?: PluginHooks;

  /** Priority for hook ordering (lower = earlier, default = 100) */
  priority?: number;
}
