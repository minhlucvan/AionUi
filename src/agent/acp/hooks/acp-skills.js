/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ACP Skills Integration - Module-Based Hooks
 *
 * Unified skills hook for all ACP backends:
 * - Claude backend: symlink skills to .claude/skills/ (native loading),
 *   inject preset rules on first message
 * - Other backends: inject preset rules + skills index on first message
 *   so the agent discovers available skills via text instructions
 */

const fs = require('fs');
const path = require('path');

module.exports = {
  /**
   * Workspace initialization hook
   * Claude: syncs enabled skills from app data to workspace .claude/skills/ via symlinks
   * Others: no-op (skills are injected via first message instead)
   */
  onWorkspaceInit: {
    handler: async (context) => {
      const { workspace, enabledSkills, utils, backend } = context;

      if (backend !== 'claude') return;

      if (!utils || !enabledSkills || enabledSkills.length === 0) {
        console.log('[acp-skills] No skills to sync');
        return;
      }

      try {
        const claudeSkillsDir = path.join(workspace, '.claude', 'skills');
        await utils.ensureDir(claudeSkillsDir);

        // Symlink builtin skills (always included)
        try {
          await utils.symlinkSkill('_builtin', claudeSkillsDir);
          console.log('[acp-skills] Synced builtin skills');
        } catch (error) {
          console.warn('[acp-skills] Failed to sync builtin skills:', error.message);
        }

        // Symlink each enabled skill
        for (const skillName of enabledSkills) {
          try {
            await utils.symlinkSkill(skillName, claudeSkillsDir);
            console.log(`[acp-skills] Synced skill: ${skillName}`);
          } catch (error) {
            console.warn(`[acp-skills] Failed to sync skill ${skillName}:`, error.message);
          }
        }

        console.log(`[acp-skills] Workspace initialized with ${enabledSkills.length} skills`);
      } catch (error) {
        console.error('[acp-skills] Error during workspace initialization:', error);
      }
    },
    priority: 10,
  },

  /**
   * First message hook
   * Claude: inject preset rules only (skills load natively via .claude/skills/)
   * Others: inject preset rules + skills index text
   */
  onFirstMessage: {
    handler: async (context) => {
      const isClaude = context.backend === 'claude';

      const instructions = [];

      // Preset rules (all backends)
      if (context.presetContext) {
        instructions.push(context.presetContext);
      }

      // Skills index (non-Claude only — Claude loads skills natively)
      if (!isClaude) {
        const skillsDir = context.skillsSourceDir;
        if (skillsDir) {
          const skillsInstruction = await buildSkillsInstruction(skillsDir, context);
          if (skillsInstruction) {
            instructions.push(skillsInstruction);
          }
        }
      }

      if (instructions.length === 0) return {};

      const systemInstructions = instructions.join('\n\n');
      const content = `[Assistant Rules - You MUST follow these instructions]\n${systemInstructions}\n\n[User Request]\n${context.content}`;
      return { content };
    },
    priority: 10,
  },
};

/**
 * Parse frontmatter from SKILL.md content
 */
function parseFrontmatter(content) {
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return {};

  const frontmatter = frontmatterMatch[1];
  const nameMatch = frontmatter.match(/^name:\s*['"]?([^'"\n]+)['"]?\s*$/m);
  const descMatch = frontmatter.match(/^description:\s*['"]?(.+?)['"]?\s*$/m);

  return {
    name: nameMatch ? nameMatch[1].trim() : undefined,
    description: descMatch ? descMatch[1].trim() : undefined,
  };
}

/**
 * Discover skills from a directory and return index entries
 */
async function discoverSkillsFromDir(dir, filterNames) {
  const skills = [];

  if (!fs.existsSync(dir)) return skills;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === '_builtin') continue;

      if (filterNames && !filterNames.includes(entry.name)) continue;

      const skillFile = path.join(dir, entry.name, 'SKILL.md');
      if (!fs.existsSync(skillFile)) continue;

      try {
        const content = fs.readFileSync(skillFile, 'utf-8');
        const { name, description } = parseFrontmatter(content);
        skills.push({
          name: name || entry.name,
          description: description || `Skill: ${entry.name}`,
        });
      } catch (err) {
        console.warn(`[acp-skills] Failed to read skill ${entry.name}:`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[acp-skills] Failed to scan directory ${dir}:`, err.message);
  }

  return skills;
}

/**
 * Build the full skills instruction text (index + location)
 */
async function buildSkillsInstruction(skillsDir, context) {
  const builtinSkillsDir = path.join(skillsDir, '_builtin');

  const builtinSkills = await discoverSkillsFromDir(builtinSkillsDir, null);

  const enabledSkills = context.enabledSkills || [];
  const optionalSkills = enabledSkills.length > 0 ? await discoverSkillsFromDir(skillsDir, enabledSkills) : [];

  const allSkills = [...builtinSkills, ...optionalSkills];
  if (allSkills.length === 0) return null;

  const lines = allSkills.map((s) => `- ${s.name}: ${s.description}`);
  const indexText = `[Available Skills]
The following skills are available. When you need detailed instructions for a specific skill,
you can request it by outputting: [LOAD_SKILL: skill-name]

${lines.join('\n')}`;

  return `${indexText}

[Skills Location]
Skills are stored in two locations:
- Builtin skills (auto-enabled): ${builtinSkillsDir}/{skill-name}/SKILL.md
- Optional skills: ${skillsDir}/{skill-name}/SKILL.md

Each skill has a SKILL.md file containing detailed instructions.
To use a skill, read its SKILL.md file when needed.

For example:
- Builtin "cron" skill: ${builtinSkillsDir}/cron/SKILL.md
- Optional "pptx" skill: ${skillsDir}/pptx/SKILL.md`;
}
