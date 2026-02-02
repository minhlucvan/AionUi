/**
 * aionui-plugin-xlsx
 *
 * AionUi plugin that migrates the built-in xlsx skill into an installable
 * plugin package. Demonstrates that existing skills can be extracted from
 * the monorepo and distributed as standalone plugins.
 *
 * Provides:
 *   1. System Prompt  - Tells the agent about XLSX capabilities
 *   2. Skill: xlsx    - SKILL.md with formula verification, formatting
 *                       standards, pandas/openpyxl best practices
 *   3. Tool: xlsx_recalculate - Runs recalc.py to recalculate formulas
 *                               via LibreOffice and report errors
 *
 * The skill content (SKILL.md) and the recalc.py script are shipped in
 * the skills/xlsx/ directory, identical to the built-in skill layout.
 *
 * Install:
 *   npm: aionui-plugin-xlsx
 *   Local: point to this directory
 */

import type { AionPlugin, PluginAgent, PluginContext, PluginSkillDefinition, PluginSystemPrompt, PluginToolDefinition, ToolExecutionContext, ToolResult } from '../../../src/plugin/types';

// ─── Types ────────────────────────────────────────────────────────────────────

/** This plugin has no user-configurable settings (yet). */
type XlsxPluginSettings = Record<string, unknown>;

