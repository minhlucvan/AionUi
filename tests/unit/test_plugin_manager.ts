/**
 * Tests for PluginManager core capabilities.
 *
 * Validates the central orchestrator logic:
 *   - System prompt collection (provider filtering, priority ordering)
 *   - Skill collection and skill name extraction
 *   - Tool collection (provider filtering, namespacing)
 *   - Tool execution (routing, context building, error handling)
 *   - MCP server collection (path resolution for bundled servers)
 *   - Hook execution (before message, after response)
 *   - Plugin tool name detection
 */

import { describe, it, expect, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PluginManager } from '../../src/plugin/PluginManager';
import type { AionPlugin, PluginRegistryEntry, ToolResult } from '../../src/plugin/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-test-'));
}

function createManager(
  overrides?: Partial<{
    pluginsDir: string;
    registryPath: string;
    skillsDir: string;
    workspace: string;
  }>
) {
  const tmpDir = createTempDir();
  return {
    manager: new PluginManager({
      pluginsDir: overrides?.pluginsDir ?? path.join(tmpDir, 'plugins'),
      registryPath: overrides?.registryPath ?? path.join(tmpDir, 'registry.json'),
      hostVersion: '1.7.0',
      workspace: overrides?.workspace ?? path.join(tmpDir, 'workspace'),
      skillsDir: overrides?.skillsDir ?? path.join(tmpDir, 'skills'),
    }),
    tmpDir,
  };
}

/** Create a mock plugin for testing */
function mockPlugin(overrides?: Partial<AionPlugin>): AionPlugin {
  return {
    id: 'test-plugin',
    version: '1.0.0',
    activate: () => {},
    ...overrides,
  };
}

