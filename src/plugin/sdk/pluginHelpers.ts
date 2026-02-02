/**
 * Plugin SDK Helpers
 *
 * Shared utilities for plugin authors. These provide consistent patterns
 * for common operations like running bundled scripts, resolving paths,
 * and constructing ToolResults.
 *
 * Usage in a plugin:
 *   import { createScriptRunner, toolSuccess, toolError } from '@aionui/plugin-sdk';
 *
 * For now, plugins import directly:
 *   import { createScriptRunner, toolSuccess, toolError } from '../../src/plugin/sdk/pluginHelpers';
 */

import type {
  PluginContext,
  PluginLogger,
  ToolExecutionContext,
  ToolResult,
} from '../types';

// ─── Path Helpers ──────────────────────────────────────────────────────────────

/**
 * Create a path resolver scoped to a plugin's install directory.
 *
 * @example
 * ```ts
 * const resolve = createPathResolver('/path/to/plugin');
 * resolve('skills', 'pdf', 'scripts', 'split_pdf.py');
 * // → '/path/to/plugin/skills/pdf/scripts/split_pdf.py'
 * ```
 */
export function createPathResolver(pluginDir: string) {
  return (...segments: string[]): string => {
    return [pluginDir, ...segments].join('/');
  };
}

// ─── Script Runner ─────────────────────────────────────────────────────────────

export interface ScriptRunnerOptions {
  /** Plugin's install directory (from PluginContext.pluginDir) */
  pluginDir: string;

  /** The exec function from PluginContext (requires shell:execute permission) */
  exec: PluginContext['exec'];

  /** Default working directory for scripts */
  cwd?: string;

  /** Default timeout in ms (default: 120000) */
  timeout?: number;
}

export interface RunScriptOptions {
  /** Working directory override */
  cwd?: string;

  /** Timeout override in ms */
  timeout?: number;

  /** Logger for command output */
  logger?: PluginLogger;
}

/**
 * Create a script runner bound to a plugin's directory and exec context.
 *
 * This is the recommended pattern for plugins that wrap bundled scripts.
 * It handles permission checks, path resolution, error formatting, and
 * consistent ToolResult construction.
 *
 * @example
 * ```ts
 * let runner: ReturnType<typeof createScriptRunner>;
 *
 * const plugin: AionPlugin = {
 *   activate(ctx) {
 *     runner = createScriptRunner({
 *       pluginDir: ctx.pluginDir,
 *       exec: ctx.exec,
 *       cwd: ctx.workspace,
 *     });
 *   },
 *   tools: [{
 *     name: 'my_tool',
 *     handler: async (params, ctx) => {
 *       return runner.python('scripts/my_script.py', [params.input], ctx.logger);
 *     },
 *   }],
 * };
 * ```
 */
export function createScriptRunner(options: ScriptRunnerOptions) {
  const { pluginDir, exec, cwd, timeout = 120_000 } = options;

  /**
   * Resolve a path relative to the plugin root.
   */
  function resolve(...segments: string[]): string {
    return [pluginDir, ...segments].join('/');
  }

  /**
   * Run an arbitrary shell command and return a ToolResult.
   */
  async function run(
    command: string,
    opts?: RunScriptOptions,
  ): Promise<ToolResult> {
    if (!exec) {
      return {
        success: false,
        error:
          'Shell execution is not available. Ensure the plugin has the "shell:execute" permission.',
      };
    }

    opts?.logger?.info(`Executing: ${command}`);

    try {
      const result = await exec(command, {
        cwd: opts?.cwd ?? cwd,
        timeout: opts?.timeout ?? timeout,
      });

      if (result.exitCode !== 0) {
        const errorOutput = result.stderr || result.stdout || 'Unknown error';
        return {
          success: false,
          error: `Command failed (exit ${result.exitCode}): ${errorOutput}`,
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

  /**
   * Run a Python script bundled with the plugin.
   *
   * @param scriptRelPath Path relative to the plugin root (e.g., 'skills/pdf/scripts/split_pdf.py')
   * @param args Arguments to pass to the script
   * @param logger Optional logger for command output
   * @param opts Additional options
   */
  async function python(
    scriptRelPath: string,
    args: string[],
    logger?: PluginLogger,
    opts?: RunScriptOptions,
  ): Promise<ToolResult> {
    const scriptAbs = resolve(scriptRelPath);
    const quotedArgs = args.map((a) => `"${a}"`).join(' ');
    const command = `python "${scriptAbs}" ${quotedArgs}`;
    return run(command, { ...opts, logger });
  }

  /**
   * Run a Node.js script bundled with the plugin.
   *
   * @param scriptRelPath Path relative to the plugin root
   * @param args Arguments to pass to the script
   * @param logger Optional logger
   * @param opts Additional options
   */
  async function node(
    scriptRelPath: string,
    args: string[],
    logger?: PluginLogger,
    opts?: RunScriptOptions,
  ): Promise<ToolResult> {
    const scriptAbs = resolve(scriptRelPath);
    const quotedArgs = args.map((a) => `"${a}"`).join(' ');
    const command = `node "${scriptAbs}" ${quotedArgs}`;
    return run(command, { ...opts, logger });
  }

  return { resolve, run, python, node };
}

// ─── ToolResult Factories ──────────────────────────────────────────────────────

/**
 * Create a successful ToolResult.
 */
export function toolSuccess(
  data: unknown,
  display?: ToolResult['display'],
): ToolResult {
  return { success: true, data, display };
}

/**
 * Create a failed ToolResult.
 */
export function toolError(error: string): ToolResult {
  return { success: false, error };
}

/**
 * Validate required parameters and return a ToolResult error if any are missing.
 * Returns null if all params are present.
 *
 * @example
 * ```ts
 * const error = validateRequired(params, ['inputPdf', 'outputPath']);
 * if (error) return error;
 * ```
 */
export function validateRequired(
  params: Record<string, unknown>,
  required: string[],
): ToolResult | null {
  const missing = required.filter(
    (key) => params[key] === undefined || params[key] === null || params[key] === '',
  );

  if (missing.length > 0) {
    return toolError(`Missing required parameter(s): ${missing.join(', ')}`);
  }

  return null;
}
