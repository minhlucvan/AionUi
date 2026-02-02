/**
 * aionui-plugin-docx
 *
 * AionUi plugin that migrates the built-in DOCX skill into an installable
 * plugin package. This proves that existing skills can be extracted from the
 * monolith and distributed as standalone plugins — same capabilities,
 * same quality, but installable via npm / GitHub / local path.
 *
 * Provides:
 *   1. System Prompt  -> tells the agent about 4 DOCX workflows
 *   2. Skill          -> docx SKILL.md with reference docs (docx-js.md, ooxml.md)
 *   3. Tools          -> docx_unpack, docx_pack, docx_validate, docx_to_text, docx_to_images
 *
 * All tool handlers delegate to bundled Python scripts or system utilities
 * via the shell:execute permission, mirroring how the built-in skill works.
 *
 * Install:
 *   npm: aionui-plugin-docx
 *   GitHub: your-org/aionui-plugin-docx
 *   Local: point to this directory
 */

import type { AionPlugin, PluginContext, PluginSkillDefinition, PluginSystemPrompt, PluginToolDefinition, ToolExecutionContext, ToolResult } from '../../../src/plugin/types';

// ─── Class-based agents (loaded from agents/ folder) ─────────────────────────
import DocxToolsAgent from './agents/docx-tools';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve a path relative to the plugin's install directory */
function pluginPath(context: ToolExecutionContext, ...segments: string[]): string {
  // The plugin root is stored in settings at activation time
  const pluginDir = context.settings._pluginDir as string;
  return [pluginDir, ...segments].join('/');
}

/**
 * Execute a shell command via the host's exec capability.
 * All tool handlers funnel through this so error handling is consistent.
 */
async function execCommand(command: string, context: ToolExecutionContext, cwd?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  // The host provides exec via the context settings bridge.
  // In production, PluginContext.exec is used during activation to create
  // a scoped executor; here we re-derive the working directory.
  const exec = (context as unknown as { exec: PluginContext['exec'] }).exec;
  if (!exec) {
    throw new Error('Shell execution is not available. Ensure the plugin has the shell:execute permission.');
  }
  return exec(command, { cwd: cwd ?? context.workspace, timeout: 120_000 });
}

// ─── Tool Handlers ────────────────────────────────────────────────────────────

/**
 * docx_unpack — Unpack a DOCX file into a directory for XML editing.
 *
 * Runs: python ooxml/scripts/unpack.py <docx_path> <output_dir>
 *
 * The unpack script extracts all XML parts, media, and relationships into
 * a flat directory structure that can be inspected and edited directly.
 * It also suggests an RSID to use for tracked changes.
 */
async function handleDocxUnpack(params: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
  const docxPath = params.docx_path as string | undefined;
  const outputDir = params.output_dir as string | undefined;

  if (!docxPath || typeof docxPath !== 'string') {
    return { success: false, error: 'Missing required parameter: docx_path (path to the .docx file)' };
  }
  if (!outputDir || typeof outputDir !== 'string') {
    return { success: false, error: 'Missing required parameter: output_dir (directory to unpack into)' };
  }

  context.logger.info(`Unpacking "${docxPath}" into "${outputDir}"`);

  try {
    const scriptPath = pluginPath(context, 'skills', 'docx', 'ooxml', 'scripts', 'unpack.py');
    const result = await execCommand(`python "${scriptPath}" "${docxPath}" "${outputDir}"`, context);

    if (result.exitCode !== 0) {
      return {
        success: false,
        error: `Unpack failed (exit ${result.exitCode}):\n${result.stderr || result.stdout}`,
      };
    }

    return {
      success: true,
      data: { docxPath, outputDir, stdout: result.stdout },
      display: {
        type: 'text',
        content: result.stdout || `Successfully unpacked "${docxPath}" into "${outputDir}"`,
      },
    };
  } catch (err) {
    return { success: false, error: `Unpack failed: ${(err as Error).message}` };
  }
}

/**
 * docx_pack — Pack a directory back into a DOCX file.
 *
 * Runs: python ooxml/scripts/pack.py <input_dir> <output_docx>
 *
 * After editing XML files in the unpacked directory, this re-assembles
 * the DOCX archive with correct content types and relationships.
 */
