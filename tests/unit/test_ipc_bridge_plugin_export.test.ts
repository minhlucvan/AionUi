/**
 * Integration test for plugin IPC bridge export
 *
 * This test verifies that the plugin export is correctly compiled and available
 * in the ipcBridge module. This is a critical test because the plugin export
 * was missing from the compiled JavaScript despite being present in TypeScript.
 *
 * Expected: This test should FAIL initially (RED phase) because the plugin
 * export is not being compiled into ipcBridge.js
 */

import { plugin } from '@/common/ipcBridge';

describe('Plugin IPC Bridge Export', () => {
  describe('Plugin export availability', () => {
    test('plugin export should be defined', () => {
      expect(plugin).toBeDefined();
      expect(plugin).not.toBeNull();
      expect(typeof plugin).toBe('object');
    });

    test('plugin export should have all query methods', () => {
      expect(plugin.list).toBeDefined();
      expect(plugin.get).toBeDefined();
      expect(plugin.listActive).toBeDefined();

      expect(typeof plugin.list.invoke).toBe('function');
      expect(typeof plugin.get.invoke).toBe('function');
      expect(typeof plugin.listActive.invoke).toBe('function');
    });

    test('plugin export should have all installation methods', () => {
      expect(plugin.installNpm).toBeDefined();
      expect(plugin.installGithub).toBeDefined();
      expect(plugin.installLocal).toBeDefined();
      expect(plugin.uninstall).toBeDefined();

      expect(typeof plugin.installNpm.invoke).toBe('function');
      expect(typeof plugin.installGithub.invoke).toBe('function');
      expect(typeof plugin.installLocal.invoke).toBe('function');
      expect(typeof plugin.uninstall.invoke).toBe('function');
    });

    test('plugin export should have all lifecycle methods', () => {
      expect(plugin.activate).toBeDefined();
      expect(plugin.deactivate).toBeDefined();

      expect(typeof plugin.activate.invoke).toBe('function');
      expect(typeof plugin.deactivate.invoke).toBe('function');
    });

    test('plugin export should have all settings and permissions methods', () => {
      expect(plugin.updateSettings).toBeDefined();
      expect(plugin.grantPermissions).toBeDefined();
      expect(plugin.revokePermissions).toBeDefined();

      expect(typeof plugin.updateSettings.invoke).toBe('function');
      expect(typeof plugin.grantPermissions.invoke).toBe('function');
      expect(typeof plugin.revokePermissions.invoke).toBe('function');
    });

    test('plugin export should have update check method', () => {
      expect(plugin.checkUpdates).toBeDefined();
      expect(typeof plugin.checkUpdates.invoke).toBe('function');
    });

    test('plugin export should have all event emitters', () => {
      expect(plugin.pluginActivated).toBeDefined();
      expect(plugin.pluginDeactivated).toBeDefined();
      expect(plugin.pluginError).toBeDefined();

      // These are emitters, should have .on() method
      expect(typeof plugin.pluginActivated.on).toBe('function');
      expect(typeof plugin.pluginDeactivated.on).toBe('function');
      expect(typeof plugin.pluginError.on).toBe('function');
    });
  });

  describe('Plugin export structure completeness', () => {
    test('should have exactly 14 top-level properties', () => {
      const expectedKeys = [
        'list', 'get', 'listActive',
        'installNpm', 'installGithub', 'installLocal', 'uninstall',
        'activate', 'deactivate',
        'updateSettings', 'grantPermissions', 'revokePermissions',
        'checkUpdates',
        'pluginActivated', 'pluginDeactivated', 'pluginError'
      ];

      const actualKeys = Object.keys(plugin);
      expect(actualKeys).toHaveLength(expectedKeys.length);

      expectedKeys.forEach(key => {
        expect(actualKeys).toContain(key);
      });
    });
  });
});
