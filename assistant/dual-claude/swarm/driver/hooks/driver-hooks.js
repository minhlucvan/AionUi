/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

const ROLE = 'driver';

module.exports = {
  /**
   * onSwarmInit — Seed the driver with initial context.
   * The driver waits for the navigator's first directive before acting.
   */
  onSwarmInit: {
    handler: async (context) => {
      const { swarm } = context;
      const userTask = context.content || 'No task specified.';

      return {
        queueMessages: [
          {
            content: [
              '## Swarm — Driver Session',
              '',
              `**Task:** ${userTask}`,
              `**Your backend:** ${swarm.agentBackend}`,
              `**Your role:** ${swarm.role}`,
              '',
              'You are the **Driver** in a pair-programming swarm.',
              'The Navigator will review your work and provide direction.',
              '',
              '**Your workflow:**',
              "1. Read `.swarm/feed.jsonl` for the Navigator's latest directive",
              '2. Execute the directive (write code, run tests, etc.)',
              '3. Report what you did clearly',
              "4. Wait for the Navigator's next instruction",
              '',
              "Start by reading the feed for the Navigator's first directive.",
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
   * onSwarmTurnEnd — Driver completed an action.
   * Parse output, write to feed, detect done signal.
   */
  onSwarmTurnEnd: {
    handler: async (context) => {
      const { swarm, agentOutput = '' } = context;

      // Check for done signal
      if (/<done\s*\/?>/.test(agentOutput)) {
        swarm.feed.append({
          to: 'all',
          type: 'done',
          content: 'Driver signals task completion.',
        });
        return { done: true };
      }

      // Write driver's action report to feed
      swarm.feed.append({
        to: 'navigator',
        type: 'action',
        content: agentOutput.slice(0, 4000),
      });

      return {};
    },
    priority: 50,
  },

  /**
   * onSwarmFeedMessage — Navigator posted a directive for the driver.
   * Queue a message to wake the driver with the directive.
   */
  onSwarmFeedMessage: {
    handler: async (context) => {
      const { feedEntries = [] } = context;
      if (feedEntries.length === 0) return {};

      const latest = feedEntries[feedEntries.length - 1];

      return {
        queueMessages: [
          {
            content: [
              `## Navigator says: (turn ${context.swarm.turnNumber}/${context.swarm.maxTurns})`,
              '',
              latest.content,
              '',
              '---',
              '_Read `.swarm/feed.jsonl` for full context. Execute the directive above._',
            ].join('\n'),
            priority: 'normal',
            source: 'hook',
          },
        ],
      };
    },
    priority: 50,
  },
};
