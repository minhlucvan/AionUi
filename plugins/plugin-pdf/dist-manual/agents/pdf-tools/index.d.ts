/**
 * PDF Tools Agent — Class-based agent for the PDF plugin.
 *
 * Lives in: plugin-pdf/src/agents/pdf-tools/index.ts
 *
 * This agent bundles:
 *   - System prompt for PDF capabilities
 *   - "pdf" skill (SKILL.md + reference docs)
 *   - 6 PDF tools (split, merge, convert, extract, fill, check)
 *
 * Demonstrates the class-based agent pattern with lifecycle hooks.
 */
import { PluginAgentBase } from '../../../../../src/plugin/agents/PluginAgentBase';
import type { AgentContext, ConversationHookContext } from '../../../../../src/plugin/types';
export default class PdfToolsAgent extends PluginAgentBase {
    readonly id = "pdf-tools";
    readonly name = "PDF Tools";
    readonly nameI18n: {
        'en-US': string;
        'zh-CN': string;
    };
    readonly description = "PDF processing: split, merge, convert to images, extract and fill forms.";
    readonly descriptionI18n: {
        'en-US': string;
        'zh-CN': string;
    };
    readonly avatar = "\uD83D\uDCC4";
    readonly presetAgentType: "gemini";
    readonly prompts: string[];
    readonly promptsI18n: {
        'en-US': string[];
        'zh-CN': string[];
    };
    activate(ctx: AgentContext): Promise<void>;
    getSkills(): string[];
    getToolNames(): string[];
    onConversationStart(ctx: ConversationHookContext): Promise<void>;
}
