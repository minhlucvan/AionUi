/**
 * aionui-plugin-pptx
 *
 * Migration of the built-in PPTX skill to an installable plugin package.
 * Demonstrates that existing skills (system prompts, SKILL.md, scripts)
 * can be distributed as standalone plugins without any code changes.
 *
 * Capabilities:
 *   1. System Prompts  - Tells the agent about PPTX workflows (create, edit, template)
 *   2. Skills          - Bundles SKILL.md with html2pptx.md and ooxml.md references
 *   3. Tools           - 8 tools wrapping the bundled Python/Node scripts
 *
 * Scripts bundled in skills/pptx/:
 *   - html2pptx.js   (Node/Playwright) - Convert HTML slides to PPTX
 *   - inventory.py   - Extract structured text from presentations
 *   - replace.py     - Apply text replacements from JSON
 *   - thumbnail.py   - Create visual thumbnail grids
 *   - rearrange.py   - Rearrange, duplicate, or delete slides
 *   - ooxml/scripts/unpack.py  - Unpack PPTX for XML editing
 *   - ooxml/scripts/pack.py    - Pack directory back into PPTX
 *   - ooxml/scripts/validate.py - Validate XML against OOXML schemas
 *
 * Install:
 *   npm: aionui-plugin-pptx
 *   GitHub: iOfficeAI/aionui-plugin-pptx
 *   Local: point to this directory
 */

import type { AionPlugin, PluginContext, PluginSkillDefinition, PluginSystemPrompt, PluginToolDefinition, ToolExecutionContext, ToolResult } from '../../../src/plugin/types';

// ─── Class-based agents (loaded from agents/ folder) ─────────────────────────
import PptxToolsAgent from './agents/pptx-tools';

// ─── Path Helpers ─────────────────────────────────────────────────────────────

/** Resolve a script path relative to the plugin's skills/pptx directory */
let pluginDir = '';

function scriptPath(relativePath: string): string {
  return `${pluginDir}/skills/pptx/scripts/${relativePath}`;
}

function ooxmlScriptPath(relativePath: string): string {
  return `${pluginDir}/skills/pptx/ooxml/scripts/${relativePath}`;
}

// ─── Shell Execution Helper ──────────────────────────────────────────────────

/**
 * Execute a shell command via the plugin context's exec() method.
 * Returns a ToolResult wrapping stdout/stderr.
 */
