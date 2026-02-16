# Ralph — Multi-Agent Autonomous Task Execution

## Overview

Ralph is a multi-agent autonomous system that implements product requirements through iterative execution. A supervisor agent orchestrates specialist sub-agents, each handling one aspect of the development workflow.

## Agents

| Agent | Responsibility |
|-------|---------------|
| `@ralph-supervisor` | Orchestrator: reads state, selects stories, delegates to specialists |
| `@prd-creator` | Creates and modifies structured PRDs from feature descriptions |
| `@prd-validator` | Validates PRD structure, story sizing, dependency ordering |
| `@implementer` | Implements a single user story with minimal, focused changes |
| `@quality-checker` | Runs typecheck/lint/test/build and fixes failures |
| `@progress-tracker` | Updates prd.json status, appends to progress.txt, commits |

## Triggers

- **"generate prd"**, **"create prd"**, **"plan feature"** → Supervisor delegates to @prd-creator
- **"validate stories"**, **"check prd"** → Supervisor delegates to @prd-validator
- **"start ralph"**, **"run ralph"**, **"begin autonomous"** → Supervisor starts the iteration loop
- **"run quality checks"** → Supervisor delegates to @quality-checker

## Iteration Loop

Each iteration follows this delegation chain:

1. **@ralph-supervisor** reads `prd.json` and `progress.txt`, selects next story
2. **@implementer** receives the story and implements it
3. **@quality-checker** runs all quality gates, fixes any failures
4. **@progress-tracker** marks the story complete, records learnings, commits
5. **@ralph-supervisor** checks if all stories pass
   - If done: outputs `<promise>COMPLETE</promise>`
   - If remaining: outputs `<promise>CONTINUE</promise>`

## PRD JSON Format

```json
{
  "project": "ProjectName",
  "branchName": "ralph/feature-name",
  "description": "Brief description",
  "userStories": [
    {
      "id": "US-001",
      "title": "Story title",
      "description": "As a [user], I want [capability] so that [benefit]",
      "acceptanceCriteria": ["Criterion 1", "Typecheck passes", "Tests pass"],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

## Story Sizing Rules

- Each story must complete in ONE iteration (one agent context)
- Dependencies flow forward: infrastructure → logic → UI → integration
- Maximum 5-7 acceptance criteria per story
- Always include "Typecheck passes" and "Tests pass"
- Criteria must be objectively verifiable (no "good UX")

## Error Recovery

- Quality check fails → @quality-checker fixes (max 3 attempts)
- Story blocked → @ralph-supervisor skips to next story
- PRD invalid → @ralph-supervisor re-delegates to @prd-creator
- Max iterations → @ralph-supervisor reports remaining stories
