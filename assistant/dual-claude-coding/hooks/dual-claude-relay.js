/**
 * Dual Claude Coding — Driver/Navigator Relay Hook
 *
 * Implements pair-programming via a self-feeding loop within a single
 * Claude conversation. The agent alternates between Driver and Navigator
 * roles using structured handoff tags.
 *
 * Architecture:
 * - STATE:    .dual-claude/state.json — current role, turn count, plan
 * - INTENT:   .dual-claude/task.md — the user's original task (North Star)
 * - DRIVER:   Plans, reviews, gives instructions via <handoff role="navigator">
 * - NAVIGATOR: Implements, tests, reports via <handoff role="driver">
 * - LOG:      .dual-claude/relay.log — auto-logged turn history
 *
 * Flow:
 * 1. User sends: "Implement feature X"
 * 2. onQueueInit → saves task.md → queues Driver's first planning turn
 * 3. Driver analyzes, plans, sends instruction via <handoff role="navigator">
 * 4. onAgentResponse → parses handoff → wraps with Navigator context → queues
 * 5. Navigator implements, reports via <handoff role="driver">
 * 6. onAgentResponse → parses handoff → wraps with Driver context → queues
 * 7. Loop continues until <done/> or max turns reached
 */

const MAX_TURNS = 20;
const SEPARATOR = '\n\n---\n\n';

// ─── Parsing Helpers ─────────────────────────────────────────────────

/**
 * Parse <handoff role="...">content</handoff> from agent output.
 * Returns { role, content } or null.
 */
function parseHandoff(output) {
  if (!output) return null;
  const match = output.match(/<handoff\s+role="(driver|navigator)">([\s\S]*?)<\/handoff>/);
  if (!match) return null;
  return { role: match[1], content: match[2].trim() };
}

/**
 * Check for completion signal.
 */
function isDone(output) {
  if (!output) return false;
  return /<done\s*\/?>/.test(output) || /<dual-session>\s*DONE\s*<\/dual-session>/.test(output);
}

/**
 * Extract summary from agent output (first substantive paragraph).
 */
function extractSummary(output) {
  if (!output) return 'Turn completed.';
  const paragraphs = output
    .split('\n\n')
    .map((p) => p.trim())
    .filter((p) => p.length > 20 && !p.startsWith('#') && !p.startsWith('```') && !p.startsWith('<'));
  return (paragraphs[0] || 'Turn completed.').slice(0, 300);
}

// ─── State Management ────────────────────────────────────────────────

function readState(fs, statePath) {
  try {
    if (fs.existsSync(statePath)) {
      return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    }
  } catch {
    // Malformed state — start fresh
  }
  return { currentRole: 'driver', turn: 0, maxTurns: MAX_TURNS, status: 'running' };
}

function writeState(fs, statePath, state) {
  try {
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
  } catch {
    // Non-fatal
  }
}

function appendLog(fs, logPath, entry) {
  const lines = [`## Turn ${entry.turn} — ${entry.role.toUpperCase()}`, `**Time:** ${new Date().toISOString()}`, '', entry.summary, ''];

  try {
    let existing = '';
    if (fs.existsSync(logPath)) {
      existing = fs.readFileSync(logPath, 'utf-8');
    }
    if (!existing.trim()) {
      fs.writeFileSync(logPath, `# Dual Claude Relay Log\n${SEPARATOR}${lines.join('\n')}`, 'utf-8');
    } else {
      fs.writeFileSync(logPath, `${existing.trimEnd()}${SEPARATOR}${lines.join('\n')}`, 'utf-8');
    }
  } catch {
    // Non-fatal
  }
}

// ─── Role Prompts ────────────────────────────────────────────────────

function buildDriverPrompt(instruction, turn, maxTurns) {
  return [
    `## Driver Turn ${turn}/${maxTurns}`,
    '',
    'You are the **Driver** — you plan, review, and direct. You do NOT write code.',
    '',
    turn === 1 ? ['Read `.dual-claude/task.md` for the original task.', '', '**Your job this turn:**', '1. Analyze the task and the codebase', '2. Create a step-by-step implementation plan', '3. Send the first instruction to the Navigator', ''].join('\n') : ["**Navigator's report:**", '', instruction, '', '**Your job this turn:**', "1. Review the Navigator's work", '2. Check for correctness, edge cases, missed requirements', '3. Either give the next instruction or signal completion', ''].join('\n'),
    '**Communication:** Write your instruction inside a handoff tag:',
    '```',
    '<handoff role="navigator">Your specific instruction here</handoff>',
    '```',
    '',
    'When ALL work is done and verified, output `<done/>` instead.',
  ].join('\n');
}

