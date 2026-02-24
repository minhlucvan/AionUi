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
   * onSwarmInit — Researcher waits for the Strategist's directive.
   */
  onSwarmInit: {
    handler: async (context) => {
      const { swarm } = context;
      const userIdea = (context.content || '').trim();

      // Read system prompt and inject it
      const fs = require('fs');
      const path = require('path');
      const promptPath = path.join(__dirname, '../researcher.md');
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
          'The Content Strategist is analyzing this idea and will send you a research directive shortly.',
          'Wait for the directive with the strategy and outline, then conduct thorough research.',
        ].join('\n'),
        priority: 'normal',
        source: 'hook',
      });

      return {};
    },
    priority: 50,
  },

  /**
   * onSwarmTurnEnd — Parse Researcher output, write to feed for the Writer.
   *
   * Researcher outputs:
   *   <research>...</research>     — organized research findings
   *   <sources>...</sources>       — reference list
   *   <directive>...</directive>   — brief for the Content Writer
   *   <blocker>...</blocker>       — if research is incomplete
   */
  onSwarmTurnEnd: {
    handler: async (context) => {
      const { swarm, agentOutput = '' } = context;

      // 1. Check for done signal
      if (isDone(agentOutput)) {
        const doneSummary = extractTag(agentOutput, 'done') || 'Research complete.';
        swarm.feed.append({
          to: 'all',
          type: 'done',
          content: doneSummary,
        });
        return { done: true };
      }

      // 2. Parse structured output
      const research = extractTag(agentOutput, 'research');
      const sources = extractTag(agentOutput, 'sources');
      const directive = extractTag(agentOutput, 'directive');
      const blocker = extractTag(agentOutput, 'blocker');

      // 3. Write research findings to feed (for Writer and all agents)
      if (research) {
        swarm.feed.append({
          to: 'all',
          type: 'action',
          content: `## Research Findings\n\n${research.slice(0, 8000)}`,
        });
      }

      // 4. Write sources to feed
      if (sources) {
        swarm.feed.append({
          to: 'all',
          type: 'action',
          content: `## Sources\n\n${sources.slice(0, 2000)}`,
        });
      }

      // 5. Write directive for the Writer
      if (directive) {
        swarm.feed.append({
          to: 'writer',
          type: 'directive',
          content: directive.slice(0, 4000),
        });
      }

      // 6. Write blocker if present
      if (blocker) {
        swarm.feed.append({
          to: 'strategist',
          type: 'blocker',
          content: blocker.slice(0, 2000),
        });
      }

      // 7. Fallback — no recognized tags
      if (!research && !directive && !blocker) {
        swarm.feed.append({
          to: 'writer',
          type: 'action',
          content: agentOutput.slice(0, 6000),
        });
      }

      return {};
    },
    priority: 50,
  },

  /**
   * onSwarmFeedMessage — Receives the strategy and outline from the Strategist.
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
          header = `Content Strategist research directive ${turnInfo}:`;
          break;
        case 'plan':
          header = `Content strategy ${turnInfo}:`;
          break;
        case 'review':
          header = `Feedback ${turnInfo}:`;
          break;
        default:
          header = `Pipeline update ${turnInfo}:`;
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
