/**
 * Ralph Autonomous Loop Hooks
 *
 * Manages the Ralph autonomous agent lifecycle within AionUi:
 * - Workspace initialization with Ralph state files
 * - Message preprocessing to inject PRD context
 * - First message handling for setup mode detection
 * - System instruction building with Ralph directives
 */

const path = require('path');

const PRD_FILENAME = 'prd.json';
const PROGRESS_FILENAME = 'progress.txt';
const RALPH_STATE_DIR = '.ralph';

/**
 * Initialize workspace with Ralph state directory and template files
 */
module.exports = {
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
          await utils.writeFile(
            progressPath,
            [
              '# Ralph Progress Log',
              '',
              '## Codebase Patterns',
              '(Updated each iteration with general patterns and conventions)',
              '',
              '- (patterns will be added as discovered)',
              '',
              '## Iteration Log',
              '',
            ].join('\n')
          );
        }
      } catch (error) {
        console.warn('[ralph] Workspace init warning:', error.message);
      }

      return {};
    },
    priority: 20,
  },

  /**
   * Inject PRD context into every message sent to the agent
   * This ensures each fresh iteration has access to current state
   */
  onSendMessage: {
    handler: async (context) => {
      const { workspace, utils, content } = context;
      if (!utils || !content) return {};

      try {
        const prdPath = utils.join(workspace, PRD_FILENAME);
        const progressPath = utils.join(workspace, PROGRESS_FILENAME);

        // If no prd.json exists, let the agent handle setup mode
        if (!(await utils.exists(prdPath))) {
          return { content };
        }

        const prdContent = await utils.readFile(prdPath, 'utf-8');
        let prd;
        try {
          prd = JSON.parse(prdContent);
        } catch {
          return { content };
        }

        // Count completed vs total stories
        const total = prd.userStories ? prd.userStories.length : 0;
        const completed = prd.userStories
          ? prd.userStories.filter((s) => s.passes === true).length
          : 0;
        const remaining = total - completed;

        // Build context injection
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
        contextParts.push('Execute the next incomplete user story following the Ralph workflow.');
        contextParts.push('');

        // Append original user message if it's not just "continue"
        const trimmedContent = content.trim().toLowerCase();
        if (trimmedContent !== 'continue' && trimmedContent !== 'next' && trimmedContent !== 'ralph') {
          contextParts.push('Additional context from user: ' + content);
        }

        return { content: contextParts.join('\n') };
      } catch (error) {
        console.warn('[ralph] onSendMessage warning:', error.message);
        return { content };
      }
    },
    priority: 30,
  },

  /**
   * Handle first message - detect if we need setup mode or can start iteration
   */
  onFirstMessage: {
    handler: async (context) => {
      const { workspace, utils, content } = context;
      if (!utils || !content) return {};

      try {
        const prdPath = utils.join(workspace, PRD_FILENAME);

        if (await utils.exists(prdPath)) {
          // PRD exists - inject context for first iteration
          const prdContent = await utils.readFile(prdPath, 'utf-8');

          const prefix = [
            '[RALPH:SESSION_START]',
            'A PRD has been detected in the workspace. Beginning autonomous execution.',
            '',
            '--- Current PRD ---',
            prdContent,
            '',
            'Please start with the highest-priority incomplete user story.',
            '[RALPH:SESSION_CONTEXT_END]',
            '',
          ].join('\n');

          return { content: prefix + content };
        }

        // No PRD - enter setup mode
        const prefix = [
          '[RALPH:SETUP_MODE]',
          'No prd.json found in the workspace. Entering Setup Mode.',
          'Help the user create a structured PRD with properly sized and ordered user stories.',
          '[RALPH:SETUP_CONTEXT_END]',
          '',
        ].join('\n');

        return { content: prefix + content };
      } catch (error) {
        console.warn('[ralph] onFirstMessage warning:', error.message);
        return {};
      }
    },
    priority: 25,
  },
};
