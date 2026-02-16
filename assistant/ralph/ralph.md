# Ralph - Multi-Agent Autonomous Task Execution System

Ralph is an autonomous AI system that implements product requirements through iterative execution using a **multi-agent architecture**. A supervisor orchestrates specialist sub-agents, each responsible for one aspect of the workflow.

---

## Architecture

Ralph uses 6 agents working together:

| Agent | Role | When Used |
|-------|------|-----------|
| **@ralph-supervisor** | Orchestrator - reads state, selects tasks, delegates | Every iteration (default agent) |
| **@prd-creator** | Generates/modifies structured PRDs from descriptions | Setup phase |
| **@prd-validator** | Validates PRD structure, sizing, dependencies | Before loop starts |
| **@implementer** | Implements a single user story | Each iteration |
| **@quality-checker** | Runs typecheck/lint/test/build, fixes failures | After each implementation |
| **@progress-tracker** | Updates prd.md, progress.txt, commits changes | After quality passes |

### Flow

```
User Request
    |
    v
@ralph-supervisor (reads state, decides what to do)
    |
    +---> No PRD? ---> @prd-creator ---> @prd-validator
    |
    +---> PRD exists? ---> Select next story
              |
              v
         @implementer (implements one story)
              |
              v
         @quality-checker (runs checks, fixes failures)
              |
              v
         @progress-tracker (updates state, commits)
              |
              v
         @ralph-supervisor (checks: all done? or continue?)
              |
              +---> Stories remain: <promise>CONTINUE</promise>
              +---> All complete: <promise>COMPLETE</promise>
```

---

## Core Principles

1. **Supervisor never implements** - It only reads state, makes decisions, and delegates
2. **One story per iteration** - Each loop cycle handles exactly one user story
3. **Fresh context, persistent memory** - State persists through `prd.md`, `progress.txt`, and git history
4. **Quality gates are mandatory** - @quality-checker must pass before @progress-tracker runs
5. **Full context on delegation** - Sub-agents start fresh; supervisor must provide all needed context

---

## State Files

### `prd.md` - Task List (Markdown Format)

```markdown
# PRD: ProjectName

**Branch**: `ralph/feature-name`

## Description
What we're building

## Stories

### [ ] US-001: Story title (P1)
As a [user], I want [capability] so that [benefit]

**Acceptance Criteria**
- [ ] Criterion 1
- [ ] Typecheck passes
- [ ] Tests pass

**Notes**

---

### [x] US-002: Completed story (P2)
As a [user], I want [capability] so that [benefit]

**Acceptance Criteria**
- [x] Criterion 1
- [x] Tests pass

---
```

**Key conventions:**
- `### [ ] US-XXX:` = pending story, `### [x] US-XXX:` = completed
- `(P1)` suffix = priority number
- Acceptance criteria use `- [ ]` / `- [x]` checkboxes
- To mark done: change `[ ]` to `[x]` in the `###` header

### `progress.txt` - Cumulative Learnings

```
# Ralph Progress Log

## Codebase Patterns
(General patterns reusable across iterations)

## Iteration Log
(Per-story entries with changes, learnings, gotchas)
```

### `.ralph/config.json` - Quality Check Commands

```json
{
  "maxIterations": 10,
  "qualityChecks": {
    "typecheck": "npm run typecheck",
    "lint": "npm run lint",
    "test": "npm test",
    "build": null
  }
}
```

---

## Completion Signals

The system monitors these signals from @ralph-supervisor:

- `<promise>COMPLETE</promise>` - All stories pass, loop ends
- `<promise>CONTINUE</promise>` - Stories remain, start new iteration

---

## Error Handling

| Error | Handler |
|-------|---------|
| Quality check fails | @quality-checker fixes and retries (max 3 attempts) |
| Story blocked by dependency | @ralph-supervisor skips to next story |
| PRD validation fails | @ralph-supervisor re-delegates to @prd-creator |
| Max iterations reached | @ralph-supervisor reports remaining stories |

---

## Status Messages

Structured status updates from @ralph-supervisor:

- `[RALPH:STATUS] Iteration N/M - Delegating US-XXX to @implementer`
- `[RALPH:STATUS] Delegating quality check to @quality-checker`
- `[RALPH:STATUS] Story US-XXX completed`
- `[RALPH:STATUS] All stories complete`
- `[RALPH:ERROR] Description`
- `[RALPH:BLOCKED] US-XXX blocked: reason`
