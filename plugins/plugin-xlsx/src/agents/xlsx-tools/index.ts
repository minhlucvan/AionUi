/**
 * XLSX Tools Agent — Class-based agent for the XLSX plugin.
 *
 * Lives in: plugin-xlsx/src/agents/xlsx-tools/index.ts
 *
 * This agent bundles:
 *   - System prompt for XLSX capabilities
 *   - "xlsx" skill (SKILL.md + recalc.py)
 *   - 1 XLSX tool (xlsx_recalculate)
 */

import { PluginAgentBase } from '../../../../../src/plugin/agents/PluginAgentBase';
import type { AgentContext, ConversationHookContext } from '../../../../../src/plugin/types';

export default class XlsxToolsAgent extends PluginAgentBase {
  readonly id = 'xlsx-tools';
  readonly name = 'Excel Tools';
  readonly nameI18n = {
    'en-US': 'Excel Tools',
    'zh-CN': 'Excel 工具',
  };
  readonly description = 'Create, edit, and analyze spreadsheets with formula verification and data processing.';
  readonly descriptionI18n = {
    'en-US': 'Create, edit, and analyze spreadsheets with formula verification and data processing.',
    'zh-CN': '使用公式验证和数据处理来创建、编辑和分析电子表格。',
  };
  readonly avatar = '📊';
  readonly presetAgentType = 'gemini' as const;
  readonly prompts = ['Create a budget spreadsheet', 'Recalculate formulas in report.xlsx'];
  readonly promptsI18n = {
    'en-US': ['Create a budget spreadsheet', 'Recalculate formulas in report.xlsx'],
    'zh-CN': ['创建一个预算电子表格', '重新计算 report.xlsx 中的公式'],
  };

  async activate(ctx: AgentContext): Promise<void> {
    await super.activate(ctx);
    ctx.logger.info('XLSX Tools agent activated');
  }

  getSkills(): string[] {
    return ['xlsx'];
  }

  getToolNames(): string[] {
    return ['xlsx_recalculate'];
  }

  async onConversationStart(ctx: ConversationHookContext): Promise<void> {
    this.context?.logger.info(`XLSX agent: conversation ${ctx.conversationId} started`);
  }
}
