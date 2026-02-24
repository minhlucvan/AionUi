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
   * onSwarmInit — Strategist receives the user's blog idea first.
   * Seeds the feed and gives the Strategist the idea to analyze.
   */
  onSwarmInit: {
    handler: async (context) => {
      const { swarm } = context;
      const userIdea = (context.content || '').trim();

      // Seed the feed with the user's blog idea
      swarm.feed.append({
        to: 'all',
        type: 'task',
        content: userIdea,
      });

      // Read system prompt and inject it
      const fs = require('fs');
      const path = require('path');
      const promptPath = path.join(__dirname, '../strategist.md');
      const systemPrompt = fs.readFileSync(promptPath, 'utf-8');

      swarm.enqueue({
        content: [
          '[SYSTEM INSTRUCTIONS - YOU MUST FOLLOW THESE EXACTLY]',
          '',
          systemPrompt,
          '',
          '='.repeat(80),
          '',
          `Blog idea from user: ${userIdea}`,
          '',
          'Analyze this blog idea. Define the strategy, create a detailed outline, and prepare a research directive for the Domain Researcher.',
          '',
          'REMEMBER: You MUST use <strategy>, <outline>, and <directive> XML tags in your response.',
        ].join('\n'),
        priority: 'normal',
        source: 'hook',
      });

      return {};
    },
    priority: 50,
  },

  /**
   * onSwarmTurnEnd — Parse the Strategist's structured output, write to feed.
   *
   * Strategist outputs:
   *   <strategy>...</strategy>     — audience, angle, SEO, tone
   *   <outline>...</outline>       — structured article outline
   *   <directive>...</directive>   — research brief for the Researcher
   *   <review>...</review>        — assessment of final article (later turns)
   *   <done>...</done>            — article approved signal
   */
  onSwarmTurnEnd: {
    handler: async (context) => {
      const { swarm, agentOutput = '' } = context;

      // 1. Check for done signal
      if (isDone(agentOutput)) {
        const doneSummary = extractTag(agentOutput, 'done') || 'Content Strategist approves the final article.';

        swarm.feed.append({
          to: 'all',
          type: 'done',
          content: doneSummary,
        });

        return { done: true };
      }

      // 2. Parse structured output
      const strategy = extractTag(agentOutput, 'strategy');
      const outline = extractTag(agentOutput, 'outline');
      const directive = extractTag(agentOutput, 'directive');
      const review = extractTag(agentOutput, 'review');

      // 3. Write strategy to feed (shared with all agents)
      if (strategy) {
        swarm.feed.append({
          to: 'all',
          type: 'plan',
          content: strategy.slice(0, 6000),
        });
      }

      // 4. Write outline to feed (shared with all agents)
      if (outline) {
        swarm.feed.append({
          to: 'all',
          type: 'plan',
          content: `## Article Outline\n\n${outline.slice(0, 6000)}`,
        });
      }

      // 5. Write review to feed if present (revision round)
      if (review) {
        swarm.feed.append({
          to: 'writer',
          type: 'review',
          content: review.slice(0, 4000),
        });
      }

      // 6. Write directive to feed (for Researcher)
      if (directive) {
        swarm.feed.append({
          to: 'researcher',
          type: 'directive',
          content: directive.slice(0, 4000),
        });
      }

      // 7. Fallback — no recognized tags, treat entire output as directive
      if (!strategy && !outline && !directive && !review) {
        swarm.feed.append({
          to: 'researcher',
          type: 'directive',
          content: agentOutput.slice(0, 4000),
        });
      }

      return {};
    },
    priority: 50,
  },

  /**
   * onSwarmFeedMessage — Receives the illustrated article for final review.
   */
  onSwarmFeedMessage: {
    handler: async (context) => {
      const { feedEntries = [], swarm } = context;
      if (feedEntries.length === 0) return {};

      const latest = feedEntries[feedEntries.length - 1];
      const turnInfo = `(turn ${swarm.turnNumber}/${swarm.maxTurns})`;

      let header;
      switch (latest.type) {
        case 'done':
          header = `Article complete ${turnInfo}:`;
          break;
        case 'action':
          header = `Agent report ${turnInfo}:`;
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
