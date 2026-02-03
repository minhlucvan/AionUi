/**
 * aionui-plugin-content-converters
 *
 * Plugin for content conversion workflows between different document formats.
 * Currently provides PDF to PowerPoint conversion with watermark handling.
 *
 * Capabilities:
 *   - Agents: PDF to PPT converter
 *   - Leverages existing PDF and PPTX plugin tools
 *   - No custom tools (uses existing plugins)
 *
 * Future converters:
 *   - DOCX to PDF
 *   - HTML to PDF
 *   - Markdown to DOCX
 */

import type { AionPlugin, PluginContext } from '../../../src/plugin/types';

// ─── Class-based agents ───────────────────────────────────────────────────────
import PdfToPptAgent from './agents/pdf-to-ppt';

// ─── Plugin Definition ────────────────────────────────────────────────────────

const contentConvertersPlugin: AionPlugin = {
  id: 'aionui-plugin-content-converters',
  version: '1.0.0',

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  activate(context: PluginContext) {
    context.logger.info('Content Converters plugin activated');
  },

  deactivate() {
    // Nothing to clean up
  },

  // ── Capability 1: System Prompts ──────────────────────────────────────────
  //
  // Minimal system prompt — the agent's rules handle the specifics

  systemPrompts: [
    {
      content: [
        'You have access to content conversion tools for transforming documents between formats.',
        'Use PDF and PPTX tools together to convert PDF documents to PowerPoint presentations.',
      ].join('\n'),
      priority: 60,
    },
  ],

  // ── Capability 2: Skills ──────────────────────────────────────────────────
  //
  // No custom skills — uses pdf and pptx skills from their respective plugins

  skills: [],

  // ── Capability 3: Tools ───────────────────────────────────────────────────
  //
  // No custom tools — agents reference tools from pdf and pptx plugins

  tools: [],

  // ── Capability 4: Agents ──────────────────────────────────────────────────
  //
  // PDF to PPT conversion agent
  // Future: DOCX to PDF, HTML to PDF, etc.

  agents: [new PdfToPptAgent()],

  priority: 60,
};

export default contentConvertersPlugin;