function buildNavigatorPrompt(instruction, turn, maxTurns) {
  return [`## Navigator Turn ${turn}/${maxTurns}`, '', 'You are the **Navigator** — you implement code, run tests, and report results.', '', "**Driver's instruction:**", '', instruction, '', '**Your job this turn:**', '1. Implement the changes as instructed', '2. Run tests if the project has them', '3. Report what you did: files changed, tests run, issues found', '', '**Communication:** Write your report inside a handoff tag:', '```', '<handoff role="driver">Your report here</handoff>', '```', '', 'If the task is fully complete and verified, output `<done/>` instead.'].join('\n');
}

// ─── Hook Exports ────────────────────────────────────────────────────

module.exports = {
  /**
   * onQueueInit — Save the task and seed the Driver's first turn.
   */
  onQueueInit: {
    handler: async (context) => {
      if (!context.backend) return {};

      const userRequest = (context.content || '').trim();
      if (!userRequest) return {};

      const fs = require('fs');
      const path = require('path');
      const stateDir = path.join(context.workspace, '.dual-claude');

      try {
        if (!fs.existsSync(stateDir)) {
          fs.mkdirSync(stateDir, { recursive: true });
        }

        // Save original task
        fs.writeFileSync(path.join(stateDir, 'task.md'), ['# Task', '', userRequest, '', '---', `*Captured: ${new Date().toISOString()}*`].join('\n'), 'utf-8');

        // Initialize state
        writeState(fs, path.join(stateDir, 'state.json'), {
          currentRole: 'driver',
          turn: 1,
          maxTurns: MAX_TURNS,
          status: 'running',
        });
      } catch {
        // Non-fatal
      }

      return {
        queueMessages: [
          {
            content: buildDriverPrompt(null, 1, MAX_TURNS),
            priority: 'normal',
            source: 'system',
          },
        ],
      };
    },
    priority: 50,
  },

  /**
   * onAgentResponse — Parse handoff and relay to the next role.
   */
  onAgentResponse: {
    handler: async (context) => {
      if (!context.backend || !context.workspace) return {};

      const agentOutput = context.content || '';
      const fs = require('fs');
      const path = require('path');
      const stateDir = path.join(context.workspace, '.dual-claude');
      const statePath = path.join(stateDir, 'state.json');
      const logPath = path.join(stateDir, 'relay.log');

      const state = readState(fs, statePath);

      // Auto-log this turn
      appendLog(fs, logPath, {
        turn: state.turn,
        role: state.currentRole,
        summary: extractSummary(agentOutput),
      });

      // Check completion
      if (isDone(agentOutput)) {
        state.status = 'done';
        writeState(fs, statePath, state);
        return {};
      }

      // Safety valve
      if (state.turn >= state.maxTurns) {
        state.status = 'max_turns_reached';
        writeState(fs, statePath, state);
        return {
          queueMessages: [
            {
              content: ['## Dual Claude — Turn Limit Reached', '', `You have reached the maximum of ${state.maxTurns} turns.`, 'Please wrap up:', '', '1. Summarize what was accomplished', '2. List any remaining work', '3. Output `<done/>`'].join('\n'),
              priority: 'normal',
              source: 'system',
            },
          ],
        };
      }

      // Parse handoff
      const handoff = parseHandoff(agentOutput);
      if (!handoff) {
        // No handoff tag — the loop ends naturally
        state.status = 'done';
        writeState(fs, statePath, state);
        return {};
      }

      // Advance state
      const nextTurn = state.turn + 1;
      state.currentRole = handoff.role;
      state.turn = nextTurn;
      writeState(fs, statePath, state);

      // Build the prompt for the next role
      const nextPrompt = handoff.role === 'driver' ? buildDriverPrompt(handoff.content, nextTurn, state.maxTurns) : buildNavigatorPrompt(handoff.content, nextTurn, state.maxTurns);

      return {
        queueMessages: [
          {
            content: nextPrompt,
            priority: 'normal',
            source: 'system',
          },
        ],
      };
    },
    priority: 50,
  },
};
