/**
 * Tests for Plugin SDK helpers.
 *
 * Validates the shared utilities that plugin authors use:
 *   - createPathResolver: scope paths to plugin dir
 *   - createScriptRunner: run bundled scripts
 *   - toolSuccess / toolError: construct ToolResults
 *   - validateRequired: check required params
 */

import { describe, it, expect } from '@jest/globals';
import { createPathResolver, createScriptRunner, toolError, toolSuccess, validateRequired } from '../../src/plugin/sdk/pluginHelpers';

describe('Plugin SDK Helpers', () => {
  // ── createPathResolver ──────────────────────────────────────────────────

  describe('createPathResolver', () => {
    it('should resolve paths relative to plugin dir', () => {
      const resolve = createPathResolver('/plugins/my-plugin');
      expect(resolve('scripts', 'run.py')).toBe('/plugins/my-plugin/scripts/run.py');
    });

    it('should handle single segment', () => {
      const resolve = createPathResolver('/plugins/my-plugin');
      expect(resolve('index.ts')).toBe('/plugins/my-plugin/index.ts');
    });

    it('should handle no segments', () => {
      const resolve = createPathResolver('/plugins/my-plugin');
      expect(resolve()).toBe('/plugins/my-plugin');
    });

    it('should handle deeply nested paths', () => {
      const resolve = createPathResolver('/plugins/my-plugin');
      expect(resolve('skills', 'pdf', 'scripts', 'split_pdf.py')).toBe('/plugins/my-plugin/skills/pdf/scripts/split_pdf.py');
    });
  });

  // ── toolSuccess / toolError ──────────────────────────────────────────────

  describe('toolSuccess', () => {
    it('should create a successful result with data', () => {
      const result = toolSuccess({ key: 'value' });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ key: 'value' });
      expect(result.error).toBeUndefined();
    });

    it('should include display hint when provided', () => {
      const result = toolSuccess('output text', { type: 'text', content: 'output text' });
      expect(result.success).toBe(true);
      expect(result.display).toEqual({ type: 'text', content: 'output text' });
    });

    it('should handle null data', () => {
      const result = toolSuccess(null);
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('toolError', () => {
    it('should create a failed result with error message', () => {
      const result = toolError('Something went wrong');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Something went wrong');
      expect(result.data).toBeUndefined();
    });
  });

  // ── validateRequired ────────────────────────────────────────────────────

  describe('validateRequired', () => {
    it('should return null when all required params present', () => {
      const params = { inputPdf: '/path/to/file.pdf', outputPath: '/output' };
      const result = validateRequired(params, ['inputPdf', 'outputPath']);
      expect(result).toBeNull();
    });

    it('should return ToolResult error when params are missing', () => {
      const params = { inputPdf: '/path/to/file.pdf' };
      const result = validateRequired(params, ['inputPdf', 'outputPath']);
      expect(result).not.toBeNull();
      expect(result!.success).toBe(false);
      expect(result!.error).toContain('outputPath');
    });

    it('should report all missing params', () => {
      const params = {};
      const result = validateRequired(params, ['a', 'b', 'c']);
      expect(result).not.toBeNull();
      expect(result!.error).toContain('a');
      expect(result!.error).toContain('b');
      expect(result!.error).toContain('c');
    });

    it('should treat empty string as missing', () => {
      const params = { name: '' };
      const result = validateRequired(params, ['name']);
      expect(result).not.toBeNull();
      expect(result!.error).toContain('name');
    });

    it('should treat null as missing', () => {
      const params: Record<string, unknown> = { name: null };
      const result = validateRequired(params, ['name']);
      expect(result).not.toBeNull();
    });

    it('should treat undefined as missing', () => {
      const params: Record<string, unknown> = { name: undefined };
      const result = validateRequired(params, ['name']);
      expect(result).not.toBeNull();
    });

    it('should accept 0 and false as valid values', () => {
      const params = { count: 0, enabled: false };
      const result = validateRequired(params, ['count', 'enabled']);
      expect(result).toBeNull();
    });
  });

  // ── createScriptRunner ──────────────────────────────────────────────────

  describe('createScriptRunner', () => {
    it('should return error when exec is not available', async () => {
      const runner = createScriptRunner({
        pluginDir: '/plugins/test',
        exec: undefined,
      });

      const result = await runner.run('echo hello');
      expect(result.success).toBe(false);
      expect(result.error).toContain('shell:execute');
    });

    it('should resolve script paths relative to plugin dir', () => {
      const runner = createScriptRunner({
        pluginDir: '/plugins/test',
        exec: undefined,
      });

      expect(runner.resolve('scripts', 'run.py')).toBe('/plugins/test/scripts/run.py');
    });

    it('should run command and return success on exit 0', async () => {
      const mockExec = async () => ({
        stdout: 'hello world',
        stderr: '',
        exitCode: 0,
      });

      const runner = createScriptRunner({
        pluginDir: '/plugins/test',
        exec: mockExec,
        cwd: '/workspace',
      });

      const result = await runner.run('echo hello');
      expect(result.success).toBe(true);
      expect(result.data).toBe('hello world');
    });

    it('should return error on non-zero exit code', async () => {
      const mockExec = async () => ({
        stdout: '',
        stderr: 'file not found',
        exitCode: 1,
      });

      const runner = createScriptRunner({
        pluginDir: '/plugins/test',
        exec: mockExec,
      });

      const result = await runner.run('cat /nonexistent');
      expect(result.success).toBe(false);
      expect(result.error).toContain('file not found');
    });

    it('should handle exec throwing an error', async () => {
      const mockExec = async () => {
        throw new Error('Permission denied');
      };

      const runner = createScriptRunner({
        pluginDir: '/plugins/test',
        exec: mockExec,
      });

      const result = await runner.run('rm -rf /');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
    });

    it('should construct python command correctly', async () => {
      let capturedCommand = '';
      const mockExec = async (cmd: string) => {
        capturedCommand = cmd;
        return { stdout: 'ok', stderr: '', exitCode: 0 };
      };

      const runner = createScriptRunner({
        pluginDir: '/plugins/test',
        exec: mockExec,
      });

      await runner.python('scripts/split.py', ['/input.pdf', '/output/']);
      expect(capturedCommand).toBe('python "/plugins/test/scripts/split.py" "/input.pdf" "/output/"');
    });

    it('should construct node command correctly', async () => {
      let capturedCommand = '';
      const mockExec = async (cmd: string) => {
        capturedCommand = cmd;
        return { stdout: 'ok', stderr: '', exitCode: 0 };
      };

      const runner = createScriptRunner({
        pluginDir: '/plugins/test',
        exec: mockExec,
      });

      await runner.node('scripts/convert.js', ['/input.html']);
      expect(capturedCommand).toBe('node "/plugins/test/scripts/convert.js" "/input.html"');
    });

    it('should pass cwd and timeout options', async () => {
      let capturedOptions: any;
      const mockExec = async (_cmd: string, opts: any) => {
        capturedOptions = opts;
        return { stdout: '', stderr: '', exitCode: 0 };
      };

      const runner = createScriptRunner({
        pluginDir: '/plugins/test',
        exec: mockExec,
        cwd: '/default-cwd',
        timeout: 5000,
      });

      // Default cwd/timeout
      await runner.run('echo test');
      expect(capturedOptions.cwd).toBe('/default-cwd');
      expect(capturedOptions.timeout).toBe(5000);

      // Override cwd/timeout
      await runner.run('echo test', { cwd: '/other', timeout: 1000 });
      expect(capturedOptions.cwd).toBe('/other');
      expect(capturedOptions.timeout).toBe(1000);
    });
  });
});
