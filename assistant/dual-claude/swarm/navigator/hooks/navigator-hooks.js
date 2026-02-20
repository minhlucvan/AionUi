/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

// ── Output parser helpers ──

/**
 * Extract content from a named XML-like tag.
 * Returns null if the tag is not found.
 */
function extractTag(text, tagName) {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Check if the output contains a <done> tag (self-closing or with content).
 */
function isDone(text) {
  return /<done\s*\/?>/.test(text) || /<done>[\s\S]*?<\/done>/i.test(text);
}

// ── Hook handlers ──

module.exports = {
  /**
   * onSwarmInit — Seed the navigator with the task.
   * Navigator goes first — analyzes and sends the first directive.
   */
  onSwarmInit: {
    handler: async (context) => {
      const { swarm } = context;
      const userRequest = (context.content || '').trim();

      // Write user task to feed as the seed
      swarm.feed.append({
        to: 'all',
        type: 'directive',
        content: userRequest,
      });

      return {
        queueMessages: [
          {
            content: [
              `Your task: ${userRequest}`,
              '',
              'Analyze this task and send the Driver their first directive.',
              'Break it down into focused steps. Start with the first one.',
            ].join('\n'),
            priority: 'normal',
            source: 'hook',
          },
        ],
      };
    },
    priority: 50,
  },

  /**
   * onSwarmTurnEnd — Parse the navigator's structured output, write to feed.
   *
   * Expected tags in agent output:
   *   <directive>...</directive> — instruction for the driver
   *   <review>...</review>      — assessment of driver's work
   *   <done>...</done>          — task complete signal
   */
  onSwarmTurnEnd: {
    handler: async (context) => {
      const { swarm, agentOutput = '' } = context;

      // 1. Check for done signal
      if (isDone(agentOutput)) {
        const doneSummary = extractTag(agentOutput, 'done') || 'Navigator signals task completion.';
        swarm.feed.append({
          to: 'all',
          type: 'done',
          content: doneSummary,
        });
        return { done: true };
      }

      // 2. Parse structured output
      const directive = extractTag(agentOutput, 'directive');
      const review = extractTag(agentOutput, 'review');

      // 3. Build feed entries — a review + directive combo is common
      if (review) {
        swarm.feed.append({
          to: 'driver',
          type: 'review',
          content: review.slice(0, 4000),
        });
      }

      if (directive) {
        swarm.feed.append({
          to: 'driver',
          type: 'directive',
          content: directive.slice(0, 4000),
        });
      }

      // 4. Fallback — no recognized tags, treat entire output as directive
      if (!directive && !review) {
        swarm.feed.append({
          to: 'driver',
          type: 'directive',
          content: agentOutput.slice(0, 4000),
        });
      }

      return {};
    },
    priority: 50,
  },

  /**
   * onSwarmFeedMessage — Driver posted an action report or blocker.
   * Translate feed entries into a message the navigator understands.
   */
  onSwarmFeedMessage: {
    handler: async (context) => {
      const { feedEntries = [], swarm } = context;
      if (feedEntries.length === 0) return {};

      const latest = feedEntries[feedEntries.length - 1];
      const turnInfo = `(turn ${swarm.turnNumber}/${swarm.maxTurns})`;

      // Build a natural message based on feed entry type
      let header;
      switch (latest.type) {
        case 'action':
          header = `Driver report ${turnInfo}:`;
          break;
        case 'blocker':
          header = `Driver is blocked ${turnInfo}:`;
          break;
        default:
          header = `Driver ${turnInfo}:`;
      }

      // Include file list if present
      const parts = [header, '', latest.content];
      if (latest.files && latest.files.length > 0) {
        parts.push('', 'Files changed:', ...latest.files.map((f) => `- ${f}`));
      }

      return {
        queueMessages: [
          {
            content: parts.join('\n'),
            priority: 'normal',
            source: 'hook',
          },
        ],
      };
    },
    priority: 50,
  },
};
