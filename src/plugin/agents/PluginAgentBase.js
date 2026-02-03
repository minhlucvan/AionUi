"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginAgentBase = void 0;
class PluginAgentBase {
    constructor() {
        // ── Identity (must be overridden) ───────────────────────────────────────
        // ── Protected state ─────────────────────────────────────────────────────
        /** Agent context, set during activate(). Subclasses can use this. */
        this.context = null;
    }
    // ── Lifecycle ───────────────────────────────────────────────────────────
    /**
     * Called when the agent is activated. Override to initialize state.
     * The default implementation stores the context for later use.
     */
    // eslint-disable-next-line require-await
    async activate(ctx) {
        this.context = ctx;
    }
    /**
     * Called when the agent is deactivated. Override to clean up.
     * The default implementation clears the context.
     */
    // eslint-disable-next-line require-await
    async deactivate() {
        this.context = null;
    }
}
exports.PluginAgentBase = PluginAgentBase;
