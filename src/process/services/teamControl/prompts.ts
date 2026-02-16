/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Role-specific prompt templates for team agents.
 *
 * These are prepended to the user's task when sending messages
 * to agents. They define the agent's role and expected behavior.
 */

/** Build the prompt sent to the worker agent */
export function buildWorkerPrompt(task: string, description?: string, feedback?: string): string {
  let prompt = `[TEAM ROLE: Worker Agent]
You are a Worker agent in a collaborative team. Your job is to complete the assigned task autonomously.

## Your Task
${task}`;

  if (description) {
    prompt += `\n\n## Details\n${description}`;
  }

  if (feedback) {
    prompt += `\n\n## Feedback from Reviewer
The reviewer found issues with your previous work. Address ALL of the following:
${feedback}`;
  }

  prompt += `\n
## Instructions
- Work autonomously to complete the task
- Make real changes (edit files, write code, run commands)
- Be thorough — the output will be reviewed by another agent
- When finished, provide a clear summary of what you did and any decisions you made`;

  return prompt;
}

/** Build the prompt sent to the validator/manager agent */
export function buildValidatorPrompt(task: string, workerOutput: string, description?: string): string {
  let prompt = `[TEAM ROLE: Validator Agent]
You are a Validator agent in a collaborative team. Your job is to review work done by a Worker agent.

## Original Task
${task}`;

  if (description) {
    prompt += `\n\n## Task Details\n${description}`;
  }

  prompt += `\n
## Worker's Output
${workerOutput}

## Your Instructions
1. Review the changes the worker made
2. Check that the work actually addresses the task requirements
3. Run tests or verify correctness if applicable
4. Provide your assessment

## Response Format
End your response with exactly one of these verdicts on its own line:

**VERDICT: APPROVED** — if the work is correct and complete
**VERDICT: REJECTED** — if the work has issues that need fixing

If rejected, explain clearly what needs to be fixed so the worker can address it.`;

  return prompt;
}

/** Parse the validator's output to determine approval/rejection */
export function parseValidatorVerdict(output: string): { approved: boolean; feedback: string } {
  const lines = output.split('\n');

  // Search from the end for the verdict line
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim().toUpperCase();
    if (line.includes('VERDICT:') && line.includes('APPROVED')) {
      return { approved: true, feedback: output };
    }
    if (line.includes('VERDICT:') && line.includes('REJECTED')) {
      return { approved: false, feedback: output };
    }
  }

  // If no explicit verdict, check for common patterns
  const upper = output.toUpperCase();
  if (upper.includes('APPROVED') && !upper.includes('REJECTED')) {
    return { approved: true, feedback: output };
  }
  if (upper.includes('REJECTED')) {
    return { approved: false, feedback: output };
  }

  // Default: assume approved if no clear signal (avoid infinite loops)
  return { approved: true, feedback: output };
}
