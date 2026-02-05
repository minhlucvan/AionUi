/**
 * aionui-plugin-creators
 *
 * Plugin for creative content generation: games, interactive experiences, animations.
 * Placeholder for future creative agents.
 *
 * Capabilities:
 *   - Self-contained: no external tools required
 *   - Generates standalone HTML files
 *
 * Future creators:
 *   - 2D Game Creator
 *   - Animation Creator
 *   - Interactive Story Creator
 */

import type { AionPlugin, PluginContext } from '../../../src/plugin/types';

// ─── Plugin Definition ────────────────────────────────────────────────────────

const creatorsPlugin: AionPlugin = {
  id: 'aionui-plugin-creators',
  version: '1.0.0',

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  activate(context: PluginContext) {
    context.logger.info('Creators plugin activated');
  },

  deactivate() {
    // Nothing to clean up
  },

  // ── Capability 1: System Prompts ──────────────────────────────────────────
  //
  // Minimal system prompt — placeholder for future agents

  systemPrompts: [
    {
      content: [
        'You have access to creative content generation capabilities.',
        'Currently no creators are available in this plugin.',
      ].join('\n'),
      priority: 70,
    },
  ],

  // ── Capability 2: Skills ──────────────────────────────────────────────────
  //
  // No custom skills — game creation is self-contained

  skills: [],

  // ── Capability 3: Tools ───────────────────────────────────────────────────
  //
  // No custom tools — generates standalone HTML files

  tools: [],

  // ── Capability 4: Agents ──────────────────────────────────────────────────
  //
  // Future: 2D Game Creator, Animation Creator, etc.

  agents: [],

  priority: 70,
};

export default creatorsPlugin;
