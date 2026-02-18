/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Codex Skills Integration - Module-Based Hooks
 *
 * This module provides hooks for the Codex backend to:
 * 1. Inject preset rules (assistant persona/workflow) on first message
 * 2. Build and inject skills index so the agent knows available skills
 *
 * Codex agents read skill files on-demand using the Read tool,
 * so only the index (name + description) and file locations are injected.
 */

const fs = require('fs');
const path = require('path');

module.exports = {
  /**
   * First message hook for Codex backend
   * Injects preset rules + skills index into first message content
   */
  onFirstMessage: {
    handler: async (context) => {
      const instructions = [];

      // 1. Add preset rules (assistant persona/workflow)
      if (context.presetContext) {
        instructions.push(context.presetContext);
      }

      // 2. Build skills index from builtin + enabled skills
      const skillsDir = context.skillsSourceDir;
      if (skillsDir) {
        const skillsInstruction = await buildSkillsInstruction(skillsDir, context);
        if (skillsInstruction) {
          instructions.push(skillsInstruction);
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

      // If filterNames provided, only include matching skills
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
        console.warn(`[codex-skills] Failed to read skill ${entry.name}:`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[codex-skills] Failed to scan directory ${dir}:`, err.message);
  }

  return skills;
}

/**
 * Build the full skills instruction text (index + location)
 */
async function buildSkillsInstruction(skillsDir, context) {
  const builtinSkillsDir = path.join(skillsDir, '_builtin');

  // Discover builtin skills (always included)
  const builtinSkills = await discoverSkillsFromDir(builtinSkillsDir, null);

  // Discover enabled optional skills
  const enabledSkills = context.enabledSkills || [];
  const optionalSkills = enabledSkills.length > 0
    ? await discoverSkillsFromDir(skillsDir, enabledSkills)
    : [];

  const allSkills = [...builtinSkills, ...optionalSkills];
  if (allSkills.length === 0) return null;

  // Build index text
  const lines = allSkills.map((s) => `- ${s.name}: ${s.description}`);
  const indexText = `[Available Skills]
The following skills are available. When you need detailed instructions for a specific skill,
you can request it by outputting: [LOAD_SKILL: skill-name]

${lines.join('\n')}`;

  // Add location instructions
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
