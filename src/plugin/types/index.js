"use strict";
/**
 * AionUi Plugin System - Core Type Definitions
 *
 * A plugin works like the current agents in AionUi — it bundles system prompts,
 * skills (SKILL.md), dedicated tools, and MCP server configs. Installing a plugin
 * adds new capabilities that work across all AI providers (Claude Code, Gemini, Codex).
 *
 * The plugin system mirrors how AcpBackendConfig + Skills + MCP already work:
 *   - System prompts → injected via presetRules / context (first-message prefix)
 *   - Skills        → SKILL.md files loaded by AcpSkillManager / loadSkillsContent
 *   - Tools         → MCP servers or function-calling tool definitions
 *
 * A plugin is the installable, distributable wrapper around those same primitives.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AI_PROVIDERS = void 0;
exports.isPluginAgentInstance = isPluginAgentInstance;
exports.AI_PROVIDERS = ['claude', 'gemini', 'codex', 'acp'];
/** Type guard: is this agent a class instance (has activate method)? */
function isPluginAgentInstance(agent) {
    return typeof agent.activate === 'function';
}
