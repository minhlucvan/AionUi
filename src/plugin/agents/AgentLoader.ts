/**
 * AgentLoader — Discovers and loads agent classes from a plugin's agents/ directory.
 *
 * Convention:
 *   plugin-root/
 *     src/agents/
 *       {agent-id}/
 *         index.ts          # default export: class extending PluginAgentBase or PluginAgentConfig
 *         rules/
 *           en-US.md        # locale-keyed system prompts (auto-discovered)
 *           zh-CN.md
 *         resources/        # additional agent resources
 *
 * The loader:
 *   1. Scans the agents/ directory for subdirectories
 *   2. Requires the index.ts (or index.js) from each
 *   3. If the export has an `activate` method → treats as IPluginAgent class instance
 *   4. Otherwise → treats as PluginAgentConfig
 *   5. Auto-discovers rule files from rules/ subdirectory
 */

import * as fs from 'fs';
import * as path from 'path';

import type { IPluginAgent, PluginAgent } from '../types';

/**
 * Discover rule files in an agent's rules/ directory.
 *
 * Looks for locale-keyed markdown files (e.g., en-US.md, zh-CN.md)
 * and returns a ruleFiles map: { 'en-US': 'rules/en-US.md', ... }
 */
export function discoverRuleFiles(agentDir: string): Record<string, string> | undefined {
  const rulesDir = path.join(agentDir, 'rules');
  if (!fs.existsSync(rulesDir)) return undefined;

  const ruleFiles: Record<string, string> = {};

  try {
    const entries = fs.readdirSync(rulesDir);
    for (const entry of entries) {
      // Match locale-keyed .md files: en-US.md, zh-CN.md, etc.
      const match = entry.match(/^([a-z]{2}(?:-[A-Z]{2})?(?:-[a-zA-Z]+)?)\.md$/);
      if (match) {
        const locale = match[1];
        ruleFiles[locale] = path.join('rules', entry);
      }
    }
  } catch {
    // Ignore read errors
  }

  return Object.keys(ruleFiles).length > 0 ? ruleFiles : undefined;
}

/**
 * Load a single agent from a directory.
 *
 * Tries to require the directory's index.ts/index.js.
 * If the default export is a constructor (class), instantiates it.
 * If it has an `activate` method, it's an IPluginAgent.
 * Otherwise, treats it as a PluginAgentConfig.
 *
 * Auto-discovers rule files from the rules/ subdirectory.
 */
export function loadAgentFromDir(agentDir: string): PluginAgent | null {
  try {
    // Try to load the module
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(agentDir);
    const exported = mod.default ?? mod;

    if (!exported) return null;

    let agent: PluginAgent;

    // If exported is a class (constructor function), instantiate it
    if (typeof exported === 'function' && exported.prototype) {
      agent = new exported() as IPluginAgent;
    } else {
      // Plain object — PluginAgentConfig or IPluginAgent instance
      agent = exported as PluginAgent;
    }

    // Auto-discover rule files if the agent doesn't already have them
    if (!agent.ruleFiles) {
      const discovered = discoverRuleFiles(agentDir);
      if (discovered) {
        // Set ruleFiles on the agent regardless of type
        (agent as unknown as Record<string, unknown>).ruleFiles = discovered;
      }
    }

    return agent;
  } catch (err) {
    console.error(`[AgentLoader] Failed to load agent from "${agentDir}":`, err);
    return null;
  }
}

/**
 * Discover and load all agents from a plugin's agents/ directory.
 *
 * Scans for subdirectories in `{pluginDir}/src/agents/` (dev) or
 * `{pluginDir}/agents/` (built/npm) and loads each one.
 *
 * @param pluginDir - Absolute path to the plugin's root directory
 * @returns Array of loaded agents (class instances or config objects)
 */
export function discoverAgents(pluginDir: string): PluginAgent[] {
  const agents: PluginAgent[] = [];

  // Try multiple conventional locations
  const candidateDirs = [path.join(pluginDir, 'src', 'agents'), path.join(pluginDir, 'agents'), path.join(pluginDir, 'dist', 'agents')];

  for (const agentsDir of candidateDirs) {
    if (!fs.existsSync(agentsDir)) continue;

    try {
      const entries = fs.readdirSync(agentsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const agentDir = path.join(agentsDir, entry.name);
        const agent = loadAgentFromDir(agentDir);
        if (agent) {
          agents.push(agent);
        }
      }
    } catch (err) {
      console.error(`[AgentLoader] Failed to scan "${agentsDir}":`, err);
    }

    // Use the first valid directory found
    if (agents.length > 0) break;
  }

  return agents;
}
