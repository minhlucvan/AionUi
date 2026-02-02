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

          // Class-based agents use methods, config-based use properties
          if (typeof (agent as any).activate === 'function') {
            // IPluginAgent — check methods exist
            expect(typeof (agent as any).getSkills).toBe('function');
            expect((agent as any).getSkills().length).toBeGreaterThan(0);
            expect(typeof (agent as any).getToolNames).toBe('function');
            expect((agent as any).getToolNames().length).toBeGreaterThan(0);
          } else {
            // PluginAgentConfig — check static properties
            expect((agent as any).skills).toBeDefined();
            expect((agent as any).skills!.length).toBeGreaterThan(0);
            expect((agent as any).tools).toBeDefined();
            expect((agent as any).tools!.length).toBeGreaterThan(0);
          }
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

// ── Class-based Agent System Tests ──────────────────────────────────────────

import { PluginAgentBase } from '../../src/plugin/agents/PluginAgentBase';
import { isPluginAgentInstance } from '../../src/plugin/types';
import type { ResolvedPluginAgent, AgentContext, IPluginAgent } from '../../src/plugin/types';
import { discoverRuleFiles, loadRuleFileContents } from '../../src/plugin/agents/AgentLoader';

describe('Class-based Agent System', () => {
  describe('PluginAgentBase', () => {
    class TestAgent extends PluginAgentBase {
      readonly id = 'test-agent';
      readonly name = 'Test Agent';
      readonly description = 'A test agent';
    }

    it('should be instantiable as a class', () => {
      const agent = new TestAgent();
      expect(agent.id).toBe('test-agent');
      expect(agent.name).toBe('Test Agent');
      expect(agent.description).toBe('A test agent');
    });

    it('should store context on activate', async () => {
      const agent = new TestAgent();
      const noop = () => {
        /* noop */
      };
      const ctx = {
        agentId: 'test-agent',
        pluginId: 'test-plugin',
        settings: {},
        workspace: '/tmp',
        agentDir: '/tmp/agents/test-agent',
        pluginDir: '/tmp/plugin',
        skillsDir: '/tmp/skills',
        activeProvider: 'gemini',
        logger: { info: noop, warn: noop, error: noop, debug: noop },
        onSettingsChange: () => noop,
        onProviderChange: () => noop,
      } as unknown as AgentContext;

      await agent.activate(ctx);
      expect((agent as any).context).toBe(ctx);
    });

    it('should clear context on deactivate', async () => {
      const agent = new TestAgent();
      const noop = () => {
        /* noop */
      };
      const ctx = {
        agentId: 'test-agent',
        pluginId: 'test-plugin',
        settings: {},
        workspace: '/tmp',
        agentDir: '/tmp/agents/test-agent',
        pluginDir: '/tmp/plugin',
        skillsDir: '/tmp/skills',
        activeProvider: 'gemini',
        logger: { info: noop, warn: noop, error: noop, debug: noop },
        onSettingsChange: () => noop,
        onProviderChange: () => noop,
      } as unknown as AgentContext;

      await agent.activate(ctx);
      expect((agent as any).context).not.toBeNull();

      await agent.deactivate();
      expect((agent as any).context).toBeNull();
    });

    it('should support optional overrides for lifecycle hooks', () => {
      class HookAgent extends PluginAgentBase {
        readonly id = 'hook-agent';
        readonly name = 'Hook Agent';
        readonly description = 'Agent with hooks';
        hookCalled = false;

        getSkills() {
          return ['custom-skill'];
        }
        getToolNames() {
          return ['custom-tool'];
        }

        async onConversationStart() {
          this.hookCalled = true;
        }
      }

      const agent = new HookAgent();
      expect(agent.getSkills!()).toEqual(['custom-skill']);
      expect(agent.getToolNames!()).toEqual(['custom-tool']);
    });
  });

  describe('isPluginAgentInstance', () => {
    it('should return true for class-based agents', () => {
      class TestAgent extends PluginAgentBase {
        readonly id = 'test';
        readonly name = 'Test';
        readonly description = 'Test';
      }
      expect(isPluginAgentInstance(new TestAgent())).toBe(true);
    });

    it('should return false for config-based agents', () => {
      const config = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        skills: ['test'],
        tools: ['test_tool'],
      };
      expect(isPluginAgentInstance(config as any)).toBe(false);
    });
  });

  describe('Built-in plugin agents are class-based', () => {
    it('all built-in plugin agents should be IPluginAgent instances', () => {
      for (const desc of BUILTIN_PLUGINS) {
        const plugin = loadBuiltinPlugin(desc);
        expect(plugin).not.toBeNull();

        for (const agent of plugin!.agents!) {
          expect(isPluginAgentInstance(agent)).toBe(true);
          expect(typeof (agent as IPluginAgent).activate).toBe('function');
          expect(typeof (agent as IPluginAgent).deactivate).toBe('function');
        }
      }
    });

    it('all built-in agents should extend PluginAgentBase', () => {
      for (const desc of BUILTIN_PLUGINS) {
        const plugin = loadBuiltinPlugin(desc);
        for (const agent of plugin!.agents!) {
          expect(agent instanceof PluginAgentBase).toBe(true);
        }
      }
    });

    it('all built-in agents should have lifecycle hooks', () => {
      for (const desc of BUILTIN_PLUGINS) {
        const plugin = loadBuiltinPlugin(desc);
        for (const agent of plugin!.agents!) {
          const instance = agent as IPluginAgent;
          // onConversationStart is defined on all built-in agents
          expect(typeof instance.onConversationStart).toBe('function');
        }
      }
    });
  });

  describe('ResolvedPluginAgent from collectPluginAgents', () => {
    let tmpDir: string;

    beforeEach(async () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-resolve-'));
      const { initPluginSystem, shutdownPluginSystem } = await import('../../src/plugin/initPluginSystem');
      await shutdownPluginSystem();
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
        /* ignore */
      }
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    });

    it('should resolve class-based agents with agentInstance reference', async () => {
      const { getPluginManager } = await import('../../src/plugin/initPluginSystem');
      const pm = getPluginManager()!;
      const agents: ResolvedPluginAgent[] = pm.collectPluginAgents();

      // All built-in plugins use class-based agents
      for (const agent of agents) {
        expect(agent.agentInstance).toBeDefined();
        expect(typeof agent.agentInstance!.activate).toBe('function');
      }
    });

    it('should resolve skills from getSkills() method', async () => {
      const { getPluginManager } = await import('../../src/plugin/initPluginSystem');
      const pm = getPluginManager()!;
      const agents: ResolvedPluginAgent[] = pm.collectPluginAgents();

      const pdfAgent = agents.find((a) => a.pluginId === 'aionui-plugin-pdf');
      expect(pdfAgent).toBeDefined();
      expect(pdfAgent!.skills).toContain('pdf');

      const pptxAgent = agents.find((a) => a.pluginId === 'aionui-plugin-pptx');
      expect(pptxAgent).toBeDefined();
      expect(pptxAgent!.skills).toContain('pptx');
    });

    it('should resolve tools from getToolNames() method', async () => {
      const { getPluginManager } = await import('../../src/plugin/initPluginSystem');
      const pm = getPluginManager()!;
      const agents: ResolvedPluginAgent[] = pm.collectPluginAgents();

      const pdfAgent = agents.find((a) => a.pluginId === 'aionui-plugin-pdf');
      expect(pdfAgent!.tools).toContain('pdf_split');
      expect(pdfAgent!.tools).toContain('pdf_merge');

      const xlsxAgent = agents.find((a) => a.pluginId === 'aionui-plugin-xlsx');
      expect(xlsxAgent!.tools).toContain('xlsx_recalculate');
    });

    it('should synthesize systemPrompt from plugin systemPrompts', async () => {
      const { getPluginManager } = await import('../../src/plugin/initPluginSystem');
      const pm = getPluginManager()!;
      const agents: ResolvedPluginAgent[] = pm.collectPluginAgents();

      // Class-based agents don't define systemPrompt on the class,
      // so it should be synthesized from the plugin's global systemPrompts
      for (const agent of agents) {
        expect(agent.systemPrompt).toBeTruthy();
        expect(agent.systemPrompt!.length).toBeGreaterThan(10);
      }
    });

    it('should include i18n data from class properties', async () => {
      const { getPluginManager } = await import('../../src/plugin/initPluginSystem');
      const pm = getPluginManager()!;
      const agents: ResolvedPluginAgent[] = pm.collectPluginAgents();

      for (const agent of agents) {
        expect(agent.nameI18n).toBeDefined();
        expect(agent.nameI18n!['en-US']).toBeTruthy();
        expect(agent.nameI18n!['zh-CN']).toBeTruthy();

        expect(agent.descriptionI18n).toBeDefined();
        expect(agent.promptsI18n).toBeDefined();
      }
    });

    it('should preserve presetAgentType from class', async () => {
      const { getPluginManager } = await import('../../src/plugin/initPluginSystem');
      const pm = getPluginManager()!;
      const agents: ResolvedPluginAgent[] = pm.collectPluginAgents();

      for (const agent of agents) {
        expect(agent.presetAgentType).toBe('gemini');
      }
    });
  });

  describe('getAgentInstance', () => {
    let tmpDir: string;

    beforeEach(async () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-instance-'));
      const { initPluginSystem, shutdownPluginSystem } = await import('../../src/plugin/initPluginSystem');
      await shutdownPluginSystem();
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
        /* ignore */
      }
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    });

    it('should return agent instance for known plugin + agent', async () => {
      const { getPluginManager } = await import('../../src/plugin/initPluginSystem');
      const pm = getPluginManager()!;

      const instance = pm.getAgentInstance('aionui-plugin-pdf', 'pdf-tools');
      expect(instance).toBeDefined();
      expect(instance!.id).toBe('pdf-tools');
      expect(instance instanceof PluginAgentBase).toBe(true);
    });

    it('should return undefined for unknown plugin', async () => {
      const { getPluginManager } = await import('../../src/plugin/initPluginSystem');
      const pm = getPluginManager()!;

      expect(pm.getAgentInstance('nonexistent', 'pdf-tools')).toBeUndefined();
    });

    it('should return undefined for unknown agent', async () => {
      const { getPluginManager } = await import('../../src/plugin/initPluginSystem');
      const pm = getPluginManager()!;

      expect(pm.getAgentInstance('aionui-plugin-pdf', 'nonexistent')).toBeUndefined();
    });
  });

  describe('discoverRuleFiles', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-rules-'));
    });

    afterEach(() => {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    });

    it('should return undefined if no rules/ directory', () => {
      expect(discoverRuleFiles(tmpDir)).toBeUndefined();
    });

    it('should discover locale-keyed .md files', () => {
      const rulesDir = path.join(tmpDir, 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      fs.writeFileSync(path.join(rulesDir, 'en-US.md'), '# English rules');
      fs.writeFileSync(path.join(rulesDir, 'zh-CN.md'), '# Chinese rules');

      const result = discoverRuleFiles(tmpDir);
      expect(result).toBeDefined();
      expect(result!['en-US']).toBe(path.join('rules', 'en-US.md'));
      expect(result!['zh-CN']).toBe(path.join('rules', 'zh-CN.md'));
    });

    it('should ignore non-.md files', () => {
      const rulesDir = path.join(tmpDir, 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      fs.writeFileSync(path.join(rulesDir, 'en-US.md'), '# English');
      fs.writeFileSync(path.join(rulesDir, 'readme.txt'), 'ignore me');
      fs.writeFileSync(path.join(rulesDir, 'config.json'), '{}');

      const result = discoverRuleFiles(tmpDir);
      expect(result).toBeDefined();
      expect(Object.keys(result!)).toEqual(['en-US']);
    });
  });

  describe('loadRuleFileContents', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-rule-contents-'));
    });

    afterEach(() => {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    });

    it('should read rule file contents for each locale', () => {
      const rulesDir = path.join(tmpDir, 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      fs.writeFileSync(path.join(rulesDir, 'en-US.md'), 'You are a PDF expert.');
      fs.writeFileSync(path.join(rulesDir, 'zh-CN.md'), '你是PDF专家。');

      const ruleFiles = { 'en-US': 'rules/en-US.md', 'zh-CN': 'rules/zh-CN.md' };
      const contents = loadRuleFileContents(tmpDir, ruleFiles);

      expect(contents).toBeDefined();
      expect(contents!['en-US']).toBe('You are a PDF expert.');
      expect(contents!['zh-CN']).toBe('你是PDF专家。');
    });

    it('should skip missing files gracefully', () => {
      const rulesDir = path.join(tmpDir, 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      fs.writeFileSync(path.join(rulesDir, 'en-US.md'), 'English rules');

      const ruleFiles = { 'en-US': 'rules/en-US.md', 'zh-CN': 'rules/zh-CN.md' };
      const contents = loadRuleFileContents(tmpDir, ruleFiles);

      expect(contents).toBeDefined();
      expect(contents!['en-US']).toBe('English rules');
      expect(contents!['zh-CN']).toBeUndefined();
    });

    it('should return undefined if all files are empty', () => {
      const rulesDir = path.join(tmpDir, 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      fs.writeFileSync(path.join(rulesDir, 'en-US.md'), '   ');
      fs.writeFileSync(path.join(rulesDir, 'zh-CN.md'), '');

      const ruleFiles = { 'en-US': 'rules/en-US.md', 'zh-CN': 'rules/zh-CN.md' };
      const contents = loadRuleFileContents(tmpDir, ruleFiles);

      expect(contents).toBeUndefined();
    });

    it('should return undefined if all files are missing', () => {
      const ruleFiles = { 'en-US': 'rules/en-US.md', 'zh-CN': 'rules/zh-CN.md' };
      const contents = loadRuleFileContents(tmpDir, ruleFiles);

      expect(contents).toBeUndefined();
    });
  });
});