async function handleDocxPack(params: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
  const inputDir = params.input_dir as string | undefined;
  const outputPath = params.output_path as string | undefined;

  if (!inputDir || typeof inputDir !== 'string') {
    return { success: false, error: 'Missing required parameter: input_dir (unpacked directory)' };
  }
  if (!outputPath || typeof outputPath !== 'string') {
    return { success: false, error: 'Missing required parameter: output_path (path for the output .docx file)' };
  }

  context.logger.info(`Packing "${inputDir}" into "${outputPath}"`);

  try {
    const scriptPath = pluginPath(context, 'skills', 'docx', 'ooxml', 'scripts', 'pack.py');
    const result = await execCommand(`python "${scriptPath}" "${inputDir}" "${outputPath}"`, context);

    if (result.exitCode !== 0) {
      return {
        success: false,
        error: `Pack failed (exit ${result.exitCode}):\n${result.stderr || result.stdout}`,
      };
    }

    return {
      success: true,
      data: { inputDir, outputPath, stdout: result.stdout },
      display: {
        type: 'text',
        content: result.stdout || `Successfully packed "${inputDir}" into "${outputPath}"`,
      },
    };
  } catch (err) {
    return { success: false, error: `Pack failed: ${(err as Error).message}` };
  }
}

/**
 * docx_validate — Validate DOCX XML against OOXML schemas.
 *
 * Runs: python ooxml/scripts/validate.py <docx_or_dir> [--strict]
 *
 * Validates the XML parts of a DOCX file (or unpacked directory) against
 * the ISO/IEC 29500 and Microsoft extension schemas bundled with the plugin.
 * Reports schema violations, missing relationships, and structural issues.
 */
async function handleDocxValidate(params: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
  const target = params.target as string | undefined;
  const strict = params.strict as boolean | undefined;

  if (!target || typeof target !== 'string') {
    return { success: false, error: 'Missing required parameter: target (path to .docx file or unpacked directory)' };
  }

  context.logger.info(`Validating "${target}"${strict ? ' (strict mode)' : ''}`);

  try {
    const scriptPath = pluginPath(context, 'skills', 'docx', 'ooxml', 'scripts', 'validate.py');
    const strictFlag = strict ? ' --strict' : '';
    const result = await execCommand(`python "${scriptPath}" "${target}"${strictFlag}`, context);

    // validate.py may return exit code 1 for validation errors (not failures)
    const hasErrors = result.exitCode !== 0;

    return {
      success: true,
      data: {
        target,
        valid: !hasErrors,
        stdout: result.stdout,
        stderr: result.stderr,
      },
      display: {
        type: 'markdown',
        content: hasErrors ? `**Validation found issues:**\n\n\`\`\`\n${result.stdout || result.stderr}\n\`\`\`` : `**Validation passed.**\n\n${result.stdout}`,
      },
    };
  } catch (err) {
    return { success: false, error: `Validation failed: ${(err as Error).message}` };
  }
}

/**
 * docx_to_text — Extract text content from a DOCX file.
 *
 * Runs: pandoc --track-changes=<mode> <docx_path> -t markdown
 *
 * Uses pandoc to convert DOCX to markdown, preserving document structure.
 * Supports track-changes modes: accept, reject, all.
 */
async function handleDocxToText(params: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
  const docxPath = params.docx_path as string | undefined;
  const trackChanges = (params.track_changes as string | undefined) ?? 'accept';

  if (!docxPath || typeof docxPath !== 'string') {
    return { success: false, error: 'Missing required parameter: docx_path (path to the .docx file)' };
  }

  const validModes = ['accept', 'reject', 'all'];
  if (!validModes.includes(trackChanges)) {
    return {
      success: false,
      error: `Invalid track_changes mode "${trackChanges}". Must be one of: ${validModes.join(', ')}`,
    };
  }

  context.logger.info(`Extracting text from "${docxPath}" (track-changes: ${trackChanges})`);

  try {
    const result = await execCommand(`pandoc --track-changes=${trackChanges} "${docxPath}" -t markdown`, context);

    if (result.exitCode !== 0) {
      return {
        success: false,
        error: `Text extraction failed (exit ${result.exitCode}):\n${result.stderr || result.stdout}`,
      };
    }

    return {
      success: true,
      data: { docxPath, trackChanges, content: result.stdout },
      display: {
        type: 'markdown',
        content: result.stdout || '(Document appears to be empty)',
      },
    };
  } catch (err) {
    return { success: false, error: `Text extraction failed: ${(err as Error).message}` };
  }
}