async function runCommand(command: string, context: ToolExecutionContext, options?: { cwd?: string }): Promise<ToolResult> {
  // The exec method is provided when the shell:execute permission is granted.
  // Cast the context to access it — in the real host this is typed; for the
  // POC we reach through the tool context to the plugin context's exec().
  const exec = (context as unknown as { exec: PluginContext['exec'] }).exec;

  if (!exec) {
    return {
      success: false,
      error: 'Shell execution is not available. Ensure the plugin has the "shell:execute" permission.',
    };
  }

  try {
    context.logger.info(`Executing: ${command}`);
    const result = await exec(command, {
      cwd: options?.cwd ?? context.workspace,
      timeout: 120_000,
    });

    if (result.exitCode !== 0) {
      const errorOutput = result.stderr || result.stdout || 'Unknown error';
      return {
        success: false,
        error: `Command failed (exit code ${result.exitCode}): ${errorOutput}`,
        display: { type: 'text', content: errorOutput },
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
      error: `Execution error: ${(err as Error).message}`,
    };
  }
}

// ─── Tool Handlers ───────────────────────────────────────────────────────────

/**
 * pptx_create_from_html
 *
 * Convert an HTML file containing slide markup into a PowerPoint presentation
 * using the Playwright-based html2pptx.js converter.
 *
 * The HTML file should contain slides with positioned elements using CSS.
 * The converter renders each slide in a headless browser, extracts element
 * positions, and creates matching PPTX slides via pptxgenjs.
 */
async function handleCreateFromHtml(params: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
  const htmlFile = params.html_file as string | undefined;
  const outputFile = params.output_file as string | undefined;

  if (!htmlFile || typeof htmlFile !== 'string') {
    return { success: false, error: 'Missing required parameter: html_file' };
  }

  if (!outputFile || typeof outputFile !== 'string') {
    return { success: false, error: 'Missing required parameter: output_file' };
  }

  // html2pptx.js is a library; the agent writes a Node script that imports it
  // and calls html2pptx() for each slide HTML file. The tool provides the path
  // to the library so the agent can require() it.
  //
  // For direct invocation, we run a wrapper that:
  //   1. Creates a pptxgen instance
  //   2. Calls html2pptx(htmlFile, pptx) for each HTML file
  //   3. Writes the output
  const script = scriptPath('html2pptx.js');
  const command = ['node', '-e', `"const pptxgen = require('pptxgenjs');` + `const { html2pptx } = require('${script}');` + `(async () => {` + `  const pptx = new pptxgen();` + `  pptx.layout = 'LAYOUT_16x9';` + `  const files = '${htmlFile}'.split(',');` + `  for (const f of files) { await html2pptx(f.trim(), pptx); }` + `  await pptx.writeFile({ fileName: '${outputFile}' });` + `  console.log('Created: ${outputFile}');` + `})()"`].join(' ');

  return runCommand(command, context);
}

/**
 * pptx_extract_text
 *
 * Extract all text content and shape information from a PowerPoint presentation.
 * Uses inventory.py to produce a structured JSON with slide-by-slide text,
 * paragraph formatting, shape positions, and dimensions.
 */
async function handleExtractText(params: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
  const inputFile = params.input_file as string | undefined;
  const outputFile = params.output_file as string | undefined;
  const issuesOnly = params.issues_only as boolean | undefined;

  if (!inputFile || typeof inputFile !== 'string') {
    return { success: false, error: 'Missing required parameter: input_file' };
  }

  if (!outputFile || typeof outputFile !== 'string') {
    return { success: false, error: 'Missing required parameter: output_file' };
  }

  const script = scriptPath('inventory.py');
  let command = `python "${script}" "${inputFile}" "${outputFile}"`;
  if (issuesOnly) {
    command += ' --issues-only';
  }

  return runCommand(command, context);
}

/**
 * pptx_thumbnail
 *
 * Create a visual thumbnail grid image of all slides in a presentation.
 * Useful for quick visual overview and slide identification.
 * Outputs JPEG grid(s) — multiple grids for large presentations.
 */
async function handleThumbnail(params: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
  const inputFile = params.input_file as string | undefined;
  const outputPrefix = params.output_prefix as string | undefined;
  const cols = params.cols as number | undefined;
  const outlinePlaceholders = params.outline_placeholders as boolean | undefined;

  if (!inputFile || typeof inputFile !== 'string') {
    return { success: false, error: 'Missing required parameter: input_file' };
  }

  const script = scriptPath('thumbnail.py');
  let command = `python "${script}" "${inputFile}"`;

  if (outputPrefix && typeof outputPrefix === 'string') {
    command += ` "${outputPrefix}"`;
  }

  if (cols && typeof cols === 'number') {
    command += ` --cols ${cols}`;
  }

  if (outlinePlaceholders) {
    command += ' --outline-placeholders';
  }

  return runCommand(command, context);
}

/**
 * pptx_rearrange
 *
 * Rearrange, duplicate, or remove slides from a presentation.
 * Takes a comma-separated sequence of 0-based slide indices.
 * Slides can be repeated (duplicated) or omitted (deleted).
 */
async function handleRearrange(params: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
  const templateFile = params.template_file as string | undefined;
  const outputFile = params.output_file as string | undefined;
  const sequence = params.sequence as string | undefined;

  if (!templateFile || typeof templateFile !== 'string') {
    return { success: false, error: 'Missing required parameter: template_file' };
  }

  if (!outputFile || typeof outputFile !== 'string') {
    return { success: false, error: 'Missing required parameter: output_file' };
  }

  if (!sequence || typeof sequence !== 'string') {
    return { success: false, error: 'Missing required parameter: sequence (comma-separated slide indices)' };
  }

  const script = scriptPath('rearrange.py');
  const command = `python "${script}" "${templateFile}" "${outputFile}" "${sequence}"`;

  return runCommand(command, context);
}

/**
 * pptx_replace_text
 *
 * Apply text replacements to a presentation using a JSON mapping file.
 * The JSON should have the structure produced by inventory.py (extract_text),
 * with modified paragraph text for shapes that should be updated.
 */
async function handleReplaceText(params: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
  const inputFile = params.input_file as string | undefined;
  const replacementsFile = params.replacements_file as string | undefined;
  const outputFile = params.output_file as string | undefined;

  if (!inputFile || typeof inputFile !== 'string') {
    return { success: false, error: 'Missing required parameter: input_file' };
  }

  if (!replacementsFile || typeof replacementsFile !== 'string') {
    return { success: false, error: 'Missing required parameter: replacements_file' };
  }

  if (!outputFile || typeof outputFile !== 'string') {
    return { success: false, error: 'Missing required parameter: output_file' };
  }

  const script = scriptPath('replace.py');
  const command = `python "${script}" "${inputFile}" "${replacementsFile}" "${outputFile}"`;

  return runCommand(command, context);
}

/**
 * pptx_unpack
 *
 * Unpack a PPTX file into a directory of pretty-printed XML files.
 * This enables direct XML editing of slide content, themes, layouts, etc.
 * The unpacked directory can be repacked with pptx_pack after editing.
 */
async function handleUnpack(params: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
  const inputFile = params.input_file as string | undefined;
  const outputDir = params.output_dir as string | undefined;

  if (!inputFile || typeof inputFile !== 'string') {
    return { success: false, error: 'Missing required parameter: input_file' };
  }

  if (!outputDir || typeof outputDir !== 'string') {
    return { success: false, error: 'Missing required parameter: output_dir' };
  }

  const script = ooxmlScriptPath('unpack.py');
  const command = `python "${script}" "${inputFile}" "${outputDir}"`;

  return runCommand(command, context);
}

/**
 * pptx_pack
 *
 * Pack an unpacked directory back into a PPTX file.
 * Validates XML against OOXML schemas before packing (unless --force is used).
 * The directory should have been created by pptx_unpack.
 */
async function handlePack(params: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
  const inputDir = params.input_dir as string | undefined;
  const outputFile = params.output_file as string | undefined;
  const force = params.force as boolean | undefined;

  if (!inputDir || typeof inputDir !== 'string') {
    return { success: false, error: 'Missing required parameter: input_dir' };
  }

  if (!outputFile || typeof outputFile !== 'string') {
    return { success: false, error: 'Missing required parameter: output_file' };
  }

  const script = ooxmlScriptPath('pack.py');
  let command = `python "${script}" "${inputDir}" "${outputFile}"`;

  if (force) {
    command += ' --force';
  }

  return runCommand(command, context);
}

/**
 * pptx_validate
 *
 * Validate the XML in an unpacked PPTX directory against OOXML XSD schemas.
 * Checks that all XML files conform to the Office Open XML standard.
 * Requires the original PPTX file for comparison.
 */
async function handleValidate(params: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
  const unpackedDir = params.unpacked_dir as string | undefined;
  const originalFile = params.original_file as string | undefined;
  const verbose = params.verbose as boolean | undefined;

  if (!unpackedDir || typeof unpackedDir !== 'string') {
    return { success: false, error: 'Missing required parameter: unpacked_dir' };
  }

  if (!originalFile || typeof originalFile !== 'string') {
    return { success: false, error: 'Missing required parameter: original_file' };
  }

  const script = ooxmlScriptPath('validate.py');
  let command = `python "${script}" "${unpackedDir}" --original "${originalFile}"`;

  if (verbose) {
    command += ' --verbose';
  }

  return runCommand(command, context);
}

// ─── Plugin Definition ───────────────────────────────────────────────────────

const pptxPlugin: AionPlugin = {
  id: 'aionui-plugin-pptx',
  version: '1.0.0',

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  activate(context: PluginContext) {
    pluginDir = context.pluginDir;
    context.logger.info(`PPTX plugin activated (pluginDir: ${pluginDir})`);
  },

  deactivate() {
    pluginDir = '';
  },

  // ── Capability 1: System Prompts ──────────────────────────────────────────
  //
  // Injected into the first message as [Assistant Rules]. Tells the agent
  // about the three main PPTX workflows: create from HTML, edit via OOXML,
  // and use templates with extract/replace.

  systemPrompts: [
    {
      content: [
        'You have access to PowerPoint presentation tools provided by the PPTX plugin.',
        'Use these tools when the user asks you to create, edit, or analyze .pptx files.',
        '',
        '## Three main workflows:',
        '',
        '### 1. Create from HTML (new presentations without a template)',
        'Design slides as HTML with CSS positioning, then convert to PPTX using',
        'the pptx_create_from_html tool. This gives you full design control with',
        'accurate positioning, typography, and layout.',
        '',
        '### 2. Edit via OOXML (direct XML editing)',
        'Unpack a PPTX file with pptx_unpack, edit the raw XML files directly,',
        'then repack with pptx_pack. Validate your changes with pptx_validate.',
        'Use this for precise control over comments, speaker notes, animations,',
        'slide layouts, themes, and complex formatting.',
        '',
        '### 3. Template-based editing (modify existing presentations)',
        'Extract text with pptx_extract_text to get a structured inventory,',
        'create a replacement JSON, and apply with pptx_replace_text.',
        'Use pptx_rearrange to reorder, duplicate, or remove slides.',
        'Use pptx_thumbnail for visual overview of the slides.',
        '',
        '## Tool reference:',
        '- pptx_create_from_html: Convert HTML slides to PowerPoint',
        '- pptx_extract_text: Extract all text/shapes to JSON',
        '- pptx_thumbnail: Create visual thumbnail grid of slides',
        '- pptx_rearrange: Reorder, duplicate, or delete slides',
        '- pptx_replace_text: Apply text replacements from JSON',
        '- pptx_unpack: Unpack PPTX for XML editing',
        '- pptx_pack: Pack directory back into PPTX',
        '- pptx_validate: Validate XML against OOXML schemas',
      ].join('\n'),
      priority: 80,
    },
  ] satisfies PluginSystemPrompt[],

  // ── Capability 2: Skills ──────────────────────────────────────────────────
  //
  // The pptx skill ships as a SKILL.md file in skills/pptx/SKILL.md (file-based).
  // The body is omitted so the host loads from the file.
  // Resources include the companion reference docs.

  skills: [
    {
      name: 'pptx',
      description: 'Presentation creation, editing, and analysis. When the agent needs to work with ' + 'presentations (.pptx files) for: (1) Creating new presentations from HTML, ' + '(2) Modifying or editing content via OOXML, (3) Working with templates using ' + 'extract/replace workflows, (4) Adding comments or speaker notes, or any other ' + 'presentation tasks.',
      // body omitted — loads from skills/pptx/SKILL.md in the plugin directory
      resources: ['skills/pptx/html2pptx.md', 'skills/pptx/ooxml.md', 'skills/pptx/LICENSE.txt', 'skills/pptx/scripts/html2pptx.js', 'skills/pptx/scripts/inventory.py', 'skills/pptx/scripts/replace.py', 'skills/pptx/scripts/thumbnail.py', 'skills/pptx/scripts/rearrange.py', 'skills/pptx/ooxml/scripts/unpack.py', 'skills/pptx/ooxml/scripts/pack.py', 'skills/pptx/ooxml/scripts/validate.py'],
    },
  ] satisfies PluginSkillDefinition[],

  // ── Capability 3: Tools ───────────────────────────────────────────────────
  //
  // 8 tools wrapping the bundled Python/Node scripts.
  // Each tool validates parameters, constructs the shell command,
  // and executes via runCommand() which calls context.exec().

  tools: [
    // ── Create from HTML ──────────────────────────────────────────────────
    {
      name: 'pptx_create_from_html',
      description: 'Convert HTML slide files to a PowerPoint presentation. The HTML should contain ' + 'slides with CSS-positioned elements. Uses Playwright to render and pptxgenjs to ' + 'create the PPTX with accurate positioning. Multiple HTML files can be specified ' + 'as a comma-separated list for multi-slide presentations.',
      inputSchema: {
        type: 'object',
        properties: {
          html_file: {
            type: 'string',
            description: 'Path to HTML file(s) to convert. Use comma-separated paths for multiple slides.',
          },
          output_file: {
            type: 'string',
            description: 'Path for the output PPTX file.',
          },
        },
        required: ['html_file', 'output_file'],
      },
      handler: handleCreateFromHtml,
    },

    // ── Extract Text ──────────────────────────────────────────────────────
    {
      name: 'pptx_extract_text',
      description: 'Extract all text content and shape information from a PowerPoint presentation ' + 'into a structured JSON file. Includes paragraph formatting, shape positions, ' + 'dimensions, fonts, colors, and bullet levels. Use --issues-only to extract only ' + 'shapes with potential formatting issues.',
      inputSchema: {
        type: 'object',
        properties: {
          input_file: {
            type: 'string',
            description: 'Path to the input PPTX file.',
          },
          output_file: {
            type: 'string',
            description: 'Path for the output JSON file.',
          },
          issues_only: {
            type: 'boolean',
            description: 'If true, extract only shapes with potential issues.',
          },
        },
        required: ['input_file', 'output_file'],
      },
      handler: handleExtractText,
    },

    // ── Thumbnail ─────────────────────────────────────────────────────────
    {
      name: 'pptx_thumbnail',
      description: 'Create a visual thumbnail grid image (JPEG) of all slides in a presentation. ' + 'Useful for quick visual overview, slide identification, and layout analysis. ' + 'Large presentations produce multiple grid files automatically.',
      inputSchema: {
        type: 'object',
        properties: {
          input_file: {
            type: 'string',
            description: 'Path to the input PPTX file.',
          },
          output_prefix: {
            type: 'string',
            description: 'Prefix for output file(s). Defaults to "thumbnails". ' + 'Single grid: {prefix}.jpg. Multiple grids: {prefix}-1.jpg, {prefix}-2.jpg, etc.',
          },
          cols: {
            type: 'number',
            description: 'Number of columns in the grid (1-6). Default: 5.',
          },
          outline_placeholders: {
            type: 'boolean',
            description: 'If true, draw red outlines around text placeholders in the thumbnails.',
          },
        },
        required: ['input_file'],
      },
      handler: handleThumbnail,
    },

    // ── Rearrange ─────────────────────────────────────────────────────────
    {
      name: 'pptx_rearrange',
      description: 'Rearrange, duplicate, or remove slides from a presentation. Takes a comma-separated ' + 'sequence of 0-based slide indices. Slides can be repeated (duplicated) or omitted ' + '(effectively deleted). Example: "0,3,3,5,1" creates a new presentation with those ' + 'slides in that order.',
      inputSchema: {
        type: 'object',
        properties: {
          template_file: {
            type: 'string',
            description: 'Path to the source PPTX file.',
          },
          output_file: {
            type: 'string',
            description: 'Path for the output PPTX file.',
          },
          sequence: {
            type: 'string',
            description: 'Comma-separated sequence of 0-based slide indices. ' + 'Example: "0,2,2,5,3" — first slide, third slide twice, sixth slide, fourth slide.',
          },
        },
        required: ['template_file', 'output_file', 'sequence'],
      },
      handler: handleRearrange,
    },

    // ── Replace Text ──────────────────────────────────────────────────────
    {
      name: 'pptx_replace_text',
      description: 'Apply text replacements to a PowerPoint presentation using a JSON mapping file. ' + 'The JSON should follow the structure produced by pptx_extract_text (inventory.py). ' + 'All shapes identified in the inventory will have their text cleared unless ' + '"paragraphs" is specified in the replacements for that shape.',
      inputSchema: {
        type: 'object',
        properties: {
          input_file: {
            type: 'string',
            description: 'Path to the input PPTX file.',
          },
          replacements_file: {
            type: 'string',
            description: 'Path to the JSON file containing text replacements (same structure as inventory output).',
          },
          output_file: {
            type: 'string',
            description: 'Path for the output PPTX file.',
          },
        },
        required: ['input_file', 'replacements_file', 'output_file'],
      },
      handler: handleReplaceText,
    },

    // ── Unpack ────────────────────────────────────────────────────────────
    {
      name: 'pptx_unpack',
      description: 'Unpack a PPTX file into a directory of pretty-printed XML files for direct editing. ' + 'This extracts and formats all XML, .rels, and media files from the PPTX archive. ' + 'Edit the XML files directly, then repack with pptx_pack.',
      inputSchema: {
        type: 'object',
        properties: {
          input_file: {
            type: 'string',
            description: 'Path to the PPTX file to unpack.',
          },
          output_dir: {
            type: 'string',
            description: 'Directory to extract the contents into.',
          },
        },
        required: ['input_file', 'output_dir'],
      },
      handler: handleUnpack,
    },

    // ── Pack ──────────────────────────────────────────────────────────────
    {
      name: 'pptx_pack',
      description: 'Pack an unpacked directory back into a PPTX file. Validates XML against OOXML schemas ' + 'before packing to prevent corrupt output. Use force=true to skip validation. ' + 'The directory should have been created by pptx_unpack.',
      inputSchema: {
        type: 'object',
        properties: {
          input_dir: {
            type: 'string',
            description: 'Path to the unpacked directory (created by pptx_unpack).',
          },
          output_file: {
            type: 'string',
            description: 'Path for the output PPTX file.',
          },
          force: {
            type: 'boolean',
            description: 'Skip validation and force pack even if XML has errors.',
          },
        },
        required: ['input_dir', 'output_file'],
      },
      handler: handlePack,
    },

    // ── Validate ──────────────────────────────────────────────────────────
    {
      name: 'pptx_validate',
      description: 'Validate the XML in an unpacked PPTX directory against OOXML XSD schemas. ' + 'Checks that all XML files conform to the Office Open XML standard. ' + 'Requires the original PPTX file for comparison. Use before pptx_pack to ' + 'catch XML errors early.',
      inputSchema: {
        type: 'object',
        properties: {
          unpacked_dir: {
            type: 'string',
            description: 'Path to the unpacked directory to validate.',
          },
          original_file: {
            type: 'string',
            description: 'Path to the original PPTX file (for comparison).',
          },
          verbose: {
            type: 'boolean',
            description: 'Enable verbose output with detailed validation messages.',
          },
        },
        required: ['unpacked_dir', 'original_file'],
      },
      handler: handleValidate,
    },
  ] satisfies PluginToolDefinition[],

  // ── Capability 4: Agents ──────────────────────────────────────────────────
  //
  // The PPTX plugin exposes one agent that bundles everything together.
  // When a user selects this agent, they get the PPTX system prompt,
  // pptx skill enabled, and all PPTX tools available.

  // Agents loaded from agents/ folder — class-based with lifecycle hooks
  agents: [new PptxToolsAgent()],

  priority: 80,
};

export default pptxPlugin;
