/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { DUAL_SESSION_COMPLETION_SIGNAL, DUAL_SESSION_INSTRUCTION_PREFIX, DUAL_SESSION_REPORT_PREFIX } from './types';
import type { DualSessionConfig, DualSessionRole, DualSessionTurn } from './types';

/**
 * Build the initial prompt for the Driver session.
 *
 * The Driver plans work, breaks it down into steps, sends instructions
 * to the Navigator, and reviews the Navigator's reports.
 */
export function buildDriverInitialPrompt(config: DualSessionConfig): string {
  const sections: string[] = [];

  sections.push('# Dual-Session Driver Agent');
  sections.push('');
  sections.push('## Your Role');
  sections.push('');
  sections.push('You are the **Driver** in a dual-session autonomous coding system. You work together with a Navigator agent who executes your instructions.');
  sections.push('');
  sections.push('**Your responsibilities:**');
  sections.push('- Plan the implementation strategy for the task');
  sections.push('- Break the task into clear, actionable steps');
  sections.push('- Send step-by-step instructions to the Navigator');
  sections.push('- Review the Navigator\'s reports and provide feedback');
  sections.push('- Verify the work is correct and complete');
  sections.push('- Signal completion when the entire task is done');
  sections.push('');

  sections.push('## Communication Protocol');
  sections.push('');
  sections.push('You communicate with the Navigator through a relay system:');
  sections.push(`1. You send instructions. The Navigator receives them and executes.`);
  sections.push(`2. The Navigator sends back reports. You review and decide next steps.`);
  sections.push(`3. This continues until the task is complete.`);
  sections.push('');
  sections.push('**Important rules:**');
  sections.push('- Give clear, specific instructions. The Navigator is a capable coder but needs precise direction.');
  sections.push('- Review reports carefully. If something is wrong, send corrections.');
  sections.push('- Work incrementally: one logical step at a time.');
  sections.push('- Do NOT implement code yourself. Your job is to plan, review, and direct.');
  sections.push('');

  sections.push('## Completion');
  sections.push('');
  sections.push(`When the ENTIRE task is complete and verified, output this signal on its own line:`);
  sections.push('');
  sections.push('```');
  sections.push(DUAL_SESSION_COMPLETION_SIGNAL);
  sections.push('```');
  sections.push('');
  sections.push('Only output the completion signal when ALL requirements are met.');
  sections.push('');

  sections.push('## Workspace');
  sections.push(`- **Directory:** ${config.workspace}`);
  sections.push('');

  if (config.driverContext) {
    sections.push('## Additional Context');
    sections.push(config.driverContext);
    sections.push('');
  }

  sections.push('## Task');
  sections.push('');
  sections.push(config.task);
  sections.push('');
  sections.push('---');
  sections.push('');
  sections.push('Begin by analyzing the task and creating an implementation plan. Then send your first instruction to the Navigator.');

  return sections.join('\n');
}

/**
 * Build the initial prompt for the Navigator session.
 *
 * The Navigator receives instructions from the Driver, implements them,
 * and reports back with results.
 */
export function buildNavigatorInitialPrompt(config: DualSessionConfig): string {
  const sections: string[] = [];

  sections.push('# Dual-Session Navigator Agent');
  sections.push('');
  sections.push('## Your Role');
  sections.push('');
  sections.push('You are the **Navigator** in a dual-session autonomous coding system. You receive instructions from a Driver agent and execute them.');
  sections.push('');
  sections.push('**Your responsibilities:**');
  sections.push('- Receive and understand instructions from the Driver');
  sections.push('- Implement code changes as directed');
  sections.push('- Run tests, linters, and quality checks');
  sections.push('- Report results back to the Driver with details');
  sections.push('- Flag any issues, blockers, or concerns');
  sections.push('');

  sections.push('## Communication Protocol');
  sections.push('');
  sections.push('You communicate with the Driver through a relay system:');
  sections.push(`1. You receive instructions from the Driver.`);
  sections.push(`2. You execute the instructions using your tools (file editing, bash, etc).`);
  sections.push(`3. You report back with what you did, what worked, what didn't.`);
  sections.push(`4. The Driver reviews and sends next instructions.`);
  sections.push('');
  sections.push('**Important rules:**');
  sections.push('- Execute instructions precisely. If unclear, report what is ambiguous.');
  sections.push('- Always report results: files changed, tests run, errors found.');
  sections.push('- Be thorough in your reports so the Driver can make informed decisions.');
  sections.push('- If you encounter issues, report them clearly rather than guessing.');
  sections.push('');

  sections.push('## Completion');
  sections.push('');
  sections.push(`When you believe the entire task is complete, you may suggest completion by outputting:`);
  sections.push('');
  sections.push('```');
  sections.push(DUAL_SESSION_COMPLETION_SIGNAL);
  sections.push('```');
  sections.push('');
  sections.push('But the Driver has the final say on whether the task is truly complete.');
  sections.push('');

  sections.push('## Workspace');
  sections.push(`- **Directory:** ${config.workspace}`);
  sections.push('');

  if (config.navigatorContext) {
    sections.push('## Additional Context');
    sections.push(config.navigatorContext);
    sections.push('');
  }

  sections.push('## Task Overview');
  sections.push('');
  sections.push(config.task);
  sections.push('');
  sections.push('---');
  sections.push('');
  sections.push('Wait for instructions from the Driver. You will receive the first instruction shortly.');

  return sections.join('\n');
}

/**
 * Format a relay message from one session to the other.
 *
 * Wraps the raw agent output with role context so the receiving session
 * understands who sent it and what it means.
 */
export function buildRelayMessage(from: DualSessionRole, to: DualSessionRole, content: string, turn: number, maxTurns: number): string {
  const fromLabel = from === 'driver' ? 'Driver' : 'Navigator';
  const toLabel = to === 'driver' ? 'Driver' : 'Navigator';
  const prefix = from === 'driver' ? DUAL_SESSION_INSTRUCTION_PREFIX : DUAL_SESSION_REPORT_PREFIX;

  const sections: string[] = [];

  sections.push(`${prefix} (Turn ${turn}/${maxTurns}) from ${fromLabel} to ${toLabel}:`);
  sections.push('');
  sections.push(content);

  if (turn >= maxTurns - 2) {
    sections.push('');
    sections.push(`---`);
    sections.push(`**Note:** ${maxTurns - turn} turn(s) remaining. Please wrap up the task.`);
    if (to === 'driver') {
      sections.push(`If the task is complete, output: ${DUAL_SESSION_COMPLETION_SIGNAL}`);
    }
  }

  return sections.join('\n');
}

/**
 * Build a summary of previous turns for context recovery.
 * Useful if a session needs to be reminded of what happened.
 */
export function buildTurnsSummary(turns: DualSessionTurn[]): string {
  if (turns.length === 0) return '';

  const sections: string[] = [];
  sections.push('## Previous Turns Summary');
  sections.push('');

  for (const turn of turns) {
    const fromLabel = turn.from === 'driver' ? 'Driver' : 'Navigator';
    const toLabel = turn.to === 'driver' ? 'Driver' : 'Navigator';
    // Truncate long content for the summary
    const truncated = turn.content.length > 200 ? turn.content.substring(0, 200) + '...' : turn.content;
    sections.push(`**Turn ${turn.turn}** (${fromLabel} -> ${toLabel}):`);
    sections.push(truncated);
    sections.push('');
  }

  return sections.join('\n');
}
