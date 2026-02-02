/**
 * Tests for migrated built-in skill → plugin packages.
 *
 * Validates that the four document skills (pdf, pptx, docx, xlsx) are
 * correctly packaged as AionPlugin implementations. Each plugin must:
 *   - Export default an AionPlugin with id, version, activate()
 *   - Provide systemPrompts[], skills[], and tools[]
 *   - Have tools with valid inputSchema and callable handlers
 *   - Have a matching package.json with the aionui manifest
 *   - Tools should return errors when called without exec (permission check)
 */

import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import type { AionPlugin, PluginManifest } from '../../src/plugin/types';

// ── Load Plugins ──────────────────────────────────────────────────────────────

const EXAMPLES_DIR = path.resolve(__dirname, '../../examples');

// Import each plugin's default export
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfPlugin: AionPlugin = require(path.join(EXAMPLES_DIR, 'plugin-pdf/src/index')).default;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pptxPlugin: AionPlugin = require(path.join(EXAMPLES_DIR, 'plugin-pptx/src/index')).default;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const docxPlugin: AionPlugin = require(path.join(EXAMPLES_DIR, 'plugin-docx/src/index')).default;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const xlsxPlugin: AionPlugin = require(path.join(EXAMPLES_DIR, 'plugin-xlsx/src/index')).default;

// ── Load Manifests ────────────────────────────────────────────────────────────

function loadManifest(pluginDir: string): { name: string; version: string; aionui: PluginManifest } {
  const raw = fs.readFileSync(path.join(EXAMPLES_DIR, pluginDir, 'package.json'), 'utf-8');
  return JSON.parse(raw);
}

const pdfManifest = loadManifest('plugin-pdf');
const pptxManifest = loadManifest('plugin-pptx');
const docxManifest = loadManifest('plugin-docx');
const xlsxManifest = loadManifest('plugin-xlsx');

// ── Shared validators ─────────────────────────────────────────────────────────

interface PluginTestCase {
  name: string;
  plugin: AionPlugin;
  manifest: { name: string; version: string; aionui: PluginManifest };
  expectedId: string;
  expectedSkill: string;
  expectedToolCount: number;
  expectedToolNames: string[];
}

