/**
 * aionui-plugin-pdf
 *
 * Migrated from the built-in pdf skill to prove the plugin architecture.
 * Bundles the same SKILL.md, reference docs, and Python scripts as the
 * original /skills/pdf/ directory — but packaged as an installable plugin.
 *
 * Capabilities:
 *   1. System Prompt  → tells the agent it has PDF processing tools
 *   2. Skill          → "pdf" skill (SKILL.md + reference.md + forms.md)
 *   3. Tools          → 6 function-calling tools backed by Python scripts
 *   4. MCP Servers    → none (tools are native function-calling)
 *
 * This works across all AI agents: Claude Code, Gemini, Codex, etc.
 */

import type { AionPlugin, PluginAgent, PluginContext, PluginSkillDefinition, PluginSystemPrompt, PluginToolDefinition, ToolExecutionContext, ToolResult } from '../../../src/plugin/types';

import * as path from 'path';

// ─── Plugin State ───────────────────────────────────────────────────────────

/** Resolved at activation time so tool handlers can find bundled scripts. */
let pluginDir = '';

/** Bound reference to the host-provided exec function (requires shell:execute). */
let execCommand: NonNullable<PluginContext['exec']> | null = null;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Resolve the absolute path to a bundled Python script.
 * Scripts live at `<pluginDir>/skills/pdf/scripts/<name>`.
 */
function scriptPath(scriptName: string): string {
  return path.join(pluginDir, 'skills', 'pdf', 'scripts', scriptName);
}

/**
 * Execute a bundled Python script and return a ToolResult.
 *
 * Uses the host-provided `exec()` from PluginContext (granted via the
 * `shell:execute` permission declared in package.json).
 */
async function runPythonScript(scriptName: string, args: string[], logger: ToolExecutionContext['logger']): Promise<ToolResult> {
  if (!execCommand) {
    return {
      success: false,
      error: 'Shell execution is not available. Ensure the plugin has the "shell:execute" permission.',
    };
  }

  const script = scriptPath(scriptName);
  const cmd = `python "${script}" ${args.map((a) => `"${a}"`).join(' ')}`;

  logger.info(`Running: ${cmd}`);

  try {
    const result = await execCommand(cmd);

    if (result.exitCode !== 0) {
      return {
        success: false,
        error: result.stderr || `Script exited with code ${result.exitCode}`,
      };
    }

    return {
      success: true,
      data: result.stdout,
      display: { type: 'text', content: result.stdout },
    };
  } catch (err) {
    return {
      success: false,
      error: `Failed to run ${scriptName}: ${(err as Error).message}`,
    };
  }
}

// ─── Tool Handlers ──────────────────────────────────────────────────────────

async function handlePdfSplit(params: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
  const inputPdf = params.inputPdf as string;
  const outputPath = params.outputPath as string;
  const pages = params.pages as string | undefined;

  if (!inputPdf || !outputPath) {
    return {
      success: false,
      error: 'Missing required parameters: inputPdf, outputPath',
    };
  }

  const args = [inputPdf, outputPath];
  if (pages) args.push(pages);

  return runPythonScript('split_pdf.py', args, context.logger);
}

async function handlePdfMerge(params: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
  const outputPdf = params.outputPdf as string;
  const inputPdfs = params.inputPdfs as string[];

  if (!outputPdf || !inputPdfs || !Array.isArray(inputPdfs) || inputPdfs.length < 2) {
    return {
      success: false,
      error: 'Missing required parameters: outputPdf, inputPdfs (array of at least 2 paths)',
    };
  }

  return runPythonScript('merge_pdfs.py', [outputPdf, ...inputPdfs], context.logger);
}

async function handlePdfToImages(params: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
  const inputPdf = params.inputPdf as string;
  const outputDir = params.outputDir as string;
  const dpi = params.dpi as number | undefined;

  if (!inputPdf || !outputDir) {
    return {
      success: false,
      error: 'Missing required parameters: inputPdf, outputDir',
    };
  }

  const args = [inputPdf, outputDir];
  if (dpi) args.push(String(dpi));

  return runPythonScript('convert_pdf_to_images.py', args, context.logger);
}

async function handleExtractFormFields(params: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
  const inputPdf = params.inputPdf as string;
  const outputJson = params.outputJson as string;

  if (!inputPdf || !outputJson) {
    return {
      success: false,
      error: 'Missing required parameters: inputPdf, outputJson',
    };
  }

  return runPythonScript('extract_form_field_info.py', [inputPdf, outputJson], context.logger);
}

