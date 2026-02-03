/**
 * PPTX Tools Agent — Class-based agent for the PPTX plugin.
 *
 * Lives in: plugin-pptx/src/agents/pptx-tools/index.ts
 *
 * This agent bundles:
 *   - System prompt for PPTX workflows (create, edit, template)
 *   - "pptx" skill (SKILL.md + html2pptx.md + ooxml.md)
 *   - 8 PPTX tools (create, extract, thumbnail, rearrange, replace, unpack, pack, validate)
 */

import { PluginAgentBase } from '../../../../../src/plugin/agents/PluginAgentBase';
import type { AgentContext, ConversationHookContext } from '../../../../../src/plugin/types';

export default class PptxToolsAgent extends PluginAgentBase {
  readonly id = 'pptx-tools';
  readonly name = 'PPTX Generator';
  readonly nameI18n = {
    'en-US': 'PPTX Generator',
    'zh-CN': 'PPTX 生成器',
  };
  readonly description = 'Create, edit, and analyze PowerPoint presentations with HTML conversion, OOXML editing, and template workflows.';
  readonly descriptionI18n = {
    'en-US': 'Create, edit, and analyze PowerPoint presentations with HTML conversion, OOXML editing, and template workflows.',
    'zh-CN': '使用 HTML 转换、OOXML 编辑和模板工作流创建、编辑和分析 PowerPoint 演示文稿。',
  };
  readonly avatar = '📊';
  readonly presetAgentType = 'gemini' as const;
  readonly prompts = ['Create a slide deck about AI trends', 'Generate a PPT for quarterly report'];
  readonly promptsI18n = {
    'en-US': ['Create a slide deck about AI trends', 'Generate a PPT for quarterly report'],
    'zh-CN': ['创建一个关于AI趋势的幻灯片', '生成季度报告PPT'],
  };

  async activate(ctx: AgentContext): Promise<void> {
    await super.activate(ctx);
    ctx.logger.info('PPTX Tools agent activated');
  }

  getSkills(): string[] {
    return ['pptx'];
  }

  getToolNames(): string[] {
    return ['pptx_create_from_html', 'pptx_extract_text', 'pptx_thumbnail', 'pptx_rearrange', 'pptx_replace_text', 'pptx_unpack', 'pptx_pack', 'pptx_validate'];
  }

  async onConversationStart(ctx: ConversationHookContext): Promise<void> {
    this.context?.logger.info(`PPTX agent: conversation ${ctx.conversationId} started`);
  }
}
