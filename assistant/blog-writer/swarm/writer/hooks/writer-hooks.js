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

function isDone(text) {
  return /<done\s*\/?>/.test(text) || /<done>[\s\S]*?<\/done>/i.test(text);
}

// ── Hook handlers ──

module.exports = {
  /**
   * onSwarmInit — Writer waits for the strategy, outline, and research.
   */
  onSwarmInit: {
    handler: async (context) => {
      const { swarm } = context;
      const userIdea = (context.content || '').trim();

      // Read system prompt and inject it
      const fs = require('fs');
      const path = require('path');
      const promptPath = path.join(__dirname, '../writer.md');
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
          'The Content Strategist and Domain Researcher are working on the strategy and research.',
          'Wait for the strategy, outline, and research findings, then write the complete article.',
        ].join('\n'),
        priority: 'normal',
        source: 'hook',
      });

      return {};
    },
    priority: 50,
  },

  /**
   * onSwarmTurnEnd — Parse Writer output, write to feed for the Illustrator.
   *
   * Writer outputs:
   *   <article>...</article>       — complete blog article
   *   <metadata>...</metadata>     — SEO metadata
   *   <directive>...</directive>   — brief for the Illustrative Generator
   *   <report>...</report>        — revision change log
   */
  onSwarmTurnEnd: {
    handler: async (context) => {
      const { swarm, agentOutput = '' } = context;

      // 1. Check for done signal
      if (isDone(agentOutput)) {
        const doneSummary = extractTag(agentOutput, 'done') || 'Article writing complete.';
        swarm.feed.append({
          to: 'all',
          type: 'done',
          content: doneSummary,
        });
        return { done: true };
      }

      // 2. Parse structured output
      const article = extractTag(agentOutput, 'article');
      const metadata = extractTag(agentOutput, 'metadata');
      const directive = extractTag(agentOutput, 'directive');
      const report = extractTag(agentOutput, 'report');

      // 3. Write article to feed (for Illustrator and Strategist review)
      if (article) {
        swarm.feed.append({
          to: 'all',
          type: 'action',
          content: `## Draft Article\n\n${article.slice(0, 12000)}`,
        });
      }

      // 4. Write metadata to feed
      if (metadata) {
        swarm.feed.append({
          to: 'all',
          type: 'action',
          content: `## Article Metadata\n\n${metadata.slice(0, 1000)}`,
        });
      }

      // 5. Write directive for the Illustrator
      if (directive) {
        swarm.feed.append({
          to: 'illustrator',
          type: 'directive',
          content: directive.slice(0, 4000),
        });
      }

      // 6. Write revision report if present
      if (report) {
        swarm.feed.append({
          to: 'strategist',
          type: 'action',
          content: `## Revision Report\n\n${report.slice(0, 2000)}`,
        });
      }

      // 7. Fallback — no recognized tags
      if (!article && !directive && !report) {
        swarm.feed.append({
          to: 'illustrator',
          type: 'action',
          content: agentOutput.slice(0, 8000),
        });
      }

      return {};
    },
    priority: 50,
  },

  /**
   * onSwarmFeedMessage — Receives strategy, research, and revision feedback.
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
          header = `Research findings & writing directive ${turnInfo}:`;
          break;
        case 'review':
          header = `Content Strategist revision request ${turnInfo}:`;
          break;
        case 'action':
          header = `Pipeline update ${turnInfo}:`;
          break;
        default:
          header = `Pipeline ${turnInfo}:`;
      }

      swarm.enqueue({
        content: [header, '', latest.content].join('\n'),
        priority: 'normal',
        source: 'hook',
      });

      return {};
    },
    priority: 50,
  },
};
