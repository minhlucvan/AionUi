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
 * Extract all file paths from <files> tag (one per line).
 */
function extractFiles(text) {
  const raw = extractTag(text, 'files');
  if (!raw) return [];
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
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
   * onSwarmInit — Seed the driver with the task and their role context.
   * The prompt focuses on persona — no workflow/feed internals.
   */
  onSwarmInit: {
    handler: async (context) => {
      const userTask = context.content || 'No task specified.';

      return {
        queueMessages: [
          {
            content: [
              `Your task: ${userTask}`,
              '',
              'Wait for the Navigator to analyze this and send you the first directive.',
              'Once you receive a directive, execute it and report back using your communication protocol.',
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
   * onSwarmTurnEnd — Parse the driver's structured output, write to feed.
   *
   * Expected tags in agent output:
   *   <report>...</report>   — what was done (required)
   *   <files>...</files>     — changed files (optional)
   *   <blocker>...</blocker> — if stuck (optional)
   *   <done>...</done>       — task complete signal
   */
  onSwarmTurnEnd: {
    handler: async (context) => {
      const { swarm, agentOutput = '' } = context;

      // 1. Check for done signal
      if (isDone(agentOutput)) {
        const doneSummary = extractTag(agentOutput, 'done') || 'Driver signals task completion.';
        swarm.feed.append({
          to: 'all',
          type: 'done',
          content: doneSummary,
        });
        return { done: true };
      }

      // 2. Parse structured output
      const report = extractTag(agentOutput, 'report');
      const blocker = extractTag(agentOutput, 'blocker');
      const files = extractFiles(agentOutput);

      // 3. Build feed content — prefer parsed tags, fallback to raw output
      let feedContent;
      if (blocker) {
        feedContent = `**Blocker:**\n${blocker}`;
        if (report) feedContent = `${report}\n\n${feedContent}`;
      } else if (report) {
        feedContent = report;
      } else {
        // No tags found — use raw output (agent didn't follow protocol)
        feedContent = agentOutput.slice(0, 4000);
      }

      // 4. Write to feed
      swarm.feed.append({
        to: 'navigator',
        type: blocker ? 'blocker' : 'action',
        content: feedContent.slice(0, 4000),
        files: files.length > 0 ? files : undefined,
      });

      return {};
    },
    priority: 50,
  },

  /**
   * onSwarmFeedMessage — Navigator sent a directive/review to the driver.
   * Translate feed entries into a message the agent understands.
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
        case 'directive':
          header = `Navigator directive ${turnInfo}:`;
          break;
        case 'review':
          header = `Navigator review ${turnInfo}:`;
          break;
        default:
          header = `Navigator ${turnInfo}:`;
      }

      return {
        queueMessages: [
          {
            content: [`${header}`, '', latest.content].join('\n'),
            priority: 'normal',
            source: 'hook',
          },
        ],
      };
    },
    priority: 50,
  },
};
