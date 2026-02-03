/**
 * 3D Game Creator Agent — Class-based agent for generating 3D platform games
 *
 * Lives in: plugin-creators/src/agents/game-3d/index.ts
 *
 * This agent provides workflows for creating complete 3D platform collection games
 * in a single HTML file using Three.js.
 *
 * It generates:
 *   - Complete game logic
 *   - 3D graphics and physics
 *   - Player controls and interactions
 *   - Collectibles and scoring system
 */

import { PluginAgentBase } from '../../../../../src/plugin/agents/PluginAgentBase';
import type { AgentContext, ConversationHookContext } from '../../../../../src/plugin/types';

export default class Game3dAgent extends PluginAgentBase {
  readonly id = 'game-3d';
  readonly name = '3D Game';
  readonly nameI18n = {
    'en-US': '3D Game',
    'zh-CN': '3D 游戏生成',
  };
  readonly description = 'Generate a complete 3D platform collection game in one HTML file.';
  readonly descriptionI18n = {
    'en-US': 'Generate a complete 3D platform collection game in one HTML file.',
    'zh-CN': '用单个 HTML 文件生成完整的 3D 平台收集游戏。',
  };
  readonly avatar = '🎮';
  readonly presetAgentType = 'gemini' as const;
  readonly enabledByDefault = true;
  readonly prompts = ['Create a 3D platformer game', 'Make a coin collection game'];
  readonly promptsI18n = {
    'en-US': ['Create a 3D platformer game', 'Make a coin collection game'],
    'zh-CN': ['创建一个3D平台游戏', '制作一个金币收集游戏'],
  };

  async activate(ctx: AgentContext): Promise<void> {
    await super.activate(ctx);
    ctx.logger.info('3D Game Creator agent activated');
  }

  getSkills(): string[] {
    // No specialized skills needed - uses general coding ability
    return [];
  }

  getToolNames(): string[] {
    // No specialized tools needed - generates standalone HTML files
    return [];
  }

  async onConversationStart(ctx: ConversationHookContext): Promise<void> {
    this.context?.logger.info(`3D Game Creator: conversation ${ctx.conversationId} started`);
  }
}