const testCases: PluginTestCase[] = [
  {
    name: 'PDF',
    plugin: pdfPlugin,
    manifest: pdfManifest,
    expectedId: 'aionui-plugin-pdf',
    expectedSkill: 'pdf',
    expectedToolCount: 6,
    expectedToolNames: ['pdf_split', 'pdf_merge', 'pdf_to_images', 'pdf_extract_form_fields', 'pdf_fill_form', 'pdf_check_fields'],
  },
  {
    name: 'PPTX',
    plugin: pptxPlugin,
    manifest: pptxManifest,
    expectedId: 'aionui-plugin-pptx',
    expectedSkill: 'pptx',
    expectedToolCount: 8,
    expectedToolNames: ['pptx_create_from_html', 'pptx_extract_text', 'pptx_thumbnail', 'pptx_rearrange', 'pptx_replace_text', 'pptx_unpack', 'pptx_pack', 'pptx_validate'],
  },
  {
    name: 'DOCX',
    plugin: docxPlugin,
    manifest: docxManifest,
    expectedId: 'aionui-plugin-docx',
    expectedSkill: 'docx',
    expectedToolCount: 5,
    expectedToolNames: ['docx_unpack', 'docx_pack', 'docx_validate', 'docx_to_text', 'docx_to_images'],
  },
  {
    name: 'XLSX',
    plugin: xlsxPlugin,
    manifest: xlsxManifest,
    expectedId: 'aionui-plugin-xlsx',
    expectedSkill: 'xlsx',
    expectedToolCount: 1,
    expectedToolNames: ['xlsx_recalculate'],
  },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Migrated Plugin Packages', () => {
  describe.each(testCases)('$name Plugin', ({ plugin, manifest, expectedId, expectedSkill, expectedToolCount, expectedToolNames }) => {
    // ── Identity ────────────────────────────────────────────────────────

    it('should have correct id', () => {
      expect(plugin.id).toBe(expectedId);
    });

    it('should have a semantic version', () => {
      expect(plugin.version).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('should have activate function', () => {
      expect(typeof plugin.activate).toBe('function');
    });

    it('should have a priority', () => {
      expect(typeof plugin.priority).toBe('number');
    });

    // ── Capability: System Prompts ──────────────────────────────────────

    it('should have at least one system prompt', () => {
      expect(plugin.systemPrompts).toBeDefined();
      expect(plugin.systemPrompts!.length).toBeGreaterThanOrEqual(1);
    });

    it('should have system prompts with non-empty content', () => {
      for (const prompt of plugin.systemPrompts!) {
        expect(prompt.content.length).toBeGreaterThan(10);
      }
    });

    // ── Capability: Skills ──────────────────────────────────────────────

    it('should have at least one skill', () => {
      expect(plugin.skills).toBeDefined();
      expect(plugin.skills!.length).toBeGreaterThanOrEqual(1);
    });

    it('should have the expected skill name', () => {
      const skillNames = plugin.skills!.map((s) => s.name);
      expect(skillNames).toContain(expectedSkill);
    });

    it('skills should have name and description', () => {
      for (const skill of plugin.skills!) {
        expect(skill.name).toBeTruthy();
        expect(skill.description).toBeTruthy();
      }
    });

    // ── Capability: Tools ───────────────────────────────────────────────

    it(`should have ${expectedToolCount} tools`, () => {
      expect(plugin.tools).toBeDefined();
      expect(plugin.tools!.length).toBe(expectedToolCount);
    });

    it('should have all expected tool names', () => {
      const toolNames = plugin.tools!.map((t) => t.name);
      for (const expectedName of expectedToolNames) {
        expect(toolNames).toContain(expectedName);
      }
    });

    it('each tool should have name, description, inputSchema, and handler', () => {
      for (const tool of plugin.tools!) {
        expect(tool.name).toBeTruthy();
        expect(tool.description.length).toBeGreaterThan(5);
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.handler).toBe('function');
      }
    });

    it('tool inputSchemas should be valid JSON Schema objects', () => {
      for (const tool of plugin.tools!) {
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
      }
    });

    // ── Manifest Consistency ────────────────────────────────────────────

    it('manifest name should match plugin id', () => {
      expect(manifest.name).toBe(expectedId);
    });

    it('manifest version should match plugin version', () => {
      expect(manifest.version).toBe(plugin.version);
    });

    it('manifest should have aionui field', () => {
      expect(manifest.aionui).toBeDefined();
      expect(manifest.aionui.pluginVersion).toBe('1.0');
    });

    it('manifest category should be a valid PluginCategory', () => {
      const validCategories = ['productivity', 'ai-tools', 'code-analysis', 'document', 'integration', 'other'];
      expect(validCategories).toContain(manifest.aionui.category);
    });

    it('manifest should declare all tools', () => {
      const manifestToolNames = manifest.aionui.tools!.map((t: any) => t.name);
      for (const expectedName of expectedToolNames) {
        expect(manifestToolNames).toContain(expectedName);
      }
    });

    it('manifest should declare the skill', () => {
      const manifestSkills = manifest.aionui.skills as Array<{ name: string }>;
      const skillNames = manifestSkills.map((s) => s.name);
      expect(skillNames).toContain(expectedSkill);
    });

    it('manifest should require shell:execute permission', () => {
      expect(manifest.aionui.permissions).toContain('shell:execute');
    });
  });

  // ── Activation ──────────────────────────────────────────────────────────

  describe('Plugin Activation', () => {
    const mockContext = {
      pluginId: 'test',
      settings: {},
      workspace: '/tmp/test',
      pluginDir: '/tmp/plugins/test',
      logger: {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
      },
      activeProvider: 'gemini' as const,
      skillsDir: '/tmp/skills',
      onSettingsChange: () => () => {},
      onProviderChange: () => () => {},
    };

    it('PDF plugin should activate without error', async () => {
      await expect(Promise.resolve(pdfPlugin.activate(mockContext))).resolves.not.toThrow();
    });

    it('PPTX plugin should activate without error', async () => {
      await expect(Promise.resolve(pptxPlugin.activate(mockContext))).resolves.not.toThrow();
    });

    it('DOCX plugin should activate without error', async () => {
      await expect(Promise.resolve(docxPlugin.activate(mockContext))).resolves.not.toThrow();
    });

    it('XLSX plugin should activate without error', async () => {
      await expect(Promise.resolve(xlsxPlugin.activate(mockContext))).resolves.not.toThrow();
    });
  });

  // ── Tool Error Handling ─────────────────────────────────────────────────

  describe('Tool Error Handling', () => {
    const baseToolContext = {
      workspace: '/tmp/test',
      provider: 'gemini' as const,
      conversationId: 'test-conv',
      settings: {},
      logger: {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
      },
    };

    it('PDF tools should error on missing required params', async () => {
      const splitTool = pdfPlugin.tools!.find((t) => t.name === 'pdf_split');
      expect(splitTool).toBeDefined();

      // Call with empty params — should fail with missing param error
      const result = await splitTool!.handler({}, baseToolContext);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('PPTX tools should error on missing required params', async () => {
      const extractTool = pptxPlugin.tools!.find((t) => t.name === 'pptx_extract_text');
      expect(extractTool).toBeDefined();

      const result = await extractTool!.handler({}, baseToolContext);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('DOCX tools should error on missing required params', async () => {
      const unpackTool = docxPlugin.tools!.find((t) => t.name === 'docx_unpack');
      expect(unpackTool).toBeDefined();

      const result = await unpackTool!.handler({}, baseToolContext);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('XLSX tools should error on missing required params', async () => {
      const recalcTool = xlsxPlugin.tools!.find((t) => t.name === 'xlsx_recalculate');
      expect(recalcTool).toBeDefined();

      const result = await recalcTool!.handler({}, baseToolContext);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ── Cross-Plugin Consistency ────────────────────────────────────────────

  describe('Cross-Plugin Consistency', () => {
    it('all plugins should have unique IDs', () => {
      const ids = testCases.map((tc) => tc.plugin.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all plugins should have unique skill names', () => {
      const allSkillNames = testCases.flatMap((tc) => tc.plugin.skills!.map((s) => s.name));
      expect(new Set(allSkillNames).size).toBe(allSkillNames.length);
    });

    it('all plugins should have unique tool names within their namespace', () => {
      for (const tc of testCases) {
        const toolNames = tc.plugin.tools!.map((t) => t.name);
        expect(new Set(toolNames).size).toBe(toolNames.length);
      }
    });

    it('tool names should be prefixed with skill name', () => {
      for (const tc of testCases) {
        for (const tool of tc.plugin.tools!) {
          expect(tool.name).toMatch(new RegExp(`^${tc.expectedSkill}_`));
        }
      }
    });

    it('all manifests should use document category', () => {
      for (const tc of testCases) {
        expect(tc.manifest.aionui.category).toBe('document');
      }
    });

    it('all manifests should require same minimum host version', () => {
      const versions = testCases.map((tc) => tc.manifest.aionui.minHostVersion);
      expect(new Set(versions).size).toBe(1);
    });
  });
});
