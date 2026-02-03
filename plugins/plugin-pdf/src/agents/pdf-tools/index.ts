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
  readonly id = 'pdf-tools';
  readonly name = 'PDF Tools';
  readonly nameI18n = {
    'en-US': 'PDF Tools',
    'zh-CN': 'PDF 工具',
  };
  readonly description = 'PDF processing: split, merge, convert to images, extract and fill forms.';
  readonly descriptionI18n = {
    'en-US': 'PDF processing: split, merge, convert to images, extract and fill forms.',
    'zh-CN': 'PDF 处理：拆分、合并、转换为图片、提取和填充表单。',
  };
  readonly avatar = '📄';
  readonly presetAgentType = 'gemini' as const;
  readonly prompts = ['Split this PDF into individual pages', 'Extract form fields from document.pdf'];
  readonly promptsI18n = {
    'en-US': ['Split this PDF into individual pages', 'Extract form fields from document.pdf'],
    'zh-CN': ['将这个PDF拆分为单独的页面', '从document.pdf中提取表单字段'],
  };

  async activate(ctx: AgentContext): Promise<void> {
    await super.activate(ctx);
    ctx.logger.info('PDF Tools agent activated');
  }

  getSkills(): string[] {
    return ['pdf'];
  }

  getToolNames(): string[] {
    return ['pdf_split', 'pdf_merge', 'pdf_to_images', 'pdf_extract_form_fields', 'pdf_fill_form', 'pdf_check_fields'];
  }

  async onConversationStart(ctx: ConversationHookContext): Promise<void> {
    this.context?.logger.info(`PDF agent: conversation ${ctx.conversationId} started`);
  }
}
