/**
 * PluginAgentBase — Abstract base class for plugin agents.
 *
 * Extend this class to create a class-based agent with lifecycle hooks,
 * dynamic capabilities, and conversation hooks. Each agent lives in its
 * own folder under the plugin's `agents/` directory:
 *
 *   plugin-pdf/
 *     src/agents/
 *       pdf-tools/
 *         index.ts          ← exports class extending PluginAgentBase
 *         rules/
 *           en-US.md        ← locale-keyed system prompts
 *           zh-CN.md
 *         resources/        ← additional agent resources
 *
 * @example
 * ```typescript
 * import { PluginAgentBase, AgentContext } from '../../src/plugin/agents/PluginAgentBase';
 *
 * export default class PdfToolsAgent extends PluginAgentBase {
 *   readonly id = 'pdf-tools';
 *   readonly name = 'PDF Tools';
 *   readonly description = 'Split, merge, convert, and fill PDF forms.';
 *   readonly avatar = '📄';
 *   readonly presetAgentType = 'gemini' as const;
 *
 *   private pluginDir = '';
 *
 *   async activate(ctx: AgentContext) {
 *     this.pluginDir = ctx.pluginDir;
 *     ctx.logger.info('PDF agent ready');
 *   }
 *
 *   getSkills() { return ['pdf']; }
 *   getTools() { return [...pdfTools]; }
 * }
 * ```
 */
import type { AgentContext, AgentProviderType, AIProvider, ConversationHookContext, IPluginAgent, MessageHookContext, MessageHookResult, PluginMcpServer, PluginToolDefinition, ResponseHookContext, ResponseHookResult, ToolCallHookContext } from '../types';
export declare abstract class PluginAgentBase<TSettings = Record<string, unknown>> implements IPluginAgent<TSettings> {
    abstract readonly id: string;
    abstract readonly name: string;
    abstract readonly description: string;
    readonly nameI18n?: Record<string, string>;
    readonly descriptionI18n?: Record<string, string>;
    readonly avatar?: string;
    readonly presetAgentType?: AgentProviderType;
    readonly enabledByDefault?: boolean;
    readonly models?: string[];
    readonly systemPrompt?: string;
    readonly systemPromptI18n?: Record<string, string>;
    readonly ruleFiles?: Record<string, string>;
    readonly prompts?: string[];
    readonly promptsI18n?: Record<string, string[]>;
    /** Agent context, set during activate(). Subclasses can use this. */
    protected context: AgentContext<TSettings> | null;
    /**
     * Called when the agent is activated. Override to initialize state.
     * The default implementation stores the context for later use.
     */
    activate(ctx: AgentContext<TSettings>): Promise<void>;
    /**
     * Called when the agent is deactivated. Override to clean up.
     * The default implementation clears the context.
     */
    deactivate(): Promise<void>;
    getSystemPrompt?(_locale?: string): string | undefined;
    getSkills?(): string[];
    getCustomSkillNames?(): string[];
    getToolNames?(): string[];
    getTools?(): PluginToolDefinition[];
    getMcpServers?(): PluginMcpServer[];
    onConversationStart?(_ctx: ConversationHookContext): Promise<void> | void;
    onConversationEnd?(_ctx: ConversationHookContext): Promise<void> | void;
    onBeforeMessage?(_ctx: MessageHookContext): Promise<MessageHookResult> | MessageHookResult;
    onAfterResponse?(_ctx: ResponseHookContext): Promise<ResponseHookResult> | ResponseHookResult;
    onToolCall?(_ctx: ToolCallHookContext): Promise<void> | void;
    onSettingsChanged?(_settings: TSettings): Promise<void> | void;
    onProviderChanged?(_provider: AIProvider): Promise<void> | void;
}
export type { AgentContext } from '../types';
