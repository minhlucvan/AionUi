/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

const ROLE = 'navigator';

module.exports = {
  /**
   * onSwarmInit — Navigator seeds the collaboration.
   * Writes user task to feed and receives planning prompt.
   */
  onSwarmInit: {
    handler: async (context) => {
      const { swarm } = context;
      const userRequest = (context.content || '').trim();

      // Write user task to feed as the seed directive
      swarm.feed.append({
        to: 'all',
        type: 'directive',
        content: userRequest,
      });

      return {
        queueMessages: [
          {
            content: [
              '## Swarm — Navigator Session',
              '',
              `**Task:** ${userRequest}`,
              `**Your backend:** ${swarm.agentBackend}`,
              `**Your role:** ${swarm.role}`,
              `**Driver backend:** ${swarm.peers.join(', ')}`,
              '',
              'You are the **Navigator** in a pair-programming swarm.',
              'The Driver will execute your directives and report back.',
              '',
              '**Your workflow:**',
              '1. Analyze the task and break it into clear, actionable steps',
              '2. Write your first directive to the Driver',
              '3. After the Driver reports back, review the work',
              '4. Provide the next directive or corrections',
              '5. When all work is complete, output `<done/>`',
              '',
              '**Rules:**',
              '- Give ONE clear directive at a time (not a list of 10 things)',
              '- Be specific: include file paths, function names, exact requirements',
              "- Review the Driver's output critically — catch bugs and design issues",
              '',
              'Begin by analyzing the task and writing your first directive.',
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
   * onSwarmTurnEnd — Navigator provided a review or directive.
   * Write to feed. Detect done signal.
   */
  onSwarmTurnEnd: {
    handler: async (context) => {
      const { swarm, agentOutput = '' } = context;

      // Check for done signal
      if (/<done\s*\/?>/.test(agentOutput)) {
        swarm.feed.append({
          to: 'all',
          type: 'done',
          content: 'Navigator signals task completion.',
        });
        return { done: true };
      }

      // Write navigator's directive to feed
      swarm.feed.append({
        to: 'driver',
        type: 'directive',
        content: agentOutput.slice(0, 4000),
      });

      return {};
    },
    priority: 50,
  },

  /**
   * onSwarmFeedMessage — Driver posted an action report.
   * Queue a message to wake the navigator with the report.
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
              `## Driver reports: (turn ${context.swarm.turnNumber}/${context.swarm.maxTurns})`,
              '',
              latest.content,
              '',
              '---',
              '_Read `.swarm/feed.jsonl` for full context. Review and provide next directive._',
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
