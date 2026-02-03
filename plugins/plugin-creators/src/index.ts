/**
 * aionui-plugin-creators
 *
 * Plugin for creative content generation: games, interactive experiences, animations.
 * Currently provides 3D game generation.
 *
 * Capabilities:
 *   - Agents: 3D Game Creator
 *   - Self-contained: no external tools required
 *   - Generates standalone HTML files
 *
 * Future creators:
 *   - 2D Game Creator
 *   - Animation Creator
 *   - Interactive Story Creator
 */

import type { AionPlugin, PluginContext } from '../../../src/plugin/types';

// ─── Class-based agents ───────────────────────────────────────────────────────
import Game3dAgent from './agents/game-3d';

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
  // Minimal system prompt — the agent's rules handle the specifics

  systemPrompts: [
    {
      content: [
        'You have access to creative content generation capabilities.',
        'Use the 3D Game Creator to generate complete platform games in standalone HTML files.',
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
  // 3D Game Creator agent
  // Future: 2D Game Creator, Animation Creator, etc.

  agents: [new Game3dAgent()],

  priority: 70,
};

export default creatorsPlugin;
