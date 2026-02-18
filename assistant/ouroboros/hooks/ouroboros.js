/**
 * Ouroboros hooks — self-feeding agent loop
 *
 * The serpent that eats its own tail: the agent's output becomes its own input.
 *
 * Flow:
 * 1. User sends: "Build feature X"
 * 2. onQueueInit → queues the request with planning instructions
 * 3. Turn 1: Agent analyzes, creates plan, writes .ouroboros/state.json with nextPrompt
 * 4. onAgentResponse: reads state.json → queues nextPrompt as next message
 * 5. Turn 2: Agent executes step, updates state.json with new nextPrompt
 * 6. onAgentResponse: reads state.json → queues nextPrompt again
 * 7. ...continues until state.json has status: "done" or maxIterations reached
 * 8. Loop terminates — the serpent rests
 *
 * Key difference from Ralph:
 * - Ralph uses a rigid 3-phase state machine (enrich → PRD → implement stories)
 * - Ouroboros lets the agent write its OWN follow-up prompts — fully self-directing
 * - The hook is dumb; the agent is smart. The hook just ferries messages.
 */

const DEFAULT_MAX_ITERATIONS = 20;

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
        '3. Write `.ouroboros/state.json` with your plan, setting:',
        '   - `status`: `"running"`',
        '   - `iteration`: `1`',
        '   - `maxIterations`: appropriate limit (default 20)',
        '   - `goal`: the original task',
        '   - `plan`: array of steps with title, description, and status',
        '   - `nextPrompt`: a specific, actionable prompt for the next turn',
        '   - `completedSummary`: empty string initially',
        '4. Execute the first step if feasible',
        '5. Update state.json and progress.log with results',
        '',
        'The system will automatically feed your `nextPrompt` back to you.',
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
   * After each agent turn, reads .ouroboros/state.json.
   * If the agent wrote a nextPrompt and status is still "running",
   * queues it as the next message. The serpent consumes its own tail.
   *
   * Terminates when:
   * - status is "done"
   * - nextPrompt is empty/missing
   * - maxIterations reached
   * - state.json doesn't exist (agent hasn't started yet)
   */
  onAgentResponse: {
    handler: async (context) => {
      if (!context.backend || !context.workspace) return {};

      const fs = require('fs');
      const path = require('path');
      const stateDir = path.join(context.workspace, '.ouroboros');
      const statePath = path.join(stateDir, 'state.json');

      // No state file yet — agent hasn't written its first plan
      if (!fs.existsSync(statePath)) return {};

      let state;
      try {
        state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      } catch {
        // Malformed JSON — don't crash, just stop
        return {};
      }

      // Task is done — the serpent rests
      if (state.status === 'done') return {};

      // Safety valve — max iterations reached
      const maxIter = state.maxIterations || DEFAULT_MAX_ITERATIONS;
      const currentIter = state.iteration || 0;
      if (currentIter >= maxIter) {
        // Write a final wrap-up prompt
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
                '4. Output `<ouroboros>COMPLETE</ouroboros>`',
              ].join('\n'),
              priority: 'normal',
              source: 'system',
            },
          ],
        };
      }

      // No follow-up prompt — agent didn't write one, stop
      const nextPrompt = (state.nextPrompt || '').trim();
      if (!nextPrompt) return {};

      // The self-feeding moment: queue the agent's own nextPrompt
      const iteration = currentIter + 1;
      const totalSteps = (state.plan || []).length;
      const doneSteps = (state.plan || []).filter((s) => s.status === 'done').length;

      const wrappedPrompt = [
        `## Ouroboros — Iteration ${iteration}/${maxIter} (${doneSteps}/${totalSteps} steps done)`,
        '',
        nextPrompt,
        '',
        '---',
        '_Remember: Read `.ouroboros/state.json` for full context. Update it when done. Write your `nextPrompt` for the next turn._',
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
