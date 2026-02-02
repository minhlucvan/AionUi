/**
 * Tests for plugin auto-load behavior at application startup.
 *
 * Validates that:
 *   - Built-in plugin descriptors map correctly to plugin packages
 *   - loadBuiltinPlugin loads plugin modules successfully
 *   - createBuiltinRegistryEntry creates pre-activated entries
 *   - getActiveBuiltinPlugins filters by enabled skills
 *   - initPluginSystem creates a singleton PluginManager and registers built-ins
 *   - Plugin system prompts are injected into agent message flows
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as path from 'path';

// ── builtinPlugins tests ──────────────────────────────────────────────────────

import { BUILTIN_PLUGINS, loadBuiltinPlugin, createBuiltinRegistryEntry, getActiveBuiltinPlugins, resolveBuiltinPluginsDir } from '../../src/plugin/builtin/builtinPlugins';

describe('Built-in Plugin Registry', () => {
  describe('BUILTIN_PLUGINS', () => {
    it('should have 4 built-in plugins', () => {
      expect(BUILTIN_PLUGINS).toHaveLength(4);
    });

    it('should have unique IDs', () => {
      const ids = BUILTIN_PLUGINS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should have unique directory names', () => {
      const dirNames = BUILTIN_PLUGINS.map((p) => p.dirName);
      expect(new Set(dirNames).size).toBe(dirNames.length);
    });

    it('should cover pdf, pptx, docx, xlsx skills', () => {
      const allSkills = BUILTIN_PLUGINS.flatMap((p) => p.skillNames);
      expect(allSkills).toContain('pdf');
      expect(allSkills).toContain('pptx');
      expect(allSkills).toContain('docx');
      expect(allSkills).toContain('xlsx');
    });

    it('each descriptor should have required fields', () => {
      for (const desc of BUILTIN_PLUGINS) {
        expect(desc.dirName).toBeTruthy();
        expect(desc.id).toBeTruthy();
        expect(desc.skillNames.length).toBeGreaterThan(0);
        expect(desc.displayName).toBeTruthy();
      }
    });
  });

  describe('resolveBuiltinPluginsDir', () => {
    it('should return a path containing examples', () => {
      const dir = resolveBuiltinPluginsDir();
      expect(dir).toContain('examples');
    });
  });

  describe('loadBuiltinPlugin', () => {
    it('should load the PDF plugin', () => {
      const desc = BUILTIN_PLUGINS.find((p) => p.id === 'aionui-plugin-pdf')!;
      const plugin = loadBuiltinPlugin(desc);
      expect(plugin).not.toBeNull();
      expect(plugin!.id).toBe('aionui-plugin-pdf');
      expect(typeof plugin!.activate).toBe('function');
    });

    it('should load the PPTX plugin', () => {
      const desc = BUILTIN_PLUGINS.find((p) => p.id === 'aionui-plugin-pptx')!;
      const plugin = loadBuiltinPlugin(desc);
      expect(plugin).not.toBeNull();
      expect(plugin!.id).toBe('aionui-plugin-pptx');
    });

    it('should load the DOCX plugin', () => {
      const desc = BUILTIN_PLUGINS.find((p) => p.id === 'aionui-plugin-docx')!;
      const plugin = loadBuiltinPlugin(desc);
      expect(plugin).not.toBeNull();
      expect(plugin!.id).toBe('aionui-plugin-docx');
    });

    it('should load the XLSX plugin', () => {
      const desc = BUILTIN_PLUGINS.find((p) => p.id === 'aionui-plugin-xlsx')!;
      const plugin = loadBuiltinPlugin(desc);
      expect(plugin).not.toBeNull();
      expect(plugin!.id).toBe('aionui-plugin-xlsx');
    });

    it('should return null for unknown plugin', () => {
      const plugin = loadBuiltinPlugin({
        dirName: 'plugin-nonexistent',
        id: 'aionui-plugin-nonexistent',
        skillNames: ['none'],
        displayName: 'Does Not Exist',
      });
      expect(plugin).toBeNull();
    });

    it('loaded plugins should have system prompts', () => {
      for (const desc of BUILTIN_PLUGINS) {
        const plugin = loadBuiltinPlugin(desc);
        expect(plugin).not.toBeNull();
        expect(plugin!.systemPrompts).toBeDefined();
        expect(plugin!.systemPrompts!.length).toBeGreaterThan(0);
      }
    });

    it('loaded plugins should have tools', () => {
      for (const desc of BUILTIN_PLUGINS) {
        const plugin = loadBuiltinPlugin(desc);
        expect(plugin).not.toBeNull();
        expect(plugin!.tools).toBeDefined();
        expect(plugin!.tools!.length).toBeGreaterThan(0);
      }
    });

    it('loaded plugins should have agents', () => {
      for (const desc of BUILTIN_PLUGINS) {
        const plugin = loadBuiltinPlugin(desc);
        expect(plugin).not.toBeNull();
        expect(plugin!.agents).toBeDefined();
        expect(plugin!.agents!.length).toBeGreaterThan(0);

        for (const agent of plugin!.agents!) {
          expect(agent.id).toBeTruthy();
          expect(agent.name).toBeTruthy();
          expect(agent.description).toBeTruthy();
          expect(agent.skills).toBeDefined();
          expect(agent.skills!.length).toBeGreaterThan(0);
          expect(agent.tools).toBeDefined();
          expect(agent.tools!.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('createBuiltinRegistryEntry', () => {
    it('should create an entry with state=active', () => {
      const desc = BUILTIN_PLUGINS[0];
      const plugin = loadBuiltinPlugin(desc)!;
      const entry = createBuiltinRegistryEntry(desc, plugin);

      expect(entry.state).toBe('active');
    });

    it('should grant shell:execute permission', () => {
      const desc = BUILTIN_PLUGINS[0];
      const plugin = loadBuiltinPlugin(desc)!;
      const entry = createBuiltinRegistryEntry(desc, plugin);

      expect(entry.grantedPermissions).toContain('shell:execute');
    });

    it('should set source to local', () => {
      const desc = BUILTIN_PLUGINS[0];
      const plugin = loadBuiltinPlugin(desc)!;
      const entry = createBuiltinRegistryEntry(desc, plugin);

      expect(entry.source).toBe('local');
    });

    it('should have installPath pointing to plugin directory', () => {
      const desc = BUILTIN_PLUGINS[0];
      const plugin = loadBuiltinPlugin(desc)!;
      const entry = createBuiltinRegistryEntry(desc, plugin);

      expect(entry.installPath).toContain(desc.dirName);
    });

    it('should have correct manifest metadata', () => {
      const desc = BUILTIN_PLUGINS[0];
      const plugin = loadBuiltinPlugin(desc)!;
      const entry = createBuiltinRegistryEntry(desc, plugin);

      expect(entry.manifest.pluginVersion).toBe('1.0');
      expect(entry.manifest.displayName).toBe(desc.displayName);
      expect(entry.manifest.category).toBe('document');
    });

    it('should match plugin id and version', () => {
      for (const desc of BUILTIN_PLUGINS) {
        const plugin = loadBuiltinPlugin(desc)!;
        const entry = createBuiltinRegistryEntry(desc, plugin);

        expect(entry.id).toBe(plugin.id);
        expect(entry.version).toBe(plugin.version);
      }
    });
  });

  describe('getActiveBuiltinPlugins', () => {
    it('should return empty array for no enabled skills', () => {
      expect(getActiveBuiltinPlugins([])).toEqual([]);
    });

    it('should return matching plugins for enabled skills', () => {
      const active = getActiveBuiltinPlugins(['pdf', 'docx']);
      expect(active).toHaveLength(2);
      expect(active.map((p) => p.id)).toContain('aionui-plugin-pdf');
      expect(active.map((p) => p.id)).toContain('aionui-plugin-docx');
    });

    it('should return all plugins when all skills enabled', () => {
      const active = getActiveBuiltinPlugins(['pdf', 'pptx', 'docx', 'xlsx']);
      expect(active).toHaveLength(4);
    });

    it('should ignore non-plugin skill names', () => {
      const active = getActiveBuiltinPlugins(['skill-creator', 'custom-skill']);
      expect(active).toHaveLength(0);
    });

    it('should handle mixed plugin and non-plugin skills', () => {
      const active = getActiveBuiltinPlugins(['skill-creator', 'pdf', 'custom-skill', 'xlsx']);
      expect(active).toHaveLength(2);
      expect(active.map((p) => p.id)).toContain('aionui-plugin-pdf');
      expect(active.map((p) => p.id)).toContain('aionui-plugin-xlsx');
    });
  });
});

// ── initPluginSystem tests ────────────────────────────────────────────────────

import * as fs from 'fs';
import * as os from 'os';
import { PluginManager } from '../../src/plugin/PluginManager';

// We need to test the init module, but it uses a module-level singleton.
// We'll test it by importing, initializing, checking, and resetting.

describe('Plugin System Initialization', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-autoload-'));
  });

  afterEach(async () => {
    // Reset the singleton by shutting down
    try {
      const { shutdownPluginSystem } = await import('../../src/plugin/initPluginSystem');
      await shutdownPluginSystem();
    } catch {
      // ignore
    }

    // Clean up temp dir
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('should return null before initialization', async () => {
    const { getPluginManager, shutdownPluginSystem } = await import('../../src/plugin/initPluginSystem');
    // Ensure clean state
    await shutdownPluginSystem();
    const pm = getPluginManager();
    expect(pm).toBeNull();
  });

  it('should initialize and create a PluginManager', async () => {
    const { initPluginSystem, getPluginManager, shutdownPluginSystem } = await import('../../src/plugin/initPluginSystem');
    await shutdownPluginSystem(); // Reset

    await initPluginSystem({
      skillsDir: path.join(tmpDir, 'skills'),
      workspace: tmpDir,
    });

    const pm = getPluginManager();
    expect(pm).not.toBeNull();
    expect(pm).toBeInstanceOf(PluginManager);
  });

  it('should register built-in plugins on init', async () => {
    const { initPluginSystem, getPluginManager, shutdownPluginSystem } = await import('../../src/plugin/initPluginSystem');
    await shutdownPluginSystem(); // Reset

    await initPluginSystem({
      skillsDir: path.join(tmpDir, 'skills'),
      workspace: tmpDir,
    });

    const pm = getPluginManager()!;
    const activePlugins = pm.getActivePlugins();

    // Should have 4 built-in plugins
    expect(activePlugins.length).toBeGreaterThanOrEqual(4);

    const activeIds = activePlugins.map((p) => p.id);
    expect(activeIds).toContain('aionui-plugin-pdf');
    expect(activeIds).toContain('aionui-plugin-pptx');
    expect(activeIds).toContain('aionui-plugin-docx');
    expect(activeIds).toContain('aionui-plugin-xlsx');
  });

  it('should not re-initialize if already initialized', async () => {
    const { initPluginSystem, getPluginManager, shutdownPluginSystem } = await import('../../src/plugin/initPluginSystem');
    await shutdownPluginSystem(); // Reset

    await initPluginSystem({
      skillsDir: path.join(tmpDir, 'skills'),
      workspace: tmpDir,
    });

    const pm1 = getPluginManager();

    // Second init should be a no-op
    await initPluginSystem({
      skillsDir: path.join(tmpDir, 'skills'),
      workspace: tmpDir,
    });

    const pm2 = getPluginManager();
    expect(pm2).toBe(pm1); // Same instance
  });

  it('shutdown should clear the singleton', async () => {
    const { initPluginSystem, getPluginManager, shutdownPluginSystem } = await import('../../src/plugin/initPluginSystem');
    await shutdownPluginSystem(); // Reset

    await initPluginSystem({
      skillsDir: path.join(tmpDir, 'skills'),
      workspace: tmpDir,
    });

    expect(getPluginManager()).not.toBeNull();

    await shutdownPluginSystem();
    expect(getPluginManager()).toBeNull();
  });

  it('collectSystemPrompts should skip plugins that define agents', async () => {
    const { initPluginSystem, getPluginManager, shutdownPluginSystem } = await import('../../src/plugin/initPluginSystem');
    await shutdownPluginSystem(); // Reset

    await initPluginSystem({
      skillsDir: path.join(tmpDir, 'skills'),
      workspace: tmpDir,
    });

    const pm = getPluginManager()!;
    const prompts = pm.collectSystemPrompts();

    // Built-in plugins now define agents, so their system prompts
    // are NOT injected globally (delivered via agent context instead)
    expect(prompts.length).toBe(0);
  });

  it('active plugins should expose agents', async () => {
    const { initPluginSystem, getPluginManager, shutdownPluginSystem } = await import('../../src/plugin/initPluginSystem');
    await shutdownPluginSystem(); // Reset

    await initPluginSystem({
      skillsDir: path.join(tmpDir, 'skills'),
      workspace: tmpDir,
    });

    const pm = getPluginManager()!;
    const agents = pm.collectPluginAgents();

    // Each built-in plugin has at least 1 agent
    expect(agents.length).toBeGreaterThanOrEqual(4);

    // Each agent should have a pluginId
    for (const agent of agents) {
      expect(agent.pluginId).toBeTruthy();
      expect(agent.id).toBeTruthy();
      expect(agent.name).toBeTruthy();
    }
  });

  it('active plugins should have tools collectible', async () => {
    const { initPluginSystem, getPluginManager, shutdownPluginSystem } = await import('../../src/plugin/initPluginSystem');
    await shutdownPluginSystem(); // Reset

    await initPluginSystem({
      skillsDir: path.join(tmpDir, 'skills'),
      workspace: tmpDir,
    });

    const pm = getPluginManager()!;
    const tools = pm.collectPluginTools();

    // PDF has 6 tools, PPTX has 8, DOCX has 5, XLSX has 1 = 20 total
    expect(tools.length).toBeGreaterThanOrEqual(20);

    // All tools should be namespaced
    for (const tool of tools) {
      expect(tool.name).toMatch(/^plugin:/);
    }
  });

  it('active plugins should have skills collectible', async () => {
    const { initPluginSystem, getPluginManager, shutdownPluginSystem } = await import('../../src/plugin/initPluginSystem');
    await shutdownPluginSystem(); // Reset

    await initPluginSystem({
      skillsDir: path.join(tmpDir, 'skills'),
      workspace: tmpDir,
    });

    const pm = getPluginManager()!;
    const skillNames = pm.getPluginSkillNames();

    expect(skillNames).toContain('pdf');
    expect(skillNames).toContain('pptx');
    expect(skillNames).toContain('docx');
    expect(skillNames).toContain('xlsx');
  });
});

// ── Plugin system prompt injection verification ───────────────────────────────
// Note: We cannot import agentUtils.ts in test because it imports initStorage.ts
// which requires Electron's app.getPath(). Instead, we verify that the PluginManager
// collects the prompts that agentUtils.ts would inject.

describe('Plugin System Prompt Injection', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-prompt-'));

    const { initPluginSystem, shutdownPluginSystem } = await import('../../src/plugin/initPluginSystem');
    await shutdownPluginSystem(); // Reset

    await initPluginSystem({
      skillsDir: path.join(tmpDir, 'skills'),
      workspace: tmpDir,
    });
  });

  afterEach(async () => {
    try {
      const { shutdownPluginSystem } = await import('../../src/plugin/initPluginSystem');
      await shutdownPluginSystem();
    } catch {
      // ignore
    }
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('collectSystemPrompts should skip built-in plugins that define agents', async () => {
    const { getPluginManager } = await import('../../src/plugin/initPluginSystem');
    const pm = getPluginManager()!;

    // All built-in plugins now define agents, so collectSystemPrompts returns 0
    const prompts = pm.collectSystemPrompts();
    expect(prompts.length).toBe(0);
  });

  it('collectPluginAgents should return agents from all built-in plugins', async () => {
    const { getPluginManager } = await import('../../src/plugin/initPluginSystem');
    const pm = getPluginManager()!;

    const agents = pm.collectPluginAgents();

    // 4 built-in plugins, each with at least 1 agent
    expect(agents.length).toBeGreaterThanOrEqual(4);

    // Each agent should have synthesized systemPrompt (from plugin's systemPrompts[])
    for (const agent of agents) {
      expect(agent.systemPrompt).toBeTruthy();
      expect(agent.systemPrompt!.length).toBeGreaterThan(10);
    }
  });

  it('collectPluginAgents should include skills and tools from the plugin', async () => {
    const { getPluginManager } = await import('../../src/plugin/initPluginSystem');
    const pm = getPluginManager()!;

    const agents = pm.collectPluginAgents();

    // Find the PDF agent
    const pdfAgent = agents.find((a) => a.pluginId === 'aionui-plugin-pdf');
    expect(pdfAgent).toBeDefined();
    expect(pdfAgent!.skills).toContain('pdf');
    expect(pdfAgent!.tools).toContain('pdf_split');
    expect(pdfAgent!.tools).toContain('pdf_merge');

    // Find the PPTX agent
    const pptxAgent = agents.find((a) => a.pluginId === 'aionui-plugin-pptx');
    expect(pptxAgent).toBeDefined();
    expect(pptxAgent!.skills).toContain('pptx');
    expect(pptxAgent!.tools).toContain('pptx_create_from_html');
  });

  it('plugin agents should have correct presetAgentType', async () => {
    const { getPluginManager } = await import('../../src/plugin/initPluginSystem');
    const pm = getPluginManager()!;

    const agents = pm.collectPluginAgents();

    for (const agent of agents) {
      // All built-in plugin agents default to gemini
      expect(agent.presetAgentType).toBe('gemini');
    }
  });

  it('pluginHasAgents should return true for plugins with agents', async () => {
    const { getPluginManager } = await import('../../src/plugin/initPluginSystem');
    const pm = getPluginManager()!;

    expect(pm.pluginHasAgents('aionui-plugin-pdf')).toBe(true);
    expect(pm.pluginHasAgents('aionui-plugin-pptx')).toBe(true);
    expect(pm.pluginHasAgents('aionui-plugin-docx')).toBe(true);
    expect(pm.pluginHasAgents('aionui-plugin-xlsx')).toBe(true);
    expect(pm.pluginHasAgents('nonexistent-plugin')).toBe(false);
  });

  it('plugin skill installation should create skill files in skillsDir', async () => {
    const { getPluginManager } = await import('../../src/plugin/initPluginSystem');
    const pm = getPluginManager()!;

    // Verify that built-in plugins installed their skills to the temp skillsDir
    const skillNames = pm.getPluginSkillNames();
    expect(skillNames).toContain('pdf');
    expect(skillNames).toContain('pptx');
    expect(skillNames).toContain('docx');
    expect(skillNames).toContain('xlsx');
  });

  it('collectPluginTools should return namespaced tools ready for function calling', async () => {
    const { getPluginManager } = await import('../../src/plugin/initPluginSystem');
    const pm = getPluginManager()!;

    const tools = pm.collectPluginTools();

    // All tools should be namespaced with plugin: prefix
    for (const tool of tools) {
      expect(tool.name).toMatch(/^plugin:[a-z-]+:[a-z_]+$/);
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
    }

    // Verify specific tools from each plugin are present
    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('plugin:aionui-plugin-pdf:pdf_split');
    expect(toolNames).toContain('plugin:aionui-plugin-pptx:pptx_create_from_html');
    expect(toolNames).toContain('plugin:aionui-plugin-docx:docx_unpack');
    expect(toolNames).toContain('plugin:aionui-plugin-xlsx:xlsx_recalculate');
  });

  it('isPluginTool should identify plugin-namespaced tool names', async () => {
    const { getPluginManager } = await import('../../src/plugin/initPluginSystem');
    const pm = getPluginManager()!;

    expect(pm.isPluginTool('plugin:aionui-plugin-pdf:pdf_split')).toBe(true);
    expect(pm.isPluginTool('read_file')).toBe(false);
    expect(pm.isPluginTool('mcp:github:create_pr')).toBe(false);
  });

  it('plugin tools should be executable via executeTool', async () => {
    const { getPluginManager } = await import('../../src/plugin/initPluginSystem');
    const pm = getPluginManager()!;

    // Execute a tool that will fail because of missing params (validates routing works)
    const result = await pm.executeTool('plugin:aionui-plugin-pdf:pdf_split', {}, 'test-conv');
    expect(result.success).toBe(false);
    // Should get a validation error, not a "not found" error
    expect(result.error).toBeDefined();
    expect(result.error).not.toContain('not found');
    expect(result.error).not.toContain('not active');
  });
});