/**
 * docx_to_images — Convert DOCX pages to PNG images for visual analysis.
 *
 * Two-step process:
 *   1. LibreOffice converts DOCX to PDF (headless)
 *   2. pdftoppm converts PDF pages to PNG images
 *
 * Returns the list of generated image file paths.
 */
async function handleDocxToImages(params: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
  const docxPath = params.docx_path as string | undefined;
  const outputDir = params.output_dir as string | undefined;
  const dpi = (params.dpi as number | undefined) ?? 150;
  const firstPage = params.first_page as number | undefined;
  const lastPage = params.last_page as number | undefined;
  const format = (params.format as string | undefined) ?? 'png';

  if (!docxPath || typeof docxPath !== 'string') {
    return { success: false, error: 'Missing required parameter: docx_path (path to the .docx file)' };
  }
  if (!outputDir || typeof outputDir !== 'string') {
    return { success: false, error: 'Missing required parameter: output_dir (directory for output images)' };
  }

  const validFormats = ['png', 'jpeg'];
  if (!validFormats.includes(format)) {
    return {
      success: false,
      error: `Invalid format "${format}". Must be one of: ${validFormats.join(', ')}`,
    };
  }

  context.logger.info(`Converting "${docxPath}" to ${format.toUpperCase()} images at ${dpi} DPI`);

  try {
    // Step 1: DOCX -> PDF via LibreOffice
    const pdfResult = await execCommand(`soffice --headless --convert-to pdf --outdir "${outputDir}" "${docxPath}"`, context);

    if (pdfResult.exitCode !== 0) {
      return {
        success: false,
        error: `LibreOffice PDF conversion failed (exit ${pdfResult.exitCode}):\n${pdfResult.stderr || pdfResult.stdout}`,
      };
    }

    // Derive PDF filename from the DOCX filename
    const docxBasename =
      docxPath
        .split('/')
        .pop()
        ?.replace(/\.docx$/i, '') ?? 'document';
    const pdfPath = `${outputDir}/${docxBasename}.pdf`;

    // Step 2: PDF -> images via pdftoppm
    const formatFlag = format === 'jpeg' ? '-jpeg' : '-png';
    let pageFlags = '';
    if (firstPage !== undefined) pageFlags += ` -f ${firstPage}`;
    if (lastPage !== undefined) pageFlags += ` -l ${lastPage}`;

    const imagePrefix = `${outputDir}/page`;
    const imageResult = await execCommand(`pdftoppm ${formatFlag} -r ${dpi}${pageFlags} "${pdfPath}" "${imagePrefix}"`, context);

    if (imageResult.exitCode !== 0) {
      return {
        success: false,
        error: `pdftoppm conversion failed (exit ${imageResult.exitCode}):\n${imageResult.stderr || imageResult.stdout}`,
      };
    }

    // List generated image files
    const ext = format === 'jpeg' ? 'jpg' : 'png';
    const listResult = await execCommand(`ls -1 "${outputDir}"/page-*.${ext} 2>/dev/null || ls -1 "${outputDir}"/page*.${ext} 2>/dev/null || echo "(no images found)"`, context);

    const imageFiles = listResult.stdout
      .trim()
      .split('\n')
      .filter((f) => f && !f.startsWith('('));

    return {
      success: true,
      data: { docxPath, pdfPath, outputDir, dpi, format, imageFiles },
      display: {
        type: 'markdown',
        content: imageFiles.length > 0 ? `**Converted ${imageFiles.length} page(s) to ${format.toUpperCase()}:**\n\n${imageFiles.map((f) => `- \`${f}\``).join('\n')}` : `Conversion completed but no image files were found in "${outputDir}".`,
      },
    };
  } catch (err) {
    return { success: false, error: `Image conversion failed: ${(err as Error).message}` };
  }
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const DOCX_SYSTEM_PROMPT = [
  'You have access to Word document (DOCX) tools provided by the DOCX plugin.',
  'These tools support four main workflows for working with .docx files:',
  '',
  '## Workflow 1: Read / Analyze',
  'Use `docx_to_text` to extract document content as markdown. Supports',
  'tracked changes modes (accept, reject, all). For deeper analysis of',
  'comments, formatting, or metadata, use `docx_unpack` to access raw XML.',
  '',
  '## Workflow 2: Create New Document',
  "Use the docx-js JavaScript library (documented in the docx skill's",
  'docx-js.md reference). Create a .js/.ts file using Document, Paragraph,',
  'TextRun components and export via Packer.toBuffer().',
  '',
  '## Workflow 3: Edit Existing Document (Tracked Changes)',
  'For editing existing documents with tracked changes and redlining:',
  '1. `docx_to_text` to understand current content',
  '2. `docx_unpack` to extract XML for editing',
  '3. Write Python scripts using the Document library (see ooxml.md)',
  '4. `docx_pack` to reassemble the DOCX file',
  '5. `docx_validate` to verify the result',
  '',
  '## Workflow 4: Convert to Images',
  'Use `docx_to_images` to convert document pages to PNG/JPEG for visual',
  'analysis. Uses LibreOffice for DOCX-to-PDF and pdftoppm for PDF-to-images.',
  '',
  '## Available Tools',
  '- `docx_unpack`: Unpack a DOCX file into a directory for XML editing',
  '- `docx_pack`: Pack an edited directory back into a DOCX file',
  '- `docx_validate`: Validate DOCX XML against OOXML schemas',
  '- `docx_to_text`: Extract text content from a DOCX file via pandoc',
  '- `docx_to_images`: Convert DOCX pages to PNG/JPEG images',
  '',
  'When editing documents, follow the principle of minimal, precise edits:',
  'only mark text that actually changes in tracked changes. Read the full',
  'ooxml.md reference before implementing tracked changes.',
].join('\n');

// ─── Plugin Definition ────────────────────────────────────────────────────────

/** Internal state stored during activation */
let pluginDir = '';

const docxPlugin: AionPlugin = {
  id: 'aionui-plugin-docx',
  version: '1.0.0',

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  activate(context: PluginContext) {
    pluginDir = context.pluginDir;
    context.logger.info('DOCX plugin activated');
    context.logger.info(`Plugin directory: ${pluginDir}`);
    context.logger.info('Skills: docx (with docx-js.md, ooxml.md references)');
    context.logger.info('Tools: docx_unpack, docx_pack, docx_validate, docx_to_text, docx_to_images');
  },

  deactivate() {
    pluginDir = '';
  },

  // ── Capability 1: System Prompts ──────────────────────────────────────────
  //
  // Injected into the agent context so it knows about all 4 DOCX workflows
  // and when to use each tool.

  systemPrompts: [
    {
      content: DOCX_SYSTEM_PROMPT,
      priority: 60,
      // Works with all providers
    },
  ] satisfies PluginSystemPrompt[],

  // ── Capability 2: Skills ──────────────────────────────────────────────────
  //
  // The docx skill — same SKILL.md format as the built-in. The host loads
  // it from skills/docx/SKILL.md in the plugin directory. Reference docs
  // (docx-js.md, ooxml.md) are listed as resources so the agent can read
  // them on demand.

  skills: [
    {
      name: 'docx',
      description: 'Comprehensive document creation, editing, and analysis with support for tracked changes, ' + 'comments, formatting preservation, and text extraction. When you need to work with ' + 'professional documents (.docx files) for: (1) Creating new documents, (2) Modifying or ' + 'editing content, (3) Working with tracked changes, (4) Adding comments, or any other ' + 'document tasks.',
      // body is omitted — the host loads from skills/docx/SKILL.md
      resources: ['skills/docx/docx-js.md', 'skills/docx/ooxml.md'],
    },
  ] satisfies PluginSkillDefinition[],

  // ── Capability 3: Tools ───────────────────────────────────────────────────
  //
  // Five tools that wrap the bundled Python scripts and system utilities.
  // All providers can use these — no per-provider adapters needed.

  tools: [
    // ── docx_unpack ─────────────────────────────────────────────────────────
    {
      name: 'docx_unpack',
      description: 'Unpack a DOCX file into a directory for XML editing. Extracts all XML parts, ' + 'media, relationships, and content types. Also suggests an RSID for tracked changes.',
      inputSchema: {
        type: 'object',
        properties: {
          docx_path: {
            type: 'string',
            description: 'Absolute path to the .docx file to unpack',
          },
          output_dir: {
            type: 'string',
            description: 'Directory to unpack the contents into (will be created if needed)',
          },
        },
        required: ['docx_path', 'output_dir'],
      },
      handler: handleDocxUnpack,
    },

    // ── docx_pack ───────────────────────────────────────────────────────────
    {
      name: 'docx_pack',
      description: 'Pack an unpacked directory back into a DOCX file. Re-assembles the ZIP archive ' + 'with correct content types and relationships after XML editing.',
      inputSchema: {
        type: 'object',
        properties: {
          input_dir: {
            type: 'string',
            description: 'Path to the unpacked directory containing the edited XML files',
          },
          output_path: {
            type: 'string',
            description: 'Path for the output .docx file',
          },
        },
        required: ['input_dir', 'output_path'],
      },
      handler: handleDocxPack,
    },

    // ── docx_validate ───────────────────────────────────────────────────────
    {
      name: 'docx_validate',
      description: 'Validate DOCX XML against OOXML schemas (ISO/IEC 29500 and Microsoft extensions). ' + 'Reports schema violations, missing relationships, and structural issues. ' + 'Accepts either a .docx file or an unpacked directory.',
      inputSchema: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description: 'Path to a .docx file or an unpacked directory to validate',
          },
          strict: {
            type: 'boolean',
            description: 'Enable strict validation mode (more thorough checks)',
          },
        },
        required: ['target'],
      },
      handler: handleDocxValidate,
    },

    // ── docx_to_text ────────────────────────────────────────────────────────
    {
      name: 'docx_to_text',
      description: 'Extract text content from a DOCX file as markdown using pandoc. ' + 'Preserves document structure (headings, lists, tables). ' + 'Supports tracked changes modes: accept (default), reject, or all.',
      inputSchema: {
        type: 'object',
        properties: {
          docx_path: {
            type: 'string',
            description: 'Absolute path to the .docx file',
          },
          track_changes: {
            type: 'string',
            enum: ['accept', 'reject', 'all'],
            description: 'How to handle tracked changes: "accept" (default) applies all changes, ' + '"reject" reverts all changes, "all" shows both insertions and deletions',
          },
        },
        required: ['docx_path'],
      },
      handler: handleDocxToText,
    },

    // ── docx_to_images ──────────────────────────────────────────────────────
    {
      name: 'docx_to_images',
      description: 'Convert DOCX pages to PNG or JPEG images for visual analysis. ' + 'Two-step process: LibreOffice converts DOCX to PDF, then pdftoppm ' + 'converts PDF pages to images. Supports page range selection and DPI control.',
      inputSchema: {
        type: 'object',
        properties: {
          docx_path: {
            type: 'string',
            description: 'Absolute path to the .docx file',
          },
          output_dir: {
            type: 'string',
            description: 'Directory to write output images into',
          },
          dpi: {
            type: 'number',
            description: 'Resolution in DPI (default: 150). Higher = better quality but larger files',
          },
          first_page: {
            type: 'number',
            description: 'First page to convert (1-based). Omit to start from page 1',
          },
          last_page: {
            type: 'number',
            description: 'Last page to convert (1-based). Omit to convert through the last page',
          },
          format: {
            type: 'string',
            enum: ['png', 'jpeg'],
            description: 'Output image format (default: "png")',
          },
        },
        required: ['docx_path', 'output_dir'],
      },
      handler: handleDocxToImages,
    },
  ] satisfies PluginToolDefinition[],

  // ── Capability 4: Agents ──────────────────────────────────────────────────

  // Agents loaded from agents/ folder — class-based with lifecycle hooks
  agents: [new DocxToolsAgent()],

  priority: 60,
};

export default docxPlugin;
