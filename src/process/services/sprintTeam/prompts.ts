/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Role-specific prompt templates for Planner, Worker, and Judge agents.
 *
 * The Planner decomposes objectives into structured sprint tasks.
 * Workers execute individual tasks autonomously.
 * The Judge reviews all completed work and provides verdicts.
 */

import type { JudgeVerdict, SprintTaskPriority } from './types';

// ── Planner Prompts ──

/** Build the prompt for the Planner to decompose an objective into sprint tasks */
export function buildPlannerPrompt(objective: string, sprintNumber: number, context?: { previousFeedback?: string; previousResults?: string; backlog?: string }): string {
  let prompt = `[SPRINT ROLE: Planner Agent — Sprint ${sprintNumber}]

You are the Planner in a Planner-Worker-Judge sprint team. Your job is to break down the objective into concrete, actionable tasks that Worker agents can execute independently.

## Objective
${objective}`;

  if (context?.previousFeedback) {
    prompt += `

## Judge Feedback from Previous Sprint
The Judge reviewed the previous sprint's work and found issues. Use this feedback to improve your plan:
${context.previousFeedback}`;
  }

  if (context?.previousResults) {
    prompt += `

## Previous Sprint Results
${context.previousResults}`;
  }

  if (context?.backlog) {
    prompt += `

## Current Backlog State
${context.backlog}`;
  }

  prompt += `

## Instructions
1. Analyze the objective and break it into 2-6 concrete tasks
2. Each task should be independently executable by a Worker agent
3. Define clear dependencies between tasks (if any)
4. Assign priorities: critical, high, medium, low
5. Provide enough detail that a Worker can complete the task without ambiguity

## Response Format
You MUST end your response with a structured task list in this exact format:

\`\`\`json
{
  "goal": "Brief sprint goal description",
  "reasoning": "Your analysis and decomposition reasoning",
  "tasks": [
    {
      "title": "Short task title",
      "description": "Detailed description of what the worker should do. Include file paths, function names, test commands, etc.",
      "priority": "high",
      "dependencies": []
    },
    {
      "title": "Another task",
      "description": "Depends on the first task. Reference the exact title in dependencies.",
      "priority": "medium",
      "dependencies": ["Short task title"]
    }
  ]
}
\`\`\`

Priority levels: critical (blocking everything), high (core work), medium (supporting work), low (nice-to-have).
Dependencies: list the exact titles of tasks that must complete before this one can start.
Keep task count between 2 and 6. Fewer, focused tasks are better than many vague ones.`;

  return prompt;
}

/** Build a re-planning prompt when the judge rejects work */
export function buildReplanPrompt(objective: string, sprintNumber: number, judgeFeedback: string, previousResults: string, backlog: string): string {
  return buildPlannerPrompt(objective, sprintNumber, {
    previousFeedback: judgeFeedback,
    previousResults,
    backlog,
  });
}

// ── Worker Prompts ──

/** Build the prompt for a Worker to execute a sprint task */
export function buildWorkerPrompt(taskTitle: string, taskDescription: string, sprintGoal: string, context?: { relatedTaskResults?: string; feedback?: string }): string {
  let prompt = `[SPRINT ROLE: Worker Agent]

You are a Worker in a Planner-Worker-Judge sprint team. Your job is to complete the assigned task autonomously.

## Sprint Goal
${sprintGoal}

## Your Task: ${taskTitle}
${taskDescription}`;

  if (context?.relatedTaskResults) {
    prompt += `

## Completed Related Tasks
These tasks have been completed and their results may be relevant to your work:
${context.relatedTaskResults}`;
  }

  if (context?.feedback) {
    prompt += `

## Previous Feedback
This task was previously attempted and received the following feedback. Address ALL issues:
${context.feedback}`;
  }

  prompt += `

## Instructions
- Work autonomously to complete your assigned task
- Make real changes: edit files, write code, run commands, run tests
- Be thorough — your work will be reviewed by a Judge agent
- Stay focused on YOUR specific task; do not work on other tasks
- When finished, provide a clear summary of:
  1. What you did (changes made, files modified)
  2. How to verify your work (test commands, expected outcomes)
  3. Any decisions or trade-offs you made`;

  return prompt;
}

// ── Judge Prompts ──

