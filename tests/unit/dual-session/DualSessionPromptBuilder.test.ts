/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from '@jest/globals';
import { buildDriverInitialPrompt, buildNavigatorInitialPrompt, buildRelayMessage, buildTurnsSummary } from '@/agent/dual-session/DualSessionPromptBuilder';
import { DUAL_SESSION_COMPLETION_SIGNAL, DUAL_SESSION_INSTRUCTION_PREFIX, DUAL_SESSION_REPORT_PREFIX } from '@/agent/dual-session/types';
import type { DualSessionConfig, DualSessionTurn } from '@/agent/dual-session/types';

const testConfig: DualSessionConfig = {
  task: 'Build a REST API with user authentication',
  workspace: '/tmp/test-workspace',
  driverBackend: 'claude',
  navigatorBackend: 'claude',
  maxTurns: 20,
  yoloMode: true,
};

describe('DualSessionPromptBuilder', () => {
  describe('buildDriverInitialPrompt', () => {
    it('should include the role description', () => {
      const prompt = buildDriverInitialPrompt(testConfig);
      expect(prompt).toContain('Driver');
      expect(prompt).toContain('Navigator');
      expect(prompt).toContain('Plan the implementation strategy');
    });

    it('should include the completion signal', () => {
      const prompt = buildDriverInitialPrompt(testConfig);
      expect(prompt).toContain(DUAL_SESSION_COMPLETION_SIGNAL);
    });

    it('should include the task', () => {
      const prompt = buildDriverInitialPrompt(testConfig);
      expect(prompt).toContain('Build a REST API with user authentication');
    });

    it('should include the workspace', () => {
      const prompt = buildDriverInitialPrompt(testConfig);
      expect(prompt).toContain('/tmp/test-workspace');
    });

    it('should include custom driver context when provided', () => {
      const config = { ...testConfig, driverContext: 'Use Express.js framework' };
      const prompt = buildDriverInitialPrompt(config);
      expect(prompt).toContain('Use Express.js framework');
    });
  });

  describe('buildNavigatorInitialPrompt', () => {
    it('should include the role description', () => {
      const prompt = buildNavigatorInitialPrompt(testConfig);
      expect(prompt).toContain('Navigator');
      expect(prompt).toContain('Receive and understand instructions');
    });

    it('should include the completion signal', () => {
      const prompt = buildNavigatorInitialPrompt(testConfig);
      expect(prompt).toContain(DUAL_SESSION_COMPLETION_SIGNAL);
    });

    it('should include the task overview', () => {
      const prompt = buildNavigatorInitialPrompt(testConfig);
      expect(prompt).toContain('Build a REST API with user authentication');
    });

    it('should include custom navigator context when provided', () => {
      const config = { ...testConfig, navigatorContext: 'Prefer TypeScript' };
      const prompt = buildNavigatorInitialPrompt(config);
      expect(prompt).toContain('Prefer TypeScript');
    });
  });

  describe('buildRelayMessage', () => {
    it('should format driver-to-navigator relay correctly', () => {
      const message = buildRelayMessage('driver', 'navigator', 'Please implement the login endpoint', 3, 20);
      expect(message).toContain(DUAL_SESSION_INSTRUCTION_PREFIX);
      expect(message).toContain('Turn 3/20');
      expect(message).toContain('Driver');
      expect(message).toContain('Navigator');
      expect(message).toContain('Please implement the login endpoint');
    });

    it('should format navigator-to-driver relay correctly', () => {
      const message = buildRelayMessage('navigator', 'driver', 'Login endpoint implemented successfully', 4, 20);
      expect(message).toContain(DUAL_SESSION_REPORT_PREFIX);
      expect(message).toContain('Turn 4/20');
      expect(message).toContain('Login endpoint implemented successfully');
    });

    it('should include urgency warning near max turns', () => {
      const message = buildRelayMessage('navigator', 'driver', 'Almost done', 18, 20);
      expect(message).toContain('2 turn(s) remaining');
      expect(message).toContain(DUAL_SESSION_COMPLETION_SIGNAL);
    });

    it('should not include urgency warning when many turns remain', () => {
      const message = buildRelayMessage('driver', 'navigator', 'Start working', 1, 20);
      expect(message).not.toContain('turn(s) remaining');
    });
  });

  describe('buildTurnsSummary', () => {
    it('should return empty string for no turns', () => {
      expect(buildTurnsSummary([])).toBe('');
    });

    it('should format turns correctly', () => {
      const turns: DualSessionTurn[] = [
        { turn: 1, from: 'driver', to: 'navigator', content: 'First instruction', timestamp: 1000 },
        { turn: 2, from: 'navigator', to: 'driver', content: 'First report', timestamp: 2000 },
      ];
      const summary = buildTurnsSummary(turns);
      expect(summary).toContain('Turn 1');
      expect(summary).toContain('Turn 2');
      expect(summary).toContain('Driver');
      expect(summary).toContain('Navigator');
      expect(summary).toContain('First instruction');
      expect(summary).toContain('First report');
    });

    it('should truncate long content', () => {
      const longContent = 'x'.repeat(300);
      const turns: DualSessionTurn[] = [{ turn: 1, from: 'driver', to: 'navigator', content: longContent, timestamp: 1000 }];
      const summary = buildTurnsSummary(turns);
      expect(summary).toContain('...');
      expect(summary.length).toBeLessThan(longContent.length);
    });
  });
});