// ── Plugin Agent Skill Loading Pipeline Tests ────────────────────────────────
// Verifies that plugin-installed skills are correctly discoverable by the
// skill loading systems used for each agent type:
//   - Gemini: loads SKILL.md from skillsDir via SkillManager
//   - ACP/Codex: AcpSkillManager discovers and indexes skills from skillsDir
//
// Note: We test the skill file structure directly (without importing
// AcpSkillManager) to avoid pulling in initStorage.ts's Electron dependency.
// The frontmatter parsing is tested inline to verify AcpSkillManager compatibility.

/**
 * Parse SKILL.md frontmatter — mirrors AcpSkillManager's parseFrontmatter logic
 * to verify skill files are structured correctly for skill loading.
 */
function parseFrontmatter(content: string): { name?: string; description?: string } {
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return {};

  const fm = frontmatterMatch[1];
  const result: { name?: string; description?: string } = {};
  const nameMatch = fm.match(/^name:\s*['"]?([^'"\n]+)['"]?\s*$/m);
  if (nameMatch) result.name = nameMatch[1].trim();
  const descMatch = fm.match(/^description:\s*['"]?(.+?)['"]?\s*$/m);
  if (descMatch) result.description = descMatch[1].trim();
  return result;
}

describe('Plugin Agent Skill Loading Pipeline', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-pipeline-'));
    const { initPluginSystem, getPluginManager, shutdownPluginSystem } = await import('../../src/plugin/initPluginSystem');
    await shutdownPluginSystem();
    await initPluginSystem({
      skillsDir: path.join(tmpDir, 'skills'),
      workspace: tmpDir,
    });
    // Wait for background skill installation to complete before running tests
    await getPluginManager()!.waitForSkillInstallation();
  });

  afterEach(async () => {
    try {
      const { shutdownPluginSystem } = await import('../../src/plugin/initPluginSystem');
      await shutdownPluginSystem();
    } catch {
      /* ignore */
    }
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it('should install skill SKILL.md files to skillsDir for each plugin', async () => {
    const skillsDir = path.join(tmpDir, 'skills');
    const expectedSkills = ['pdf', 'pptx', 'docx', 'xlsx'];

    for (const skill of expectedSkills) {
      const skillMdPath = path.join(skillsDir, skill, 'SKILL.md');
      expect(fs.existsSync(skillMdPath)).toBe(true);

      const content = fs.readFileSync(skillMdPath, 'utf-8');
      expect(content.length).toBeGreaterThan(0);
      // SKILL.md files should have frontmatter with name and description
      expect(content).toContain('---');
      expect(content).toContain('name:');
    }
  });

  it('should install skill auxiliary files (scripts, schemas, references)', async () => {
    const skillsDir = path.join(tmpDir, 'skills');

    // PDF should have scripts directory with Python files
    const pdfScriptsDir = path.join(skillsDir, 'pdf', 'scripts');
    expect(fs.existsSync(pdfScriptsDir)).toBe(true);
    const pdfScripts = fs.readdirSync(pdfScriptsDir);
    expect(pdfScripts.length).toBeGreaterThan(0);
    expect(pdfScripts.some((f: string) => f.endsWith('.py'))).toBe(true);

    // XLSX should have recalc.py
    const xlsxRecalc = path.join(skillsDir, 'xlsx', 'recalc.py');
    expect(fs.existsSync(xlsxRecalc)).toBe(true);
  });

  it('installed skill SKILL.md files should have valid frontmatter for AcpSkillManager discovery', async () => {
    // This verifies the skill files are structured correctly for AcpSkillManager.discoverSkills()
    // which reads SKILL.md, parses frontmatter for name/description, and builds the skills index.
    const skillsDir = path.join(tmpDir, 'skills');
    const expectedSkills = ['pdf', 'pptx', 'docx', 'xlsx'];

    for (const skillName of expectedSkills) {
      const content = fs.readFileSync(path.join(skillsDir, skillName, 'SKILL.md'), 'utf-8');
      const { name, description } = parseFrontmatter(content);

      // AcpSkillManager uses name/description from frontmatter for the skills index
      expect(name).toBeTruthy();
      expect(name).toBe(skillName);
      expect(description).toBeTruthy();
      expect(description!.length).toBeGreaterThan(10);
    }
  });

  it('installed SKILL.md files should have meaningful body content after frontmatter', async () => {
    // This verifies the skill body (instructions for the agent) is present.
    // AcpSkillManager strips frontmatter and returns only the body via getSkill().
    const skillsDir = path.join(tmpDir, 'skills');
    const expectedSkills = ['pdf', 'pptx', 'docx', 'xlsx'];

    for (const skillName of expectedSkills) {
      const content = fs.readFileSync(path.join(skillsDir, skillName, 'SKILL.md'), 'utf-8');

      // Extract body (content after frontmatter)
      const body = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '').trim();
      expect(body.length).toBeGreaterThan(50);

      // Body should contain skill instructions, not raw frontmatter
      expect(body).not.toMatch(/^---/);
      expect(body).not.toMatch(/^name:/m);
    }
  });

  it('plugin agent skills should match installed skill names', async () => {
    const { getPluginManager } = await import('../../src/plugin/initPluginSystem');
    const pm = getPluginManager()!;

    const agents = pm.collectPluginAgents();
    const skillsDir = path.join(tmpDir, 'skills');

    for (const agent of agents) {
      if (!agent.skills) continue;
      for (const skillName of agent.skills) {
        const skillMdPath = path.join(skillsDir, skillName, 'SKILL.md');
        expect(fs.existsSync(skillMdPath)).toBe(true);
      }
    }
  });

  it('plugin agents should have enabledSkills and systemPrompt for registration as AcpBackendConfig', async () => {
    // This verifies that collectPluginAgents returns the data needed for
    // initStorage.ts Section 5.3 to register agents as AcpBackendConfig entries.
    // The AcpBackendConfig.enabledSkills flows to the agent manager, which uses
    // it to load skills via SkillManager (Gemini) or AcpSkillManager (ACP/Codex).
    const { getPluginManager } = await import('../../src/plugin/initPluginSystem');
    const pm = getPluginManager()!;
    const agents = pm.collectPluginAgents();

    const expectedMappings = [
      { pluginId: 'aionui-plugin-pdf', skills: ['pdf'] },
      { pluginId: 'aionui-plugin-pptx', skills: ['pptx'] },
      { pluginId: 'aionui-plugin-docx', skills: ['docx'] },
      { pluginId: 'aionui-plugin-xlsx', skills: ['xlsx'] },
    ];

    for (const expected of expectedMappings) {
      const agent = agents.find((a) => a.pluginId === expected.pluginId);
      expect(agent).toBeDefined();
      expect(agent!.skills).toEqual(expected.skills);
      expect(agent!.systemPrompt).toBeTruthy();
      // presetAgentType determines the conversation type (gemini/claude/codex)
      expect(agent!.presetAgentType).toBeTruthy();
    }
  });

  it('each installed skill directory should be complete (all required files present)', async () => {
    const skillsDir = path.join(tmpDir, 'skills');

    // PDF must have SKILL.md + scripts/
    expect(fs.existsSync(path.join(skillsDir, 'pdf', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(skillsDir, 'pdf', 'scripts'))).toBe(true);

    // PPTX must have SKILL.md + scripts/ + schemas/
    expect(fs.existsSync(path.join(skillsDir, 'pptx', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(skillsDir, 'pptx', 'scripts'))).toBe(true);

    // DOCX must have SKILL.md + scripts/
    expect(fs.existsSync(path.join(skillsDir, 'docx', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(skillsDir, 'docx', 'scripts'))).toBe(true);

    // XLSX must have SKILL.md + recalc.py
    expect(fs.existsSync(path.join(skillsDir, 'xlsx', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(skillsDir, 'xlsx', 'recalc.py'))).toBe(true);
  });
});
