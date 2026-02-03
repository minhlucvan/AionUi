/**
 * PDF to PPT Agent — Simple config-based agent for PDF to PowerPoint conversion
 *
 * Lives in: plugin-content-converters/src/agents/pdf-to-ppt/index.ts
 *
 * This agent provides workflows for converting PDF documents to PowerPoint presentations
 * while handling watermark removal and layout optimization.
 *
 * It uses:
 *   - PDF tools for extraction
 *   - PPTX tools for creation
 *   - Custom rules for conversion workflows
 */

import { PluginAgentBase } from '../../../../../src/plugin/agents/PluginAgentBase';
import type { AgentContext } from '../../../../../src/plugin/types';

export default class PdfToPptAgent extends PluginAgentBase {
  readonly id = 'pdf-to-ppt';
  readonly name = 'PDF to PPT';
  readonly nameI18n = {
    'en-US': 'PDF to PPT',
    'zh-CN': 'PDF 转 PPT',
  };
  readonly description = 'Convert PDF to PPT with watermark removal rules.';
  readonly descriptionI18n = {
    'en-US': 'Convert PDF to PPT with watermark removal rules.',
    'zh-CN': 'PDF 转 PPT 并去除水印规则',
  };
  readonly avatar = '📄';
  readonly presetAgentType = 'gemini' as const;
  readonly enabledByDefault = true;
  readonly prompts = ['Convert report.pdf to slides', 'Extract charts from whitepaper.pdf'];
  readonly promptsI18n = {
    'en-US': ['Convert report.pdf to slides', 'Extract charts from whitepaper.pdf'],
    'zh-CN': ['将 report.pdf 转换为幻灯片', '从白皮书提取图表'],
  };

  async activate(ctx: AgentContext): Promise<void> {
    await super.activate(ctx);
    ctx.logger.info('PDF to PPT agent activated');
  }

  getSkills(): string[] {
    // Uses both PDF and PPTX skills
    return ['pdf', 'pptx'];
  }

  getToolNames(): string[] {
    // Gets all PDF and PPTX tools
    return [
      // PDF tools
      'pdf_split',
      'pdf_merge',
      'pdf_to_images',
      'pdf_extract_form_fields',
      'pdf_fill_form',
      'pdf_check_fields',
      // PPTX tools
      'pptx_create_from_html',
      'pptx_extract_text',
      'pptx_thumbnail',
      'pptx_rearrange',
      'pptx_replace_text',
      'pptx_unpack',
      'pptx_pack',
      'pptx_validate',
    ];
  }
}
