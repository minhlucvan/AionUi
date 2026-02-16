/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Markdown PRD Parser
 *
 * Parses a markdown-formatted PRD (prd.md) into a structured RalphPrd object.
 * The markdown format is designed to be easy for both LLMs and humans to
 * read and write, while remaining programmatically parseable.
 *
 * Format:
 * ```markdown
 * # PRD: ProjectName
 *
 * **Branch**: ralph/feature-name
 *
 * ## Description
 * Brief description of what we're building
 *
 * ## Stories
 *
 * ### [ ] US-001: Story title (P1)
 * As a user, I want capability so that benefit
 *
 * **Acceptance Criteria**
 * - [ ] Criterion 1
 * - [ ] Criterion 2
 * - [x] Already met criterion
 *
 * **Notes**
 * Any notes here
 *
 * ---
 *
 * ### [x] US-002: Completed story (P2)
 * ...
 * ```
 */

import type { RalphPrd, RalphUserStory } from './types';

/**
 * Parse a markdown PRD string into a RalphPrd object
 */
export function parsePrdMarkdown(markdown: string): RalphPrd | null {
  try {
    const lines = markdown.split('\n');

    // Parse header: # PRD: ProjectName
    const titleLine = lines.find((l) => /^#\s+PRD:\s+/.test(l));
    const project = titleLine ? titleLine.replace(/^#\s+PRD:\s+/, '').trim() : '';

    // Parse branch: **Branch**: ralph/feature-name
    const branchLine = lines.find((l) => /^\*\*Branch\*\*:\s*/.test(l));
    const branchName = branchLine
      ? branchLine
          .replace(/^\*\*Branch\*\*:\s*/, '')
          .replace(/`/g, '')
          .trim()
      : '';

    // Parse description: section between ## Description and next ##
    let description = '';
    const descIdx = lines.findIndex((l) => /^##\s+Description/.test(l));
    if (descIdx !== -1) {
      const descLines: string[] = [];
      for (let i = descIdx + 1; i < lines.length; i++) {
        if (/^##\s+/.test(lines[i])) break;
        descLines.push(lines[i]);
      }
      description = descLines.join('\n').trim();
    }

    // Parse user stories: ### [ ] US-XXX: Title (PN) or ### [x] US-XXX: Title (PN)
    const storyRegex = /^###\s+\[([ x])\]\s+(US-\d+):\s+(.+?)(?:\s+\(P(\d+)\))?\s*$/;
    const userStories: RalphUserStory[] = [];

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(storyRegex);
      if (!match) continue;

      const passes = match[1] === 'x';
      const id = match[2];
      const title = match[3].trim();
      const priority = match[4] ? parseInt(match[4], 10) : userStories.length + 1;

      // Collect story body until next ### or end of file
      const bodyLines: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (/^###\s+/.test(lines[j])) break;
        if (/^---\s*$/.test(lines[j])) break;
        bodyLines.push(lines[j]);
      }

      const bodyText = bodyLines.join('\n');

      // Extract description: text before **Acceptance Criteria**
      const acIdx = bodyText.indexOf('**Acceptance Criteria**');
      const descText = acIdx !== -1 ? bodyText.substring(0, acIdx).trim() : bodyText.trim();

      // Extract acceptance criteria: - [ ] or - [x] lines after **Acceptance Criteria**
      const acceptanceCriteria: string[] = [];
      const acSection = acIdx !== -1 ? bodyText.substring(acIdx) : '';
      const criteriaRegex = /^-\s+\[[ x]\]\s+(.+)$/gm;
      let criteriaMatch;
      while ((criteriaMatch = criteriaRegex.exec(acSection)) !== null) {
        acceptanceCriteria.push(criteriaMatch[1].trim());
      }

      // Extract notes: text after **Notes**
      const notesIdx = bodyText.indexOf('**Notes**');
      let notes = '';
      if (notesIdx !== -1) {
        const notesText = bodyText.substring(notesIdx + '**Notes**'.length);
        // Trim up to next section or end
        const nextSection = notesText.indexOf('**Acceptance Criteria**');
        notes = (nextSection !== -1 ? notesText.substring(0, nextSection) : notesText).trim();
      }

      userStories.push({
        id,
        title,
        description: descText,
        acceptanceCriteria,
        priority,
        passes,
        notes,
      });
    }

    if (!project && !branchName && userStories.length === 0) {
      return null;
    }

    return { project, branchName, description, userStories };
  } catch {
    return null;
  }
}

/**
 * Serialize a RalphPrd object into markdown format
 */
export function serializePrdMarkdown(prd: RalphPrd): string {
  const lines: string[] = [];

  lines.push(`# PRD: ${prd.project}`);
  lines.push('');
  lines.push(`**Branch**: \`${prd.branchName}\``);
  lines.push('');
  lines.push('## Description');
  lines.push(prd.description);
  lines.push('');
  lines.push('## Stories');
  lines.push('');

  for (const story of prd.userStories) {
    const check = story.passes ? 'x' : ' ';
    lines.push(`### [${check}] ${story.id}: ${story.title} (P${story.priority})`);
    lines.push(story.description);
    lines.push('');
    lines.push('**Acceptance Criteria**');
    for (const criterion of story.acceptanceCriteria) {
      lines.push(`- [ ] ${criterion}`);
    }
    lines.push('');
    if (story.notes) {
      lines.push('**Notes**');
      lines.push(story.notes);
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}
