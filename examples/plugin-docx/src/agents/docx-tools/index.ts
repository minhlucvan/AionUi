/**
 * DOCX Tools Agent — Class-based agent for the DOCX plugin.
 *
 * Lives in: plugin-docx/src/agents/docx-tools/index.ts
 *
 * This agent bundles:
 *   - System prompt for 4 DOCX workflows
 *   - "docx" skill (SKILL.md + docx-js.md + ooxml.md)
 *   - 5 DOCX tools (unpack, pack, validate, to_text, to_images)
 */

import { PluginAgentBase } from '../../../../../src/plugin/agents/PluginAgentBase';
import type { AgentContext, ConversationHookContext } from '../../../../../src/plugin/types';

export default class DocxToolsAgent extends PluginAgentBase {
  readonly id = 'docx-tools';
  readonly name = 'Word Document Tools';
  readonly nameI18n = {
    'en-US': 'Word Document Tools',
    'zh-CN': 'Word 文档工具',
  };
  readonly description = 'Create, edit, and analyze Word documents with tracked changes, comments, and OOXML editing.';
  readonly descriptionI18n = {
    'en-US': 'Create, edit, and analyze Word documents with tracked changes, comments, and OOXML editing.',
    'zh-CN': '使用修订跟踪、批注和 OOXML 编辑来创建、编辑和分析 Word 文档。',
  };
  readonly avatar = '📝';
  readonly presetAgentType = 'gemini' as const;
  readonly prompts = ['Extract text from contract.docx', 'Convert report.docx to images'];
  readonly promptsI18n = {
    'en-US': ['Extract text from contract.docx', 'Convert report.docx to images'],
    'zh-CN': ['从 contract.docx 中提取文本', '将 report.docx 转换为图片'],
  };

  async activate(ctx: AgentContext): Promise<void> {
    await super.activate(ctx);
    ctx.logger.info('DOCX Tools agent activated');
  }

  getSkills(): string[] {
    return ['docx'];
  }

  getToolNames(): string[] {
    return ['docx_unpack', 'docx_pack', 'docx_validate', 'docx_to_text', 'docx_to_images'];
  }

  async onConversationStart(ctx: ConversationHookContext): Promise<void> {
    this.context?.logger.info(`DOCX agent: conversation ${ctx.conversationId} started`);
  }
}
