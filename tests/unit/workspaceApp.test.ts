/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from '@jest/globals';
import { normalizeAppConfig, APP_CONFIG_FILENAME } from '@/common/types/workspaceApp';

describe('workspaceApp', () => {
  describe('APP_CONFIG_FILENAME', () => {
    it('should be app.json', () => {
      expect(APP_CONFIG_FILENAME).toBe('app.json');
    });
  });

  describe('normalizeAppConfig', () => {
    it('should normalize a single app config', () => {
      const raw = {
        name: 'My Dash App',
        type: 'dash',
        url: 'http://localhost:8050',
      };
      const result = normalizeAppConfig(raw);
      expect(result.apps).toHaveLength(1);
      expect(result.apps[0].name).toBe('My Dash App');
      expect(result.apps[0].type).toBe('dash');
      expect(result.apps[0].url).toBe('http://localhost:8050');
    });

    it('should normalize a multi-app config', () => {
      const raw = {
        apps: [
          { name: 'Dashboard', type: 'dash', url: 'http://localhost:8050' },
          { name: 'API Docs', type: 'fastapi', url: 'http://localhost:8000/docs' },
        ],
      };
      const result = normalizeAppConfig(raw);
      expect(result.apps).toHaveLength(2);
      expect(result.apps[0].name).toBe('Dashboard');
      expect(result.apps[1].name).toBe('API Docs');
    });

    it('should filter out invalid apps in multi-app config', () => {
      const raw = {
        apps: [
          { name: 'Valid App', url: 'http://localhost:8050' },
          { name: '', url: 'http://localhost:3000' }, // invalid: empty name
          { name: 'No URL' } as any, // invalid: missing url
        ],
      };
      const result = normalizeAppConfig(raw);
      expect(result.apps).toHaveLength(1);
      expect(result.apps[0].name).toBe('Valid App');
    });

    it('should return empty apps for invalid single config', () => {
      const raw = { name: '', url: '' } as any;
      const result = normalizeAppConfig(raw);
      expect(result.apps).toHaveLength(0);
    });

    it('should return empty apps for empty apps array', () => {
      const raw = { apps: [] };
      const result = normalizeAppConfig(raw);
      expect(result.apps).toHaveLength(0);
    });

    it('should handle app with optional fields', () => {
      const raw = {
        name: 'Full Config App',
        type: 'dash',
        url: 'http://localhost:8050',
        description: 'A Dash analytics dashboard',
        icon: 'chart-histogram',
      };
      const result = normalizeAppConfig(raw);
      expect(result.apps).toHaveLength(1);
      expect(result.apps[0].description).toBe('A Dash analytics dashboard');
      expect(result.apps[0].icon).toBe('chart-histogram');
    });
  });
});