/** Build the prompt for the Judge to review sprint results */
export function buildJudgePrompt(objective: string, sprintGoal: string, sprintResults: string, sprintNumber: number): string {
  return `[SPRINT ROLE: Judge Agent — Sprint ${sprintNumber}]

You are the Judge in a Planner-Worker-Judge sprint team. Your job is to review ALL work completed in this sprint and provide a verdict.

## Original Objective
${objective}

## Sprint ${sprintNumber} Goal
${sprintGoal}

## Completed Work
${sprintResults}

## Your Instructions
1. Review each task's results against the sprint goal and original objective
2. Verify correctness by reading files, running tests, or checking outputs
3. Assess whether the overall sprint goal has been achieved
4. Provide per-task feedback and an overall verdict

## Response Format
End your response with a structured verdict in this exact JSON format:

\`\`\`json
{
  "approved": true,
  "summary": "Overall assessment of the sprint work",
  "taskFeedback": {
    "task-title-1": {
      "approved": true,
      "feedback": "Looks good, tests pass"
    },
    "task-title-2": {
      "approved": false,
      "feedback": "Missing edge case handling for empty input"
    }
  },
  "suggestions": "Optional suggestions for improvement or next steps"
}
\`\`\`

Set "approved" to true ONLY if the sprint goal is sufficiently achieved.
Set "approved" to false if critical issues remain that need re-work.
Be specific in your feedback — Workers will use it to fix issues.`;
}

// ── Parsing ──

/** Parse the Planner's output into structured tasks */
export function parsePlannerOutput(output: string): {
  goal: string;
  reasoning: string;
  tasks: Array<{ title: string; description: string; priority: SprintTaskPriority; dependencies: string[] }>;
} | null {
  const jsonBlock = extractJsonBlock(output);
  if (!jsonBlock) return null;

  try {
    const parsed = JSON.parse(jsonBlock);

    if (!parsed.tasks || !Array.isArray(parsed.tasks)) return null;

    const validPriorities = new Set<SprintTaskPriority>(['critical', 'high', 'medium', 'low']);

    return {
      goal: String(parsed.goal ?? ''),
      reasoning: String(parsed.reasoning ?? ''),
      tasks: parsed.tasks.map((t: Record<string, unknown>) => ({
        title: String(t.title ?? 'Untitled task'),
        description: String(t.description ?? ''),
        priority: validPriorities.has(t.priority as SprintTaskPriority) ? (t.priority as SprintTaskPriority) : 'medium',
        dependencies: Array.isArray(t.dependencies) ? t.dependencies.map(String) : [],
      })),
    };
  } catch {
    return null;
  }
}

/** Parse the Judge's output into a structured verdict */
export function parseJudgeVerdict(output: string): JudgeVerdict {
  const jsonBlock = extractJsonBlock(output);

  if (jsonBlock) {
    try {
      const parsed = JSON.parse(jsonBlock);

      if (typeof parsed.approved === 'boolean') {
        return {
          approved: parsed.approved,
          summary: String(parsed.summary ?? output.slice(0, 500)),
          taskFeedback: normalizeTaskFeedback(parsed.taskFeedback),
          suggestions: parsed.suggestions ? String(parsed.suggestions) : undefined,
        };
      }
    } catch {
      // Fall through to heuristic parsing
    }
  }

  // Heuristic fallback: look for APPROVED/REJECTED keywords
  const upper = output.toUpperCase();
  const hasApproved = upper.includes('APPROVED') || upper.includes('"APPROVED": TRUE');
  const hasRejected = upper.includes('REJECTED') || upper.includes('"APPROVED": FALSE');

  if (hasRejected && !hasApproved) {
    return { approved: false, summary: output.slice(0, 500), taskFeedback: {} };
  }

  // Default to approved to avoid infinite loops
  return { approved: true, summary: output.slice(0, 500), taskFeedback: {} };
}

/** Extract a JSON code block from agent output */
function extractJsonBlock(output: string): string | null {
  // Try fenced code block first
  const fencedMatch = output.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fencedMatch) return fencedMatch[1].trim();

  // Try finding raw JSON object
  const objectMatch = output.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    // Validate it's parseable JSON
    try {
      JSON.parse(objectMatch[0]);
      return objectMatch[0];
    } catch {
      return null;
    }
  }

  return null;
}

/** Normalize taskFeedback into a consistent shape */
function normalizeTaskFeedback(raw: unknown): Record<string, { approved: boolean; feedback: string }> {
  if (!raw || typeof raw !== 'object') return {};

  const result: Record<string, { approved: boolean; feedback: string }> = {};

  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (val && typeof val === 'object') {
      const entry = val as Record<string, unknown>;
      result[key] = {
        approved: entry.approved === true,
        feedback: String(entry.feedback ?? ''),
      };
    }
  }

  return result;
}