/** Inject an active plugin into the manager (bypasses install/load flow) */
function injectActivePlugin(manager: PluginManager, plugin: AionPlugin, entryOverrides?: Partial<PluginRegistryEntry>) {
  const entry: PluginRegistryEntry = {
    id: plugin.id,
    version: plugin.version,
    source: 'local',
    sourceRef: '/fake/path',
    installPath: '/fake/install/path',
    manifest: {
      pluginVersion: '1.0',
      displayName: plugin.id,
      description: 'test',
    },
    state: 'active',
    grantedPermissions: ['shell:execute'],
    settings: {},
    installedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...entryOverrides,
  };

  // Access private map through the exposed activatePlugin flow isn't possible
  // without the loader, so we use a direct approach via type assertion
  const mgr = manager as any;
  mgr.registry.set(entry.id, entry);
  mgr.activePlugins.set(entry.id, {
    entry,
    instance: plugin,
    context: {
      pluginId: entry.id,
      settings: entry.settings,
      workspace: mgr.config.workspace,
      pluginDir: entry.installPath,
      logger: mgr.createPluginLogger(entry.id),
      activeProvider: 'gemini',
      skillsDir: mgr.config.skillsDir,
      onSettingsChange: () => () => {},
      onProviderChange: () => () => {},
      exec: async (cmd: string) => ({ stdout: `ran: ${cmd}`, stderr: '', exitCode: 0 }),
    },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PluginManager', () => {
  let tmpDirs: string[] = [];

  afterEach(() => {
    // Clean up temp directories
    for (const dir of tmpDirs) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
    tmpDirs = [];
  });

  function tracked() {
    const result = createManager();
    tmpDirs.push(result.tmpDir);
    return result;
  }

  // ── System Prompt Collection ──────────────────────────────────────────

  describe('collectSystemPrompts', () => {
    it('should return empty array when no plugins active', () => {
      const { manager } = tracked();
      expect(manager.collectSystemPrompts()).toEqual([]);
    });

    it('should collect prompts from active plugin', () => {
      const { manager } = tracked();
      const plugin = mockPlugin({
        id: 'prompt-plugin',
        systemPrompts: [{ content: 'You can do PDF operations.' }],
      });
      injectActivePlugin(manager, plugin);

      const prompts = manager.collectSystemPrompts();
      expect(prompts).toHaveLength(1);
      expect(prompts[0]).toBe('You can do PDF operations.');
    });

    it('should sort prompts by priority (lower first)', () => {
      const { manager } = tracked();

      injectActivePlugin(
        manager,
        mockPlugin({
          id: 'plugin-a',
          systemPrompts: [{ content: 'A prompt', priority: 200 }],
        })
      );
      injectActivePlugin(
        manager,
        mockPlugin({
          id: 'plugin-b',
          systemPrompts: [{ content: 'B prompt', priority: 10 }],
        })
      );

      const prompts = manager.collectSystemPrompts();
      expect(prompts[0]).toBe('B prompt');
      expect(prompts[1]).toBe('A prompt');
    });

    it('should filter prompts by provider', () => {
      const { manager } = tracked();
      manager.setActiveProvider('gemini');

      injectActivePlugin(
        manager,
        mockPlugin({
          id: 'filter-plugin',
          systemPrompts: [{ content: 'All providers' }, { content: 'Gemini only', providers: ['gemini'] }, { content: 'Claude only', providers: ['claude'] }],
        })
      );

      const prompts = manager.collectSystemPrompts('gemini');
      expect(prompts).toHaveLength(2);
      expect(prompts).toContain('All providers');
      expect(prompts).toContain('Gemini only');
      expect(prompts).not.toContain('Claude only');
    });
  });

  // ── Skill Collection ──────────────────────────────────────────────────

  describe('collectPluginSkills', () => {
    it('should return empty array when no plugins active', () => {
      const { manager } = tracked();
      expect(manager.collectPluginSkills()).toEqual([]);
    });

    it('should collect skills from active plugins', () => {
      const { manager } = tracked();
      injectActivePlugin(
        manager,
        mockPlugin({
          id: 'pdf-plugin',
          skills: [{ name: 'pdf', description: 'PDF tools' }],
        })
      );
      injectActivePlugin(
        manager,
        mockPlugin({
          id: 'docx-plugin',
          skills: [{ name: 'docx', description: 'Word tools' }],
        })
      );

      const skills = manager.collectPluginSkills();
      expect(skills).toHaveLength(2);
      expect(skills.map((s) => s.name)).toEqual(['pdf', 'docx']);
    });
  });

  describe('getPluginSkillNames', () => {
    it('should return skill names from active plugins', () => {
      const { manager } = tracked();
      injectActivePlugin(
        manager,
        mockPlugin({
          id: 'multi-skill-plugin',
          skills: [
            { name: 'pdf', description: 'PDF tools' },
            { name: 'xlsx', description: 'Excel tools' },
          ],
        })
      );

      expect(manager.getPluginSkillNames()).toEqual(['pdf', 'xlsx']);
    });
  });

  // ── Tool Collection ───────────────────────────────────────────────────

  describe('collectPluginTools', () => {
    it('should return empty array when no plugins active', () => {
      const { manager } = tracked();
      expect(manager.collectPluginTools()).toEqual([]);
    });

    it('should namespace tool names as plugin:id:name', () => {
      const { manager } = tracked();
      const handler = async () => ({ success: true }) as ToolResult;

      injectActivePlugin(
        manager,
        mockPlugin({
          id: 'pdf-plugin',
          tools: [
            {
              name: 'pdf_split',
              description: 'Split PDF',
              inputSchema: { type: 'object' },
              handler,
            },
          ],
        })
      );

      const tools = manager.collectPluginTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('plugin:pdf-plugin:pdf_split');
    });

    it('should filter tools by provider', () => {
      const { manager } = tracked();
      const handler = async () => ({ success: true }) as ToolResult;

      injectActivePlugin(
        manager,
        mockPlugin({
          id: 'multi-tool',
          tools: [
            { name: 'tool_all', description: 'All', inputSchema: {}, handler },
            { name: 'tool_gemini', description: 'Gemini', inputSchema: {}, handler, providers: ['gemini'] },
            { name: 'tool_claude', description: 'Claude', inputSchema: {}, handler, providers: ['claude'] },
          ],
        })
      );

      const tools = manager.collectPluginTools('gemini');
      expect(tools).toHaveLength(2);
      expect(tools.map((t) => t.name)).toContain('plugin:multi-tool:tool_all');
      expect(tools.map((t) => t.name)).toContain('plugin:multi-tool:tool_gemini');
    });
  });

  // ── Tool Execution ────────────────────────────────────────────────────

  describe('executeTool', () => {
    it('should reject invalid tool name format', async () => {
      const { manager } = tracked();
      const result = await manager.executeTool('invalid_name', {}, 'conv-1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid plugin tool name');
    });

    it('should reject if plugin not active', async () => {
      const { manager } = tracked();
      const result = await manager.executeTool('plugin:unknown:some_tool', {}, 'conv-1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not active');
    });

    it('should reject if tool not found in plugin', async () => {
      const { manager } = tracked();
      injectActivePlugin(manager, mockPlugin({ id: 'test-plugin' }));

      const result = await manager.executeTool('plugin:test-plugin:nonexistent', {}, 'conv-1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should execute tool handler and return result', async () => {
      const { manager } = tracked();
      const handler = async (params: Record<string, unknown>) =>
        ({
          success: true,
          data: { echo: params.message },
        }) as ToolResult;

      injectActivePlugin(
        manager,
        mockPlugin({
          id: 'echo-plugin',
          tools: [
            {
              name: 'echo',
              description: 'Echo back',
              inputSchema: { type: 'object', properties: { message: { type: 'string' } } },
              handler,
            },
          ],
        })
      );

      const result = await manager.executeTool('plugin:echo-plugin:echo', { message: 'hello' }, 'conv-1');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ echo: 'hello' });
    });

    it('should catch tool handler errors', async () => {
      const { manager } = tracked();
      const handler = async () => {
        throw new Error('Script crashed');
      };

      injectActivePlugin(
        manager,
        mockPlugin({
          id: 'crash-plugin',
          tools: [
            {
              name: 'crasher',
              description: 'Crashes',
              inputSchema: {},
              handler,
            },
          ],
        })
      );

      const result = await manager.executeTool('plugin:crash-plugin:crasher', {}, 'conv-1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Script crashed');
    });

    it('should pass pluginDir and settings to tool context', async () => {
      const { manager } = tracked();
      let capturedContext: any;

      const handler = async (_params: Record<string, unknown>, ctx: any) => {
        capturedContext = ctx;
        return { success: true } as ToolResult;
      };

      injectActivePlugin(
        manager,
        mockPlugin({
          id: 'ctx-plugin',
          tools: [
            {
              name: 'inspect',
              description: 'Inspect context',
              inputSchema: {},
              handler,
            },
          ],
        }),
        {
          installPath: '/install/ctx-plugin',
          settings: { apiKey: 'secret' },
        }
      );

      await manager.executeTool('plugin:ctx-plugin:inspect', {}, 'conv-1');

      expect(capturedContext.pluginDir).toBe('/install/ctx-plugin');
      expect(capturedContext.settings._pluginDir).toBe('/install/ctx-plugin');
      expect(capturedContext.settings.apiKey).toBe('secret');
      expect(capturedContext.logger).toBeDefined();
    });
  });

  // ── isPluginTool ──────────────────────────────────────────────────────

  describe('isPluginTool', () => {
    it('should identify plugin tool names', () => {
      const { manager } = tracked();
      expect(manager.isPluginTool('plugin:pdf-plugin:pdf_split')).toBe(true);
      expect(manager.isPluginTool('read_file')).toBe(false);
      expect(manager.isPluginTool('mcp:github:create_pr')).toBe(false);
    });
  });

  // ── MCP Server Collection ────────────────────────────────────────────

  describe('collectPluginMcpServers', () => {
    it('should return empty array when no plugins active', () => {
      const { manager } = tracked();
      expect(manager.collectPluginMcpServers()).toEqual([]);
    });

    it('should collect MCP servers from active plugins', () => {
      const { manager } = tracked();
      injectActivePlugin(
        manager,
        mockPlugin({
          id: 'mcp-plugin',
          mcpServers: [
            {
              name: 'postgres',
              description: 'PostgreSQL server',
              transport: { type: 'stdio', command: 'npx', args: ['@mcp/server-postgres'] },
            },
          ],
        })
      );

      const servers = manager.collectPluginMcpServers();
      expect(servers).toHaveLength(1);
      expect(servers[0].name).toBe('postgres');
    });

    it('should resolve bundled server command paths', () => {
      const { manager } = tracked();
      injectActivePlugin(
        manager,
        mockPlugin({
          id: 'bundled-mcp',
          mcpServers: [
            {
              name: 'custom-mcp',
              transport: { type: 'stdio', command: './bin/server', args: [] },
              bundled: true,
            },
          ],
        })
      );

      const servers = manager.collectPluginMcpServers();
      // The command should be resolved to absolute path
      expect(servers[0].transport.type).toBe('stdio');
      expect((servers[0].transport as any).command).toContain('bin/server');
    });
  });

  // ── Hooks ─────────────────────────────────────────────────────────────

  describe('runBeforeMessageHooks', () => {
    it('should pass through message when no hooks', async () => {
      const { manager } = tracked();
      const result = await manager.runBeforeMessageHooks('hello', 'conv-1');
      expect(result.message).toBe('hello');
      expect(result.cancel).toBeUndefined();
    });

    it('should allow hooks to modify the message', async () => {
      const { manager } = tracked();
      injectActivePlugin(
        manager,
        mockPlugin({
          id: 'modifier',
          hooks: {
            onBeforeMessage: (ctx) => ({
              message: ctx.message + ' [modified]',
            }),
          },
        })
      );

      const result = await manager.runBeforeMessageHooks('hello', 'conv-1');
      expect(result.message).toBe('hello [modified]');
    });

    it('should support cancellation', async () => {
      const { manager } = tracked();
      injectActivePlugin(
        manager,
        mockPlugin({
          id: 'canceller',
          hooks: {
            onBeforeMessage: () => ({
              message: '',
              cancel: true,
            }),
          },
        })
      );

      const result = await manager.runBeforeMessageHooks('hello', 'conv-1');
      expect(result.cancel).toBe(true);
    });
  });

  describe('runAfterResponseHooks', () => {
    it('should pass through response when no hooks', async () => {
      const { manager } = tracked();
      const result = await manager.runAfterResponseHooks('response text', 'conv-1');
      expect(result.response).toBe('response text');
    });

    it('should allow hooks to modify the response', async () => {
      const { manager } = tracked();
      injectActivePlugin(
        manager,
        mockPlugin({
          id: 'response-modifier',
          hooks: {
            onAfterResponse: (ctx) => ({
              response: ctx.response + ' [processed]',
            }),
          },
        })
      );

      const result = await manager.runAfterResponseHooks('response text', 'conv-1');
      expect(result.response).toBe('response text [processed]');
    });
  });

  // ── Provider Management ───────────────────────────────────────────────

  describe('setActiveProvider / getActiveProvider', () => {
    it('should default to gemini', () => {
      const { manager } = tracked();
      expect(manager.getActiveProvider()).toBe('gemini');
    });

    it('should update active provider', () => {
      const { manager } = tracked();
      manager.setActiveProvider('claude');
      expect(manager.getActiveProvider()).toBe('claude');
    });
  });
});