async function handleFillForm(params: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
  const inputPdf = params.inputPdf as string;
  const fieldsJson = params.fieldsJson as string;
  const outputPdf = params.outputPdf as string;
  const fillable = params.fillable as boolean | undefined;

  if (!inputPdf || !fieldsJson || !outputPdf) {
    return {
      success: false,
      error: 'Missing required parameters: inputPdf, fieldsJson, outputPdf',
    };
  }

  // Choose the correct script based on whether the PDF has native form fields.
  // Default to fillable (native fields); pass fillable=false for annotation-based.
  const scriptName = fillable !== false ? 'fill_fillable_fields.py' : 'fill_pdf_form_with_annotations.py';

  return runPythonScript(scriptName, [inputPdf, fieldsJson, outputPdf], context.logger);
}

async function handleCheckFields(params: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
  const inputPdf = params.inputPdf as string;

  if (!inputPdf) {
    return {
      success: false,
      error: 'Missing required parameter: inputPdf',
    };
  }

  return runPythonScript('check_fillable_fields.py', [inputPdf], context.logger);
}

// ─── Plugin Definition ──────────────────────────────────────────────────────

const pdfPlugin: AionPlugin = {
  id: 'aionui-plugin-pdf',
  version: '1.0.0',

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  activate(context: PluginContext) {
    pluginDir = context.pluginDir;
    execCommand = context.exec ?? null;

    context.logger.info('PDF Tools plugin activated');
    context.logger.info(`Plugin directory: ${pluginDir}`);

    if (!execCommand) {
      context.logger.warn('Shell execution not available — PDF tools that run Python scripts will not work.');
    }
  },

  deactivate() {
    pluginDir = '';
    execCommand = null;
  },

  // ── Capability 1: System Prompt ───────────────────────────────────────────
  //
  // Injected into the first message as [Assistant Rules], just like
  // presetRules or AcpBackendConfig.context. Tells the agent it has
  // PDF processing tools and how to use them.

  systemPrompts: [
    {
      content: ['You have access to PDF processing tools provided by the PDF Tools plugin.', 'You can split, merge, convert to images, extract form fields, and fill PDF forms.', '', 'Available tools:', '- pdf_split: Split a PDF into pages or extract page ranges', '- pdf_merge: Merge multiple PDFs into one file', '- pdf_to_images: Convert PDF pages to PNG images', '- pdf_extract_form_fields: Extract form field metadata to JSON', '- pdf_fill_form: Fill form fields (fillable or annotation-based)', '- pdf_check_fields: Check if a PDF has fillable form fields', '', 'For detailed PDF processing guidance, activate the "pdf" skill.'].join('\n'),
      priority: 50,
    },
  ] satisfies PluginSystemPrompt[],

  // ── Capability 2: Skill ───────────────────────────────────────────────────
  //
  // The "pdf" skill — same SKILL.md content as the built-in /skills/pdf/.
  // The body is omitted so the host loads from skills/pdf/SKILL.md inside
  // the plugin directory. reference.md and forms.md are listed as resources.

  skills: [
    {
      name: 'pdf',
      description: 'Comprehensive PDF processing: extract text and tables, create PDFs, ' + 'merge/split documents, handle forms (fillable and non-fillable), ' + 'OCR scanned documents, and convert to images.',
      // body omitted — loaded from skills/pdf/SKILL.md at runtime
      resources: ['reference.md', 'forms.md'],
    },
  ] satisfies PluginSkillDefinition[],

  // ── Capability 3: Tools ───────────────────────────────────────────────────
  //
  // Six function-calling tools backed by bundled Python scripts.
  // These work with ALL providers — Claude, Gemini, Codex, any ACP agent.

  tools: [
    {
      name: 'pdf_split',
      description: 'Split a PDF into individual pages or extract specific page ranges.',
      inputSchema: {
        type: 'object',
        properties: {
          inputPdf: {
            type: 'string',
            description: 'Path to the input PDF file',
          },
          outputPath: {
            type: 'string',
            description: 'Output directory (split all pages) or output file path (extract range)',
          },
          pages: {
            type: 'string',
            description: 'Page range to extract (e.g., "1-5" or "1,3,5"). Omit to split all pages.',
          },
        },
        required: ['inputPdf', 'outputPath'],
      },
      handler: handlePdfSplit,
    },
    {
      name: 'pdf_merge',
      description: 'Merge multiple PDF files into a single output PDF.',
      inputSchema: {
        type: 'object',
        properties: {
          outputPdf: {
            type: 'string',
            description: 'Path for the merged output PDF',
          },
          inputPdfs: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of input PDF file paths to merge (minimum 2)',
          },
        },
        required: ['outputPdf', 'inputPdfs'],
      },
      handler: handlePdfMerge,
    },
    {
      name: 'pdf_to_images',
      description: 'Convert PDF pages to PNG images. Creates one PNG per page.',
      inputSchema: {
        type: 'object',
        properties: {
          inputPdf: {
            type: 'string',
            description: 'Path to the input PDF file',
          },
          outputDir: {
            type: 'string',
            description: 'Directory to save PNG images',
          },
          dpi: {
            type: 'number',
            description: 'Resolution in DPI (default: 150)',
          },
        },
        required: ['inputPdf', 'outputDir'],
      },
      handler: handlePdfToImages,
    },
    {
      name: 'pdf_extract_form_fields',
      description: 'Extract form field metadata (field IDs, types, positions) from a PDF to JSON.',
      inputSchema: {
        type: 'object',
        properties: {
          inputPdf: {
            type: 'string',
            description: 'Path to the input PDF file',
          },
          outputJson: {
            type: 'string',
            description: 'Path for the output JSON file',
          },
        },
        required: ['inputPdf', 'outputJson'],
      },
      handler: handleExtractFormFields,
    },
    {
      name: 'pdf_fill_form',
      description: 'Fill a PDF form with values from a JSON file. Supports both fillable ' + '(native form fields) and non-fillable (annotation-based) PDFs.',
      inputSchema: {
        type: 'object',
        properties: {
          inputPdf: {
            type: 'string',
            description: 'Path to the input PDF file',
          },
          fieldsJson: {
            type: 'string',
            description: 'Path to the JSON file with field values',
          },
          outputPdf: {
            type: 'string',
            description: 'Path for the filled output PDF',
          },
          fillable: {
            type: 'boolean',
            description: 'true for native fillable form fields (default), false for annotation-based filling',
          },
        },
        required: ['inputPdf', 'fieldsJson', 'outputPdf'],
      },
      handler: handleFillForm,
    },
    {
      name: 'pdf_check_fields',
      description: 'Check if a PDF has fillable form fields. Returns field names and types if found.',
      inputSchema: {
        type: 'object',
        properties: {
          inputPdf: {
            type: 'string',
            description: 'Path to the input PDF file',
          },
        },
        required: ['inputPdf'],
      },
      handler: handleCheckFields,
    },
  ] satisfies PluginToolDefinition[],

  // No MCP servers — all tools are native function-calling handlers.

  // ── Capability 4: Agents ──────────────────────────────────────────────────
  //
  // The PDF plugin exposes one agent that bundles everything together.
  // When a user selects this agent, they get the PDF system prompt,
  // pdf skill enabled, and all PDF tools available.

  agents: [
    {
      id: 'pdf-tools',
      name: 'PDF Tools',
      nameI18n: {
        'en-US': 'PDF Tools',
        'zh-CN': 'PDF 工具',
      },
      description: 'PDF processing: split, merge, convert to images, extract and fill forms.',
      descriptionI18n: {
        'en-US': 'PDF processing: split, merge, convert to images, extract and fill forms.',
        'zh-CN': 'PDF 处理：拆分、合并、转换为图片、提取和填充表单。',
      },
      avatar: '📄',
      skills: ['pdf'],
      tools: ['pdf_split', 'pdf_merge', 'pdf_to_images', 'pdf_extract_form_fields', 'pdf_fill_form', 'pdf_check_fields'],
      presetAgentType: 'gemini',
      prompts: ['Split this PDF into individual pages', 'Extract form fields from document.pdf'],
      promptsI18n: {
        'en-US': ['Split this PDF into individual pages', 'Extract form fields from document.pdf'],
        'zh-CN': ['将这个PDF拆分为单独的页面', '从document.pdf中提取表单字段'],
      },
    },
  ] satisfies PluginAgent[],

  priority: 50,
};

export default pdfPlugin;
