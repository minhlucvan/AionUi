/**
 * Ouroboros hooks — self-feeding agent loop
 *
 * The serpent that eats its own tail: the agent's output becomes its own input.
 *
 * Hybrid approach:
 * - PRIMARY: Parse <next>...</next> tag from the agent's response text
 *   → the output literally becomes the input (true ouroboros)
 * - FALLBACK: Read nextPrompt from .ouroboros/state.json
 *   → safety net if the agent forgets the tag
 * - MEMORY: state.json stores plan, progress, iteration count
 *   → persistent state between turns, not the message-passing mechanism
 *
 * Flow:
 * 1. User sends: "Build feature X"
 * 2. onQueueInit → queues the request with planning instructions
 * 3. Turn 1: Agent analyzes, creates plan, writes state.json, ends with <next>...</next>
 * 4. onAgentResponse: parses <next> from output → queues it as next message
 * 5. Turn 2: Agent executes step, updates state.json, ends with <next>...</next>
 * 6. onAgentResponse: parses <next> from output → queues it again
 * 7. ...continues until <done/> tag or state.json status: "done"
 * 8. Loop terminates — the serpent rests
 *
 * Key difference from Ralph:
 * - Ralph uses a rigid 3-phase state machine (enrich → PRD → implement stories)
 * - Ouroboros lets the agent write its OWN follow-up prompts — fully self-directing
 * - The hook is dumb; the agent is smart. The hook just ferries messages.
 */

const DEFAULT_MAX_ITERATIONS = 20;

/**
 * Parse <next>...</next> tag from agent response.
 * Returns the content inside the tag, or null if not found.
 * Supports multiline content.
 */
function parseNextTag(content) {
  if (!content) return null;
  const match = content.match(/<next>([\s\S]*?)<\/next>/);
  return match ? match[1].trim() : null;
}

/**
 * Check if the agent signalled completion via <done/> or <ouroboros>COMPLETE</ouroboros>
 */
function isDoneSignal(content) {
  if (!content) return false;
  return /<done\s*\/?>/.test(content) || /<ouroboros>\s*COMPLETE\s*<\/ouroboros>/.test(content);
}

module.exports = {
  /**
   * onQueueInit — Seed the first turn
   *
   * Takes the user's initial request and queues it with instructions
   * to analyze, plan, and write the first state.json.
   */
  onQueueInit: {
    handler: async (context) => {
      if (!context.backend) return {};

      const userRequest = (context.content || '').trim();
      if (!userRequest) return {};

      const seedPrompt = [
        '## Ouroboros — Initialization',
        '',
        'You have received a new task. Analyze it, break it into steps, and begin.',
        '',
        '**Task:**',
        userRequest,
        '',
        '**Instructions:**',
        '1. Analyze the task and understand what needs to be done',
        '2. Break it down into concrete, ordered steps',
        '3. Write `.ouroboros/state.json` with your plan (see workspace CLAUDE.md for format)',
        '4. Execute the first step if feasible',
        '5. Update state.json and progress.log with results',
        '6. End your response with a `<next>` tag containing the follow-up prompt:',
        '',
        '```',
        '<next>Your specific, actionable prompt for the next turn goes here</next>',
        '```',
        '',
        'The system will parse your `<next>` tag and feed it back as your next input.',
        'When all work is done, output `<done/>` instead.',
        '',
        'You are the serpent and the tail. Begin.',
      ].join('\n');

      return {
        queueMessages: [
          {
            content: seedPrompt,
            priority: 'normal',
            source: 'system',
          },
        ],
      };
    },
    priority: 50,
  },

  /**
   * onAgentResponse — The self-feeding mechanism
   *
   * After each agent turn:
   * 1. Check for <done/> signal → stop
   * 2. Parse <next>...</next> from agent output → queue it (primary)
   * 3. If no <next> tag, read state.json nextPrompt → queue it (fallback)
   * 4. If neither exists → stop
   *
   * The serpent consumes its own tail.
   */
  onAgentResponse: {
    handler: async (context) => {
      if (!context.backend || !context.workspace) return {};

      const agentOutput = context.content || '';
      const fs = require('fs');
      const path = require('path');
      const stateDir = path.join(context.workspace, '.ouroboros');
      const statePath = path.join(stateDir, 'state.json');

      // Check for explicit done signal in output
      if (isDoneSignal(agentOutput)) return {};

      // Read state for metadata (iteration count, plan progress, max iterations)
      let state = null;
      if (fs.existsSync(statePath)) {
        try {
          state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
        } catch {
          // Malformed JSON — continue without state
        }
      }

      // Task is done via state file
      if (state && state.status === 'done') return {};

      // Safety valve — max iterations reached
      const maxIter = (state && state.maxIterations) || DEFAULT_MAX_ITERATIONS;
      const currentIter = (state && state.iteration) || 0;
      if (currentIter >= maxIter) {
        return {
          queueMessages: [
            {
              content: [
                '## Ouroboros — Maximum Iterations Reached',
                '',
                `You have reached the iteration limit (${maxIter}).`,
                'Please wrap up your current work:',
                '',
                '1. Commit any pending changes',
                '2. Update `.ouroboros/state.json` with `status: "done"`',
                '3. Write a final summary of what was accomplished and what remains',
                '4. Output `<done/>`',
              ].join('\n'),
              priority: 'normal',
              source: 'system',
            },
          ],
        };
      }

      // PRIMARY: Parse <next> tag from agent output
      let nextPrompt = parseNextTag(agentOutput);

      // FALLBACK: Read nextPrompt from state.json
      if (!nextPrompt && state) {
        nextPrompt = (state.nextPrompt || '').trim();
      }

      // No follow-up found anywhere — the loop ends
      if (!nextPrompt) return {};

      // Build context header from state metadata
      const iteration = currentIter + 1;
      const totalSteps = state ? (state.plan || []).length : '?';
      const doneSteps = state ? (state.plan || []).filter((s) => s.status === 'done').length : '?';

      const wrappedPrompt = [
        `## Ouroboros — Iteration ${iteration}/${maxIter} (${doneSteps}/${totalSteps} steps done)`,
        '',
        nextPrompt,
        '',
        '---',
        '_Read `.ouroboros/state.json` for full context. Update it when done._',
        '_End your response with `<next>prompt</next>` or `<done/>` if finished._',
      ].join('\n');

      return {
        queueMessages: [
          {
            content: wrappedPrompt,
            priority: 'normal',
            source: 'system',
          },
        ],
      };
    },
    priority: 50,
  },
};