/** Parsed JSON output from recalc.py */
interface RecalcResult {
  status?: 'success' | 'errors_found';
  total_errors?: number;
  total_formulas?: number;
  error_summary?: Record<string, { count: number; locations: string[] }>;
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve the path to recalc.py relative to the plugin root */
function recalcScriptPath(pluginDir: string): string {
  return `${pluginDir}/skills/xlsx/recalc.py`;
}

/** Validate that a file path looks like an Excel file */
function isExcelPath(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return lower.endsWith('.xlsx') || lower.endsWith('.xlsm') || lower.endsWith('.xls');
}

// ─── Tool Handler ─────────────────────────────────────────────────────────────

/**
 * xlsx_recalculate tool handler.
 *
 * Runs `python recalc.py <excel_file> [timeout]` via the host's exec()
 * capability (requires shell:execute permission). Parses the JSON output
 * from recalc.py and returns a structured ToolResult.
 */
async function handleRecalculate(params: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
  const excelFile = params.excelFile as string | undefined;
  const timeout = params.timeout as number | undefined;

  // ── Validate inputs ───────────────────────────────────────────────────────

  if (!excelFile || typeof excelFile !== 'string') {
    return {
      success: false,
      error: 'Missing required parameter: excelFile (path to the Excel file)',
    };
  }

  if (!isExcelPath(excelFile)) {
    return {
      success: false,
      error: `File does not appear to be an Excel file: ${excelFile}. Expected .xlsx, .xlsm, or .xls extension.`,
    };
  }

  if (timeout !== undefined && (typeof timeout !== 'number' || timeout <= 0)) {
    return {
      success: false,
      error: 'Invalid timeout: must be a positive number (seconds)',
    };
  }

  // ── Build command ─────────────────────────────────────────────────────────

  const scriptPath = recalcScriptPath((context.settings._pluginDir as string) || '.');
  const args = [scriptPath, excelFile];
  if (timeout) {
    args.push(String(timeout));
  }

  const command = `python ${args.map((a) => `"${a}"`).join(' ')}`;

  context.logger.info(`Recalculating formulas in: ${excelFile}`);

  // ── Execute ───────────────────────────────────────────────────────────────

  try {
    // context.exec is provided by the host (requires shell:execute permission)
    // We use a type assertion because exec is optional on the base context type
    const exec = (context as unknown as Record<string, unknown>).exec as
      | ((
          cmd: string,
          opts?: { cwd?: string; timeout?: number }
        ) => Promise<{
          stdout: string;
          stderr: string;
          exitCode: number;
        }>)
      | undefined;

    if (!exec) {
      return {
        success: false,
        error: 'Shell execution is not available. The plugin requires the shell:execute permission.',
      };
    }

    const result = await exec(command, {
      cwd: context.workspace,
      timeout: ((timeout || 30) + 10) * 1000, // extra buffer for process overhead
    });

    // ── Parse output ──────────────────────────────────────────────────────

    if (result.exitCode !== 0 && !result.stdout) {
      return {
        success: false,
        error: `recalc.py failed (exit code ${result.exitCode}): ${result.stderr || 'Unknown error'}`,
      };
    }

    let parsed: RecalcResult;
    try {
      parsed = JSON.parse(result.stdout) as RecalcResult;
    } catch {
      return {
        success: false,
        error: `Failed to parse recalc.py output as JSON: ${result.stdout.slice(0, 200)}`,
      };
    }

    // ── Handle recalc.py-level errors ───────────────────────────────────

    if (parsed.error) {
      return {
        success: false,
        error: `Recalculation error: ${parsed.error}`,
      };
    }

    // ── Build display output ────────────────────────────────────────────

    const lines: string[] = [];
    lines.push(`## Formula Recalculation: ${excelFile}`);
    lines.push('');
    lines.push(`- **Status**: ${parsed.status === 'success' ? 'All formulas OK' : 'Errors found'}`);
    lines.push(`- **Total formulas**: ${parsed.total_formulas ?? 'N/A'}`);
    lines.push(`- **Total errors**: ${parsed.total_errors ?? 0}`);

    if (parsed.error_summary && Object.keys(parsed.error_summary).length > 0) {
      lines.push('');
      lines.push('### Errors by Type');
      for (const [errorType, details] of Object.entries(parsed.error_summary)) {
        lines.push('');
        lines.push(`**${errorType}** (${details.count} occurrence${details.count !== 1 ? 's' : ''}):`);
        for (const loc of details.locations) {
          lines.push(`- ${loc}`);
        }
      }
    }

    return {
      success: parsed.status === 'success',
      data: parsed,
      display: {
        type: 'markdown',
        content: lines.join('\n'),
      },
    };
  } catch (err) {
    return {
      success: false,
      error: `Failed to execute recalc.py: ${(err as Error).message}`,
    };
  }
}

// ─── Plugin Definition ────────────────────────────────────────────────────────

const xlsxPlugin: AionPlugin<XlsxPluginSettings> = {
  id: 'aionui-plugin-xlsx',
  version: '1.0.0',

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  activate(context: PluginContext<XlsxPluginSettings>) {
    context.logger.info('XLSX plugin activated');
    context.logger.info(`Plugin directory: ${context.pluginDir}`);
    context.logger.info(`Skills directory: ${context.skillsDir}`);
  },

  deactivate() {
    // No resources to clean up
  },

  // ── Capability 1: System Prompts ────────────────────────────────────────────
  //
  // Injected into the first message as [Assistant Rules], telling the agent
  // about XLSX capabilities. This mirrors how the built-in skill system
  // already works via presetRules / AcpBackendConfig.context.

  systemPrompts: [
    {
      content: [
        'You have access to Excel spreadsheet tools provided by the XLSX plugin.',
        '',
        'Key capabilities:',
        '- Create and edit .xlsx files using openpyxl (formulas, formatting, charts)',
        '- Analyze spreadsheet data using pandas',
        '- Recalculate formulas via LibreOffice using the xlsx_recalculate tool',
        '- Follow financial model formatting standards (color coding, number formats)',
        '',
        'IMPORTANT: After creating or modifying any Excel file with formulas,',
        'you MUST run the xlsx_recalculate tool to verify formula correctness.',
        'Deliver files with ZERO formula errors (#REF!, #DIV/0!, #VALUE!, etc.).',
        '',
        'Available tools:',
        '- xlsx_recalculate: Recalculate all formulas in an Excel file and report errors',
      ].join('\n'),
      priority: 50,
    },
  ] satisfies PluginSystemPrompt[],

  // ── Capability 2: Skills ────────────────────────────────────────────────────
  //
  // The xlsx skill is loaded from skills/xlsx/SKILL.md (file-based).
  // Body is omitted so the host loads the SKILL.md file from the plugin
  // directory, exactly like built-in skills.

  skills: [
    {
      name: 'xlsx',
      description: 'Comprehensive spreadsheet creation, editing, and analysis with support for formulas, formatting, data analysis, and visualization. When you need to work with spreadsheets (.xlsx, .xlsm, .csv, .tsv) for creating new spreadsheets with formulas and formatting, reading or analyzing data, modifying existing spreadsheets while preserving formulas, data analysis, or recalculating formulas.',
      // body is omitted — the host loads from skills/xlsx/SKILL.md
      resources: ['skills/xlsx/recalc.py', 'skills/xlsx/LICENSE.txt'],
    },
  ] satisfies PluginSkillDefinition[],

  // ── Capability 3: Tools ─────────────────────────────────────────────────────
  //
  // The xlsx_recalculate tool wraps recalc.py. It works across all providers
  // (Claude, Gemini, Codex, ACP) — no per-provider adapters needed.

  tools: [
    {
      name: 'xlsx_recalculate',
      description: 'Recalculate all formulas in an Excel file using LibreOffice and report any formula errors. ' + 'Returns a JSON summary with total formulas, total errors, and error locations by type ' + '(#REF!, #DIV/0!, #VALUE!, #NAME?, #NULL!, #NUM!, #N/A). ' + 'MUST be run after creating or modifying any Excel file that contains formulas.',
      inputSchema: {
        type: 'object',
        properties: {
          excelFile: {
            type: 'string',
            description: 'Path to the Excel file (.xlsx, .xlsm, or .xls) to recalculate',
          },
          timeout: {
            type: 'number',
            description: 'Maximum time in seconds to wait for LibreOffice recalculation (default: 30)',
          },
        },
        required: ['excelFile'],
      },
      handler: handleRecalculate,
      // Available for all providers — no filter needed
    },
  ] satisfies PluginToolDefinition[],

  // ── Capability 4: Agents ──────────────────────────────────────────────────

  agents: [
    {
      id: 'xlsx-tools',
      name: 'Excel Tools',
      nameI18n: {
        'en-US': 'Excel Tools',
        'zh-CN': 'Excel 工具',
      },
      description: 'Create, edit, and analyze spreadsheets with formula verification and data processing.',
      descriptionI18n: {
        'en-US': 'Create, edit, and analyze spreadsheets with formula verification and data processing.',
        'zh-CN': '使用公式验证和数据处理来创建、编辑和分析电子表格。',
      },
      avatar: '📊',
      skills: ['xlsx'],
      tools: ['xlsx_recalculate'],
      presetAgentType: 'gemini',
      prompts: ['Create a budget spreadsheet', 'Recalculate formulas in report.xlsx'],
      promptsI18n: {
        'en-US': ['Create a budget spreadsheet', 'Recalculate formulas in report.xlsx'],
        'zh-CN': ['创建一个预算电子表格', '重新计算 report.xlsx 中的公式'],
      },
    },
  ] satisfies PluginAgent[],

  priority: 50,
};

export default xlsxPlugin;
