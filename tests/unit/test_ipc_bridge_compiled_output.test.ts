/**
 * Unit test for compiled IPC bridge output
 *
 * This test verifies that the TypeScript compilation correctly outputs
 * the plugin export in the compiled JavaScript file.
 *
 * ROOT CAUSE being tested:
 * - ipcBridge.ts has 334 lines with plugin export (lines 209-237)
 * - ipcBridge.js only has 163 lines, missing the plugin export entirely
 * - This indicates a build cache issue where .ts changes aren't compiled to .js
 *
 * Expected: This test should FAIL initially (RED phase) because the plugin
 * export is missing from the compiled ipcBridge.js file.
 */

import * as fs from 'fs';
import * as path from 'path';

describe('IPC Bridge Compiled Output Verification', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const tsFilePath = path.join(projectRoot, 'src/common/ipcBridge.ts');
  const jsFilePath = path.join(projectRoot, 'src/common/ipcBridge.js');

  describe('Source file existence', () => {
    test('TypeScript source file should exist', () => {
      expect(fs.existsSync(tsFilePath)).toBe(true);
    });

    test('Compiled JavaScript file should exist', () => {
      expect(fs.existsSync(jsFilePath)).toBe(true);
    });
  });

  describe('Compiled output completeness', () => {
    let tsContent: string;
    let jsContent: string;

    beforeAll(() => {
      tsContent = fs.readFileSync(tsFilePath, 'utf-8');
      jsContent = fs.readFileSync(jsFilePath, 'utf-8');
    });

    test('TypeScript source should contain plugin export', () => {
      // Verify the export statement exists
      expect(tsContent).toContain('export const plugin = {');

      // Verify key methods are present in source
      expect(tsContent).toContain('list: bridge.buildProvider');
      expect(tsContent).toContain('installNpm: bridge.buildProvider');
      expect(tsContent).toContain('pluginActivated: bridge.buildEmitter');
      expect(tsContent).toContain('pluginDeactivated: bridge.buildEmitter');
    });

    test('Compiled JavaScript should contain plugin export', () => {
      // The compiled code should have the plugin export
      // It might be minified/transformed, but should contain references to:
      // - exports.plugin or module.exports.plugin
      // - The word "plugin" as an export

      const hasPluginExport =
        jsContent.includes('exports.plugin') || jsContent.includes('plugin:') || jsContent.includes('"plugin"');

      expect(hasPluginExport).toBe(true);
    });

    test('Compiled JavaScript should have similar or greater length than TypeScript', () => {
      // TypeScript: 334 lines
      // Compiled JS should be similar length (accounting for transformations)
      // Currently: JS is only 163 lines (less than half!) - THIS IS THE BUG

      const tsLines = tsContent.split('\n').length;
      const jsLines = jsContent.split('\n').length;

      // Allow some variance for compilation transformations
      // But compiled output should not be less than 60% of source
      const minExpectedLines = Math.floor(tsLines * 0.6);

      expect(jsLines).toBeGreaterThanOrEqual(minExpectedLines);
    });

    test('Compiled JavaScript should contain plugin-related method exports', () => {
      // Check for specific plugin methods that should be in compiled output
      const expectedMethods = ['plugin:list', 'plugin:install-npm', 'plugin:activate', 'plugin:event:activated', 'plugin:event:deactivated'];

      expectedMethods.forEach((method) => {
        expect(jsContent).toContain(method);
      });
    });

    test('Compiled JavaScript should end with plugin export, not windowControls', () => {
      // Currently, ipcBridge.js ends at windowControls export
      // It should include the plugin export which comes after windowControls

      const lastExports = jsContent.slice(-500); // Check last 500 chars

      // Should contain plugin-related exports near the end
      // Should NOT end with only windowControls
      const endsWithWindowControls = lastExports.includes('windowControls') && !lastExports.includes('plugin');

      expect(endsWithWindowControls).toBe(false);
    });
  });

  describe('Export consistency verification', () => {
    test('All exports in TypeScript should exist in compiled JavaScript', () => {
      const tsContent = fs.readFileSync(tsFilePath, 'utf-8');
      const jsContent = fs.readFileSync(jsFilePath, 'utf-8');

      // Extract all export names from TypeScript source
      const exportPattern = /export const (\w+) =/g;
      const tsExports: string[] = [];
      let match;

      while ((match = exportPattern.exec(tsContent)) !== null) {
        tsExports.push(match[1]);
      }

      // Verify each export exists in compiled JS
      tsExports.forEach((exportName) => {
        const existsInJs = jsContent.includes(`exports.${exportName}`) || jsContent.includes(`"${exportName}"`) || jsContent.includes(`'${exportName}'`);

        expect(existsInJs).toBe(true);
      });

      // Specifically check for 'plugin' export
      expect(tsExports).toContain('plugin');
    });
  });
});
