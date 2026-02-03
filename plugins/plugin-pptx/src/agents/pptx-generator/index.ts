/**
 * PPTX Generator Agent — Assistant for generating PowerPoint presentations
 *
 * Lives in: plugin-pptx/src/agents/pptx-generator/index.ts
 *
 * This agent provides a specialized workflow for creating PowerPoint presentations
 * using the pptxgenjs library through a JSON-based specification system.
 *
 * It bundles:
 *   - Custom rules for pptxgenjs workflow (slides.json + generate-pptx.js)
 *   - "pptx" skill for detailed PPTX manipulation
 *   - All PPTX tools from the plugin
 */

import { PluginAgentBase } from '../../../../../src/plugin/agents/PluginAgentBase';
import type { AgentContext, ConversationHookContext } from '../../../../../src/plugin/types';

export default class PptxGeneratorAgent extends PluginAgentBase {
  readonly id = 'pptx-generator';
  readonly name = 'PPTX Generator';
  readonly nameI18n = {
    'en-US': 'PPTX Generator',
    'zh-CN': 'PPTX 生成器',
  };
  readonly description = 'Generate local PPTX assets and structure for pptxgenjs.';
  readonly descriptionI18n = {
    'en-US': 'Generate local PPTX assets and structure for pptxgenjs.',
    'zh-CN': '生成本地 PPTX 资产与结构（pptxgenjs）。',
  };
  readonly avatar = '📊';
  readonly presetAgentType = 'gemini' as const;
  readonly enabledByDefault = true;
  readonly prompts = ['Create a slide deck about AI trends', 'Generate a PPT for quarterly report'];
  readonly promptsI18n = {
    'en-US': ['Create a slide deck about AI trends', 'Generate a PPT for quarterly report'],
    'zh-CN': ['创建一个关于AI趋势的幻灯片', '生成季度报告PPT'],
  };

  async activate(ctx: AgentContext): Promise<void> {
    await super.activate(ctx);
    ctx.logger.info('PPTX Generator agent activated');
  }

  getSkills(): string[] {
    return ['pptx'];
  }

  getToolNames(): string[] {
    return ['pptx_create_from_html', 'pptx_extract_text', 'pptx_thumbnail', 'pptx_rearrange', 'pptx_replace_text', 'pptx_unpack', 'pptx_pack', 'pptx_validate'];
  }

  async onConversationStart(ctx: ConversationHookContext): Promise<void> {
    this.context?.logger.info(`PPTX Generator: conversation ${ctx.conversationId} started`);
  }
}
