/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Gemini Skills Integration - Module-Based Hooks
 *
 * This module provides hooks for the Gemini backend to:
 * 1. Build full system instructions at bootstrap time (before agent init)
 * 2. Inject preset rules + full skill content into system instructions
 *
 * Unlike ACP/Codex which inject a skills index at first-message time,
 * Gemini injects full skill content at bootstrap time via onBuildSystemInstructions.
 *
 * The 'cron' skill is always included as a builtin for Gemini.
 */

const fs = require('fs');
const path = require('path');

module.exports = {
  /**
   * Build system instructions hook for Gemini backend
   * Loads full skill content (not just index) for system instruction injection
   */
  onBuildSystemInstructions: {
    handler: async (context) => {
      const instructions = [];

      // 1. Add preset rules (assistant persona/workflow)
      if (context.presetContext) {
        instructions.push(context.presetContext);
      }

      // 2. Load and add full skills content
      // Always include 'cron' as a built-in skill for Gemini
      const enabledSkills = ['cron', ...(context.enabledSkills || [])];
      // Deduplicate in case 'cron' was already in enabledSkills
      const uniqueSkills = [...new Set(enabledSkills)];

      const skillsDir = context.skillsSourceDir;
      if (skillsDir && uniqueSkills.length > 0) {
        const skillsContent = await loadSkillsContent(skillsDir, uniqueSkills);
        if (skillsContent) {
          instructions.push(skillsContent);
        }
      }

      if (instructions.length === 0) return {};

      return { content: instructions.join('\n\n') };
    },
    priority: 10,
  },
};

/**
 * Load full skill content for each enabled skill
 * Replicates the logic from initStorage.loadSkillsContent
 *
 * Search order for each skill:
 * 1. Builtin: {skillsDir}/_builtin/{skillName}/SKILL.md
 * 2. Directory: {skillsDir}/{skillName}/SKILL.md
 * 3. Flat file: {skillsDir}/{skillName}.md
 */
async function loadSkillsContent(skillsDir, enabledSkills) {
  const builtinSkillsDir = path.join(skillsDir, '_builtin');
  const skillContents = [];

  for (const skillName of enabledSkills) {
    const builtinSkillFile = path.join(builtinSkillsDir, skillName, 'SKILL.md');
    const skillDirFile = path.join(skillsDir, skillName, 'SKILL.md');
    const skillFlatFile = path.join(skillsDir, `${skillName}.md`);

    try {
      let content = null;

      if (fs.existsSync(builtinSkillFile)) {
        content = fs.readFileSync(builtinSkillFile, 'utf-8');
      } else if (fs.existsSync(skillDirFile)) {
        content = fs.readFileSync(skillDirFile, 'utf-8');
      } else if (fs.existsSync(skillFlatFile)) {
        content = fs.readFileSync(skillFlatFile, 'utf-8');
      }

      if (content && content.trim()) {
        skillContents.push(`## Skill: ${skillName}\n${content}`);
      }
    } catch (err) {
      console.warn(`[gemini-skills] Failed to load skill ${skillName}:`, err.message);
    }
  }

  if (skillContents.length === 0) return null;

  return `[Available Skills]\n${skillContents.join('\n\n')}`;
}
