/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

// ── Output parser helpers ──

function extractTag(text, tagName) {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

function extractFiles(text) {
  const raw = extractTag(text, 'files');
  if (!raw) return [];
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function isDone(text) {
  return /<done\s*\/?>/.test(text) || /<done>[\s\S]*?<\/done>/i.test(text);
}

// ── Hook handlers ──

module.exports = {
  /**
   * onSwarmInit — Illustrator waits for the completed article.
   */
  onSwarmInit: {
    handler: async (context) => {
      const { swarm } = context;
      const userIdea = (context.content || '').trim();

      // Read system prompt and inject it
      const fs = require('fs');
      const path = require('path');
      const promptPath = path.join(__dirname, '../illustrator.md');
      const systemPrompt = fs.readFileSync(promptPath, 'utf-8');

      swarm.enqueue({
        content: [
          '[SYSTEM INSTRUCTIONS - YOU MUST FOLLOW THESE EXACTLY]',
          '',
          systemPrompt,
          '',
          '='.repeat(80),
          '',
          `Blog idea: ${userIdea}`,
          '',
          'The pipeline is working: Strategist → Researcher → Writer.',
          'Wait for the completed article draft, then add illustrations and produce the final output.',
        ].join('\n'),
        priority: 'normal',
        source: 'hook',
      });

      return {};
    },
    priority: 50,
  },

  /**
   * onSwarmTurnEnd — Parse Illustrator output, write final article to feed.
   *
   * Illustrator outputs:
   *   <illustrations>...</illustrations> — visual assets created
   *   <article>...</article>             — final illustrated article
   *   <files>...</files>                 — output file paths
   *   <done>...</done>                   — pipeline complete signal
   *   <report>...</report>              — revision change log
   */
  onSwarmTurnEnd: {
    handler: async (context) => {
      const { swarm, agentOutput = '' } = context;

      // 1. Check for done signal
      if (isDone(agentOutput)) {
        const doneSummary = extractTag(agentOutput, 'done') || 'Blog article with illustrations complete.';
        const files = extractFiles(agentOutput);

        swarm.feed.append({
          to: 'all',
          type: 'done',
          content: doneSummary,
          files: files.length > 0 ? files : undefined,
        });

        return { done: true };
      }

      // 2. Parse structured output
      const illustrations = extractTag(agentOutput, 'illustrations');
      const article = extractTag(agentOutput, 'article');
      const report = extractTag(agentOutput, 'report');
      const files = extractFiles(agentOutput);

      // 3. Write illustrations summary to feed
      if (illustrations) {
        swarm.feed.append({
          to: 'all',
          type: 'action',
          content: `## Illustrations Added\n\n${illustrations.slice(0, 4000)}`,
        });
      }

      // 4. Write final article to feed (for Strategist review)
      if (article) {
        swarm.feed.append({
          to: 'strategist',
          type: 'action',
          content: `## Final Illustrated Article\n\n${article.slice(0, 12000)}`,
          files: files.length > 0 ? files : undefined,
        });
      }

      // 5. Write revision report if present
      if (report) {
        swarm.feed.append({
          to: 'strategist',
          type: 'action',
          content: `## Illustration Revision\n\n${report.slice(0, 2000)}`,
        });
      }

      // 6. Fallback
      if (!illustrations && !article && !report) {
        swarm.feed.append({
          to: 'strategist',
          type: 'action',
          content: agentOutput.slice(0, 8000),
          files: files.length > 0 ? files : undefined,
        });
      }

      return {};
    },
    priority: 50,
  },

  /**
   * onSwarmFeedMessage — Receives the draft article from the Writer.
   */
  onSwarmFeedMessage: {
    handler: async (context) => {
      const { feedEntries = [], swarm } = context;
      if (feedEntries.length === 0) return {};

      const latest = feedEntries[feedEntries.length - 1];
      const turnInfo = `(turn ${swarm.turnNumber}/${swarm.maxTurns})`;

      let header;
      switch (latest.type) {
        case 'directive':
          header = `Content Writer illustration brief ${turnInfo}:`;
          break;
        case 'action':
          header = `Draft article received ${turnInfo}:`;
          break;
        case 'review':
          header = `Revision request ${turnInfo}:`;
          break;
        default:
          header = `Pipeline update ${turnInfo}:`;
      }

      const parts = [header, '', latest.content];
      if (latest.files && latest.files.length > 0) {
        parts.push('', 'Files:', ...latest.files.map((f) => `- ${f}`));
      }

      swarm.enqueue({
        content: parts.join('\n'),
        priority: 'normal',
        source: 'hook',
      });

      return {};
    },
    priority: 50,
  },
};
