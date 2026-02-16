/**
 * Ralph Multi-Agent Autonomous Loop Hooks
 *
 * Manages the Ralph autonomous agent lifecycle within AionUi:
 * - Routes all messages through @ralph-supervisor (default agent)
 * - Workspace initialization with Ralph state files
 * - Message preprocessing to inject PRD context for the supervisor
 * - First message handling for setup mode detection
 */

const PRD_FILENAME = 'prd.json';
const PROGRESS_FILENAME = 'progress.txt';
const RALPH_STATE_DIR = '.ralph';
const DEFAULT_AGENT = 'ralph-supervisor';

const COMPLETION_SIGNAL = '<promise>COMPLETE</promise>';
const CONTINUE_SIGNAL = '<promise>CONTINUE</promise>';
const DEFAULT_ITERATION_DELAY_MS = 2000;
const MAX_ITERATIONS = 10;

// Track iteration count per workspace to prevent runaway loops
const iterationCounts = new Map();

// All known Ralph agent names for routing detection
const RALPH_AGENTS = ['ralph-supervisor', 'prd-creator', 'prd-validator', 'implementer', 'quality-checker', 'progress-tracker'];

module.exports = {
  /**
   * Initialize workspace with Ralph state directory and template files
   */
  onWorkspaceInit: {
    handler: async (context) => {
      const { workspace, utils } = context;
      if (!utils) return {};

      try {
        // Create .ralph state directory
        const ralphDir = utils.join(workspace, RALPH_STATE_DIR);
        await utils.ensureDir(ralphDir);

        // Create .ralph/config.json with default settings
        const configPath = utils.join(ralphDir, 'config.json');
        if (!(await utils.exists(configPath))) {
          await utils.writeFile(
            configPath,
            JSON.stringify(
              {
                maxIterations: 10,
                autoCommit: true,
                qualityChecks: {
                  typecheck: 'npm run typecheck',
                  lint: 'npm run lint',
                  test: 'npm test',
                  build: null,
                },
                completionSignal: '<promise>COMPLETE</promise>',
                continueSignal: '<promise>CONTINUE</promise>',
              },
              null,
              2
            )
          );
        }

        // Initialize progress.txt if prd.json exists but progress.txt doesn't
        const prdPath = utils.join(workspace, PRD_FILENAME);
        const progressPath = utils.join(workspace, PROGRESS_FILENAME);

        if ((await utils.exists(prdPath)) && !(await utils.exists(progressPath))) {
          await utils.writeFile(progressPath, ['# Ralph Progress Log', '', '## Codebase Patterns', '(Updated each iteration with general patterns and conventions)', '', '- (patterns will be added as discovered)', '', '## Iteration Log', ''].join('\n'));
        }
      } catch (error) {
        console.warn('[ralph] Workspace init warning:', error.message);
      }

      return {};
    },
    priority: 20,
  },

  /**
   * Route all messages through @ralph-supervisor by default.
   * If the user (or the supervisor) already addressed a specific agent, skip routing.
   * Also injects PRD context so the supervisor has full state awareness.
   */
  onSendMessage: {
    handler: async (context) => {
      const { workspace, utils, content } = context;
      if (!utils || !content) return {};

      // Check if message already targets a specific Ralph agent
      const alreadyRouted = RALPH_AGENTS.some((agent) => content.includes(`@${agent}`));

      try {
        const prdPath = utils.join(workspace, PRD_FILENAME);
        const progressPath = utils.join(workspace, PROGRESS_FILENAME);

        // If no prd.json exists, route to supervisor without context injection
        if (!(await utils.exists(prdPath))) {
          if (alreadyRouted) {
            return { content };
          }
          return { content: `@${DEFAULT_AGENT} ${content}` };
        }

        const prdContent = await utils.readFile(prdPath, 'utf-8');
        let prd;
        try {
          prd = JSON.parse(prdContent);
        } catch (_error) {
          if (alreadyRouted) {
            return { content };
          }
          return { content: `@${DEFAULT_AGENT} ${content}` };
        }

        // Count completed vs total stories
        const total = prd.userStories ? prd.userStories.length : 0;
        const completed = prd.userStories ? prd.userStories.filter((s) => s.passes === true).length : 0;
        const remaining = total - completed;

        // Build context injection for the supervisor
        const contextParts = [];

        contextParts.push(`[RALPH:ITERATION_START]`);
        contextParts.push(`Progress: ${completed}/${total} stories complete (${remaining} remaining)`);
        contextParts.push('');

        // Inject PRD state
        contextParts.push('--- Current PRD State ---');
        contextParts.push(prdContent);
        contextParts.push('');

        // Inject progress log if it exists
        if (await utils.exists(progressPath)) {
          const progressContent = await utils.readFile(progressPath, 'utf-8');
          if (progressContent.trim()) {
            contextParts.push('--- Progress Log ---');
            contextParts.push(progressContent);
            contextParts.push('');
          }
        }

        // Inject Ralph config if it exists
        const configPath = utils.join(workspace, RALPH_STATE_DIR, 'config.json');
        if (await utils.exists(configPath)) {
          const configContent = await utils.readFile(configPath, 'utf-8');
          contextParts.push('--- Ralph Configuration ---');
          contextParts.push(configContent);
          contextParts.push('');
        }

        contextParts.push('[RALPH:CONTEXT_END]');
        contextParts.push('');

        // Append original user message
        const trimmedContent = content.trim().toLowerCase();
        if (trimmedContent === 'continue' || trimmedContent === 'next' || trimmedContent === 'ralph') {
          contextParts.push('Execute the next incomplete user story. Delegate to the appropriate sub-agents.');
        } else {
          contextParts.push(content);
        }

        const fullMessage = contextParts.join('\n');

        // Route to supervisor if not already targeted
        if (alreadyRouted) {
          return { content: fullMessage };
        }
        return { content: `@${DEFAULT_AGENT} ${fullMessage}` };
      } catch (error) {
        console.warn('[ralph] onSendMessage warning:', error.message);
        if (alreadyRouted) {
          return { content };
        }
        return { content: `@${DEFAULT_AGENT} ${content}` };
      }
    },
    priority: 30,
  },

  /**
   * Handle first message - detect setup mode and route to supervisor
   */
  onFirstMessage: {
    handler: async (context) => {
      const { workspace, utils, content } = context;
      if (!utils || !content) return {};

      // Reset iteration counter for new sessions
      iterationCounts.delete(workspace);

      try {
        const prdPath = utils.join(workspace, PRD_FILENAME);

        if (await utils.exists(prdPath)) {
          // PRD exists - inject context for first iteration
          const prdContent = await utils.readFile(prdPath, 'utf-8');

          const prefix = ['[RALPH:SESSION_START]', 'A PRD has been detected in the workspace. You are the supervisor.', 'Read the state below, then delegate to the appropriate sub-agents.', '', '--- Current PRD ---', prdContent, '', '[RALPH:SESSION_CONTEXT_END]', ''].join('\n');

          return { content: `@${DEFAULT_AGENT} ${prefix}${content}` };
        }

        // No PRD - enter setup mode, supervisor should delegate to @prd-creator
        const prefix = ['[RALPH:SETUP_MODE]', 'No prd.json found in the workspace.', 'You are the supervisor. Delegate to @prd-creator to generate a PRD from the user request below.', '[RALPH:SETUP_CONTEXT_END]', ''].join('\n');

        return { content: `@${DEFAULT_AGENT} ${prefix}${content}` };
      } catch (error) {
        console.warn('[ralph] onFirstMessage warning:', error.message);
        return { content: `@${DEFAULT_AGENT} ${content}` };
      }
    },
    priority: 25,
  },

  /**
   * Parse agent response for COMPLETE/CONTINUE signals.
   *
   * When the agent outputs <promise>CONTINUE</promise>, this hook
   * queues a follow-up message to continue the autonomous loop.
   *
   * When <promise>COMPLETE</promise> is found, or max iterations
   * are reached, the loop stops.
   *
   * BUG FIX: Changed iteration check from >= to > to fix off-by-one error
   * that caused premature termination at iteration 3 instead of 10.
   */
  onReceiveMessage: {
    handler: async (context) => {
      const { workspace, utils, content } = context;
      if (!utils || !content) return {};

      try {
        // Only run auto-continue if a PRD exists (we're in loop mode)
        const prdPath = utils.join(workspace, PRD_FILENAME);
        if (!(await utils.exists(prdPath))) {
          return {};
        }

        // Load config for max iterations and delay
        let maxIterations = MAX_ITERATIONS;
        let delayMs = DEFAULT_ITERATION_DELAY_MS;
        const configPath = utils.join(workspace, RALPH_STATE_DIR, 'config.json');
        if (await utils.exists(configPath)) {
          try {
            const configContent = await utils.readFile(configPath, 'utf-8');
            const config = JSON.parse(configContent);
            if (config.maxIterations) maxIterations = config.maxIterations;
            if (config.iterationDelayMs) delayMs = config.iterationDelayMs;
          } catch (_error) {
            // Use defaults
          }
        }

        // Check for completion signal — loop is done
        if (content.includes(COMPLETION_SIGNAL)) {
          console.log('[ralph] Loop complete — all stories done');
          iterationCounts.delete(workspace);
          return {};
        }

        // Check for continue signal — queue next iteration
        if (content.includes(CONTINUE_SIGNAL)) {
          // Track iteration count
          const currentIteration = (iterationCounts.get(workspace) || 0) + 1;
          iterationCounts.set(workspace, currentIteration);

          // FIX: Changed from >= to > to allow full 10 iterations
          if (currentIteration > maxIterations) {
            console.log(`[ralph] Max iterations (${maxIterations}) reached — stopping`);
            iterationCounts.delete(workspace);
            return {};
          }

          console.log(`[ralph] Continue signal detected — queueing iteration ${currentIteration}/${maxIterations}`);

          return {
            queueMessage: `[RALPH:ITERATION ${currentIteration}/${maxIterations}] Continue. Execute the next incomplete user story.`,
            queueDelay: delayMs,
          };
        }

        // No signal detected — check PRD directly as fallback
        try {
          const prdContent = await utils.readFile(prdPath, 'utf-8');
          const prd = JSON.parse(prdContent);
          const total = prd.userStories ? prd.userStories.length : 0;
          const completed = prd.userStories ? prd.userStories.filter((s) => s.passes === true).length : 0;

          if (total > 0 && completed === total) {
            console.log('[ralph] All stories complete (detected from prd.json)');
            iterationCounts.delete(workspace);
            return {};
          }

          if (total > 0 && completed < total) {
            // Stories remain but agent didn't output a signal — continue anyway
            const currentIteration = (iterationCounts.get(workspace) || 0) + 1;
            iterationCounts.set(workspace, currentIteration);

            // FIX: Changed from >= to > to allow full 10 iterations
            if (currentIteration > maxIterations) {
              console.log(`[ralph] Max iterations (${maxIterations}) reached — stopping`);
              iterationCounts.delete(workspace);
              return {};
            }

            console.log(`[ralph] No signal but stories remain — queueing iteration ${currentIteration}/${maxIterations}`);

            return {
              queueMessage: `[RALPH:ITERATION ${currentIteration}/${maxIterations}] Continue. Execute the next incomplete user story.`,
              queueDelay: delayMs,
            };
          }
        } catch (_error) {
          // PRD parse error — don't continue
        }

        return {};
      } catch (error) {
        console.warn('[ralph] onReceiveMessage warning:', error.message);
        return {};
      }
    },
    priority: 30,
  },
};
