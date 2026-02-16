# Agent Team Agile Methodology — Research & Design Proposal

## Problem Statement

How can multiple AI agents work together efficiently on complex tasks, burning down work over time and delivering a cohesive final result? Can we adopt established team methodologies (Agile, Scrum, Kanban) to coordinate agent teams?

---

## 1. What AionUi Already Has

AionUi already implements two multi-agent coordination patterns:

### Pattern A: TeamControl (Manager-Worker Validation Loop)

**Location:** `src/process/services/teamControl/`

A sequential validation loop where a Worker agent produces output and a Manager agent reviews it. If rejected, feedback loops back to the Worker (up to N iterations).

```
Objective → Worker → Output → Validator → Approved? → Done
                                  ↓ No
                              Feedback → Worker (retry)
```

**Strengths:** Guarantees quality through review gates.
**Weakness:** Sequential only, one task at a time, no parallelism.

### Pattern B: ResearchTeam (Concurrent Kanban-Style)

**Location:** `src/process/services/researchTeam/`

Multiple independent agents run in parallel with a shared `BoardManager` (`.team/board.md`). Agents coordinate via 3 team tools: `board_update`, `board_read`, `notify`.

```
Objective → Agent A ──→ (works independently, updates board)
          → Agent B ──→ (works independently, updates board)
          → Agent C ──→ (works independently, updates board)
                            ↕ board.md (shared state)
```

**Strengths:** Parallel execution, shared visibility, artifact-based coordination.
**Weakness:** No task decomposition, no dependency tracking, no burndown visibility, agents may duplicate work.

### Existing Infrastructure

| Component | Purpose | File |
|-----------|---------|------|
| `BoardManager` | Shared Kanban-style board file | `researchTeam/BoardManager.ts` |
| `ResearchEventBus` | Event/command messaging (broadcasts + directed) | `researchTeam/ResearchEventBus.ts` |
| `TeamToolDefinitions` | 3 coordination tools (board_update/read, notify) | `researchTeam/TeamToolDefinitions.ts` |
| `TeamOrchestrator` | Manager-worker validation loops | `teamControl/TeamOrchestrator.ts` |
| `TeamTaskBoard` | Mission-based task tracking | `teamControl/TeamTaskBoard.ts` |
| `MissionControl` | Persistent task storage in SQLite | `missionControl/` |
| `CronService` | Scheduled task execution | `cron/` |

---

## 2. Industry Research: Agile for Agent Teams (2025-2026)

### 2.1 Key Findings

**The consensus:** Agile methodologies are a force multiplier for AI agent teams, not a replacement. The most effective approach is **Hybrid Scrum-Kanban** — Kanban for exploratory work where timelines are fluid, Scrum sprints for well-defined engineering tasks.

**The 4-agent threshold:** Research shows performance saturates or degrades beyond 4 agents without structured topology. Coordination overhead scales quadratically — 200ms with 5 agents becomes 2 seconds with 50 agents.

**79% of multi-agent failures are coordination issues**, not technical failures (MAST taxonomy, NeurIPS 2025). Treating agent coordination like distributed systems engineering is the path to reliability.

**The winning topology:** Planner-Worker-Judge hierarchies consistently outperform flat swarms. Cursor's FastRender project (Jan 2026) tried equal-status agents with locking (failed — agents held locks too long), tried optimistic concurrency (failed — agents became risk-averse), then succeeded with Planners + Workers + Judges.

### 2.2 What Works in Practice

| Pattern | When to Use | Example |
|---------|-------------|---------|
| **Supervisor (Planner-Worker)** | Structured workflows, parallel task execution | Anthropic's C compiler: 16 agents, 2000 sessions |
| **Kanban Board** | Exploratory research, independent parallel work | AionUi's ResearchTeam already does this |
| **Sprint (Scrum)** | Well-defined deliverables with time-boxed iterations | Feature implementation with review gates |
| **Validation Loop** | Quality-critical output requiring approval | AionUi's TeamControl already does this |
| **Swarm** | Dynamic, adaptive work with overlapping capabilities | Steve Yegge's system: 20-30 parallel agents |

### 2.3 Critical Success Factors

1. **File/resource ownership** — Each agent owns specific files. Two agents editing the same file leads to overwrites.
2. **Structured task decomposition** — A planning agent breaks work into discrete, assignable units.
3. **Shared visibility** — All agents see the same task board and progress state.
4. **Circuit breakers** — Task limits, depth restrictions, and kill switches prevent runaway behavior.
5. **Human-on-the-loop** — Humans supervise, review, and plan; agents execute.

---

## 3. Proposed Methodology: "Agent Sprint"

A hybrid approach combining the best of Scrum, Kanban, and the Planner-Worker-Judge pattern, designed specifically for AI agent teams.

### 3.1 Core Concepts

```
┌─────────────────────────────────────────────────────────┐
│                    AGENT SPRINT                          │
│                                                          │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │ PLANNING │ →  │  EXECUTION   │ →  │   REVIEW     │   │
│  │  Phase   │    │   Phase      │    │   Phase      │   │
│  │          │    │              │    │              │   │
│  │ Planner  │    │ Worker A ──┐ │    │ Judge        │   │
│  │ agent    │    │ Worker B ──┤ │    │ agent        │   │
│  │ decomposes    │ Worker C ──┘ │    │ validates    │   │
│  │ the work │    │   (parallel) │    │ & aggregates │   │
│  └──────────┘    └──────────────┘    └──────────────┘   │
│       ↑                                     │            │
│       └──── Feedback loop (if rejected) ────┘            │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │            SHARED SPRINT BOARD                    │    │
│  │  Backlog → In Progress → In Review → Done         │    │
│  │  (visible to all agents + human observer)         │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Roles

| Role | Count | Responsibility |
|------|-------|---------------|
| **Planner** | 1 | Decomposes objective into tasks, assigns to workers, manages dependencies |
| **Worker** | 1-4 | Executes assigned tasks, updates board, produces artifacts |
| **Judge** | 1 | Reviews completed work, approves or rejects with feedback |
| **Human** | 1 | Observes progress, can intervene, approves final result |

### 3.3 Sprint Lifecycle

```
Phase 1: PLANNING (Planner agent)
  ├── Receives objective from human
  ├── Analyzes codebase (reads files, understands structure)
  ├── Decomposes into 3-6 discrete tasks
  ├── Assigns file ownership (each worker gets specific files)
  ├── Sets task dependencies (task B blocked until task A completes)
  └── Publishes sprint backlog to shared board

Phase 2: EXECUTION (Worker agents, parallel)
  ├── Each worker claims assigned tasks from the board
  ├── Workers move tasks: backlog → in_progress → done
  ├── Workers write artifacts to .team/artifacts/
  ├── Workers update board with progress
  ├── When blocked: notify planner for rebalancing
  └── Blocked tasks auto-unblock when dependencies complete

Phase 3: REVIEW (Judge agent)
  ├── Reads all completed artifacts
  ├── Validates against original objective
  ├── Runs verification (tests, lint, type-check)
  ├── If approved: sprint complete
  └── If rejected: creates fix-it tasks → back to Phase 2

Phase 4: HUMAN APPROVAL
  ├── Human reviews final result
  ├── Can accept, request changes, or extend with new sprint
  └── Sprint metrics displayed (tasks completed, iterations, time)
```

### 3.4 Sprint Board Schema

Extending the existing `BoardManager` with task-level tracking:

```typescript
type SprintTaskStatus = 'backlog' | 'in_progress' | 'in_review' | 'done' | 'blocked';

type SprintTask = {
  id: string;
  title: string;
  description: string;
  assigneeId: string | null;       // Worker agent ID
  status: SprintTaskStatus;
  dependencies: string[];           // Task IDs that must complete first
  fileOwnership: string[];          // Files this task owns (prevents conflicts)
  artifacts: string[];              // Produced artifact paths
  estimatedComplexity: 'S' | 'M' | 'L';  // T-shirt sizing
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  reviewNotes: string | null;       // Judge's feedback
};

type SprintBoard = {
  sessionId: string;
  objective: string;
  phase: 'planning' | 'execution' | 'review' | 'completed' | 'failed';
  iteration: number;                // Current sprint iteration (1, 2, ...)
  maxIterations: number;
  tasks: SprintTask[];
  agents: BoardAgentEntry[];        // Reuse existing type
  timeline: SprintEvent[];          // Chronological event log
  metrics: SprintMetrics;
};

type SprintMetrics = {
  totalTasks: number;
  completedTasks: number;
  blockedTasks: number;
  startedAt: number;
  estimatedCompletion: number | null;
  iterationCount: number;
  tokenUsage: Record<string, number>;  // Per-agent token tracking
};
```

### 3.5 Burndown Tracking

The sprint board naturally produces burndown data:

```
Tasks Remaining
  6 │ ████
  5 │ ████ ████
  4 │ ████ ████ ████
  3 │ ████ ████ ████ ████
  2 │ ████ ████ ████ ████ ████
  1 │ ████ ████ ████ ████ ████ ████
  0 │ ████ ████ ████ ████ ████ ████ ████
    └──────────────────────────────────→ Time
      T0   T1   T2   T3   T4   T5   T6

  ─── Ideal burndown (linear)
  ─── Actual burndown (step function as tasks complete)
  ─── Scope changes (tasks added by judge feedback)
```

**Data points collected over time:**

```typescript
type BurndownEntry = {
  timestamp: number;
  totalTasks: number;        // May increase if judge adds fix-it tasks
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  phase: SprintBoard['phase'];
};
```

The UI renders this as a real-time burndown chart showing:
- Tasks remaining vs. time
- Ideal linear burndown line
- Actual progress (step function)
- Scope changes (when judge adds tasks, the line goes up)
- Phase transitions (planning → execution → review → done)

---

## 4. Architecture: How This Maps to AionUi

### 4.1 Extending Existing Infrastructure

The Agent Sprint methodology builds on what AionUi already has:

```
EXISTING                           PROPOSED ENHANCEMENT
─────────────────────────────────────────────────────────
BoardManager (board.md)         →  SprintBoardManager (sprint-board.md)
  - Agent status tracking           + Task-level tracking
  - Activity log                    + Dependency graph
  - Artifact index                  + Burndown data
                                    + Phase management

ResearchTeamManager             →  SprintTeamManager
  - Concurrent agent launch         + Phased execution (plan→exec→review)
  - Board coordination              + Task assignment & ownership
  - Event-based observability       + Dependency auto-unblocking

ResearchEventBus                →  SprintEventBus (extend)
  - Events + Commands               + Phase transition events
  - Unified feed                    + Burndown snapshot events
                                    + Task state change events

TeamToolDefinitions             →  SprintToolDefinitions (extend)
  - board_update                    + task_claim (worker claims a task)
  - board_read                      + task_complete (worker finishes task)
  - notify                          + task_block (worker reports blocker)
                                    + request_review (trigger judge phase)

TeamOrchestrator                →  Reuse for judge validation loop
  - Worker → Validator loop         (unchanged, used in review phase)
```

### 4.2 New Components

```
src/process/services/sprintTeam/
├── SprintTeamManager.ts        # Orchestrates the 3-phase sprint
├── SprintBoardManager.ts       # Extended board with tasks & burndown
├── SprintPlanner.ts            # Runs planner agent, parses task list
├── SprintExecutor.ts           # Runs worker agents in parallel
├── SprintJudge.ts              # Runs judge agent, parses verdict
├── SprintToolDefinitions.ts    # Extended team tools for sprints
├── SprintEventBus.ts           # Sprint-specific events
├── types.ts                    # Sprint type definitions
└── prompts.ts                  # Role-specific prompt builders

src/renderer/pages/conversation/components/
├── SprintBoard.tsx             # Visual sprint board (Kanban columns)
├── SprintBurndown.tsx          # Burndown chart component
├── SprintTimeline.tsx          # Chronological event timeline
└── SprintControls.tsx          # Phase controls, manual intervention
```

### 4.3 Sprint Flow — Detailed Sequence

```
Human: "Add dark mode support to the settings page"
  │
  ▼
SprintTeamManager.startSprint({
  objective: "Add dark mode support to the settings page",
  workingDir: "/path/to/project",
  backends: { planner: 'claude', workers: 'claude', judge: 'claude' },
  maxIterations: 3,
  maxWorkers: 3,
})
  │
  ▼ Phase 1: PLANNING
SprintPlanner.plan(objective)
  │ → Spawns planner agent
  │ → Planner reads codebase, analyzes structure
  │ → Planner outputs structured task list:
  │
  │   Task 1: [S] Create ThemeContext provider
  │     files: src/renderer/context/ThemeContext.tsx
  │     deps: none
  │
  │   Task 2: [M] Add dark mode CSS variables
  │     files: src/renderer/styles/theme.css
  │     deps: none
  │
  │   Task 3: [M] Update Settings page with toggle
  │     files: src/renderer/pages/settings/index.tsx
  │     deps: [task-1]
  │
  │   Task 4: [S] Add persistence (localStorage)
  │     files: src/renderer/hooks/useTheme.ts
  │     deps: [task-1]
  │
  │ → SprintPlanner parses output into SprintTask[]
  │ → Board published: 4 tasks in backlog
  │
  ▼ Phase 2: EXECUTION (parallel workers)
SprintExecutor.execute(tasks, workers: 3)
  │
  │ Worker A claims Task 1 (no deps)     → backlog → in_progress
  │ Worker B claims Task 2 (no deps)     → backlog → in_progress
  │ Worker C waits (Task 3 & 4 blocked)
  │
  │ Worker A finishes Task 1             → in_progress → done
  │   → Task 3 auto-unblocked           → blocked → backlog
  │   → Task 4 auto-unblocked           → blocked → backlog
  │ Worker C claims Task 3              → backlog → in_progress
  │ Worker B finishes Task 2            → in_progress → done
  │ Worker B claims Task 4              → backlog → in_progress
  │ ...all tasks done
  │
  ▼ Phase 3: REVIEW
SprintJudge.review(tasks, artifacts)
  │ → Judge reads all artifacts
  │ → Judge runs tests/lint if possible
  │ → Verdict: APPROVED or REJECTED + feedback
  │
  │ If REJECTED:
  │   → Judge creates fix-it tasks
  │   → Back to Phase 2 (iteration++)
  │
  │ If APPROVED:
  │   → Sprint complete
  │
  ▼ Phase 4: HUMAN APPROVAL
UI shows:
  - Burndown chart (tasks over time)
  - Sprint board (final state)
  - All artifacts produced
  - Judge's review summary
  - [Accept] [Request Changes] [New Sprint]
```

---

## 5. Prompt Engineering for Each Role

### 5.1 Planner Agent Prompt

```
## Your Role: Sprint Planner

You are the planner for an agent team. Your job is to decompose a complex
objective into discrete, parallelizable tasks that can be executed by
independent worker agents.

### Rules
1. Create 3-6 tasks (not more — workers perform best with focused tasks)
2. Each task MUST specify file ownership (which files it creates/modifies)
3. NO two tasks may modify the same file (this causes conflicts)
4. Mark dependencies explicitly (task B depends on task A)
5. Estimate complexity: S (< 50 lines), M (50-200 lines), L (200+ lines)
6. Tasks should be independently verifiable

### Output Format
Produce a structured task list in this exact format:

TASK: <title>
COMPLEXITY: S|M|L
FILES: <comma-separated file paths this task owns>
DEPENDS: <comma-separated task numbers, or "none">
DESCRIPTION: <what the worker should do, specific enough to act on>
---
```

### 5.2 Worker Agent Prompt

```
## Your Role: Sprint Worker

You are a worker on an agent team. You have been assigned specific tasks
with clear file ownership.

### Rules
1. ONLY modify files assigned to your task (file ownership is strict)
2. Update the sprint board when you start and finish each task
3. Write artifacts to .team/artifacts/ for anything the judge needs to review
4. If blocked, use the task_block tool and explain what you need
5. Do NOT communicate with other workers — work independently
6. Focus on correctness over cleverness

### Your Assigned Tasks
{tasks}

### Sprint Board
{board_read}
```

### 5.3 Judge Agent Prompt

```
## Your Role: Sprint Judge

You review the completed work from all workers against the original objective.

### Review Checklist
1. Does the work fulfill the original objective?
2. Are there any bugs, type errors, or logic issues?
3. Do the changes integrate correctly with each other?
4. Are there any file conflicts or inconsistencies?
5. Would you ship this to production?

### If Approving
Output: VERDICT: APPROVED
Followed by a brief summary of what was accomplished.

### If Rejecting
Output: VERDICT: REJECTED
Followed by specific fix-it tasks in the same format as the planner:

FIX: <title>
FILES: <file paths>
DESCRIPTION: <what needs to change and why>
---
```

---

## 6. UI Design: Sprint Dashboard

### 6.1 Main Sprint View

```
┌──────────────────────────────────────────────────────────────────┐
│  Sprint: Add dark mode support           Phase: EXECUTION  2/3   │
│  Objective: Add dark mode to settings    Iteration: 1            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─ BACKLOG ──┐  ┌─ IN PROGRESS ─┐  ┌─ IN REVIEW ─┐  ┌─ DONE ─┐│
│  │            │  │ [M] Update    │  │              │  │ [S] Ctx ││
│  │            │  │ Settings page │  │              │  │ provider││
│  │            │  │ → Worker C    │  │              │  │         ││
│  │            │  │               │  │              │  │ [M] CSS ││
│  │            │  │ [S] Add       │  │              │  │ vars    ││
│  │            │  │ persistence   │  │              │  │         ││
│  │            │  │ → Worker B    │  │              │  │         ││
│  └────────────┘  └───────────────┘  └──────────────┘  └─────────┘│
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│  Burndown                              Agent Status               │
│  4 ┤ ■─────                            Worker A: idle (2 done)   │
│  3 ┤      ■───                         Worker B: working (1 done)│
│  2 ┤          ■──── (we are here)      Worker C: working (0 done)│
│  1 ┤              ····                 Judge: waiting              │
│  0 ┤                  ····(projected)  Planner: done              │
│    └─────────────────────→                                        │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│  Timeline                                                         │
│  12:01 Planner decomposed objective into 4 tasks                 │
│  12:02 Worker A started "Create ThemeContext provider"            │
│  12:02 Worker B started "Add dark mode CSS variables"            │
│  12:05 Worker A completed Task 1 → unblocked Task 3, Task 4     │
│  12:05 Worker C claimed "Update Settings page with toggle"       │
│  12:06 Worker B completed Task 2                                 │
│  12:06 Worker B claimed "Add persistence (localStorage)"         │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│  [Pause Sprint]  [Add Task]  [Send Message]       [Stop Sprint]  │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 Agent Detail View (click on agent)

```
┌─────────────────────────────────────────────────┐
│  Worker A — Claude (Sonnet)                      │
│  Status: idle | Tasks: 2 done, 0 in progress     │
├─────────────────────────────────────────────────┤
│                                                   │
│  [Live conversation stream from this agent]       │
│  Shows what the agent is doing in real-time       │
│                                                   │
│  > Reading src/renderer/context/ThemeContext.tsx   │
│  > Writing provider with light/dark support...    │
│  > Done. Updating board.                          │
│                                                   │
├─────────────────────────────────────────────────┤
│  [Send message to this agent]              [Send] │
└─────────────────────────────────────────────────┘
```

---

## 7. Comparison: Methodology × AionUi Feature

| Methodology | AionUi Feature | Status | Enhancement |
|-------------|---------------|--------|-------------|
| **Kanban Board** | ResearchTeam + BoardManager | Exists | Add task columns (backlog/progress/review/done) |
| **Sprint Planning** | — | New | Planner agent decomposes work into tasks |
| **Daily Standup** | board_read tool | Exists | Agents read board before starting work |
| **Sprint Execution** | ResearchTeam parallel workers | Exists | Add task claiming, file ownership, dependency tracking |
| **Sprint Review** | TeamControl validation loop | Exists | Judge reviews all artifacts, not just one output |
| **Burndown Chart** | — | New | Track tasks-over-time from sprint board events |
| **Retrospective** | — | New | Post-sprint metrics (tokens, time, iterations) |
| **Scrum Master** | — | New | Planner monitors for blocks, rebalances work |
| **Backlog Grooming** | — | Partial | Judge creates fix-it tasks when rejecting |
| **WIP Limits** | — | New | Limit tasks per worker (Kanban-style) |
| **Definition of Done** | Validator verdict | Exists | Judge checklist defines "done" |

---

## 8. Cost Optimization: The Plan-and-Execute Pattern

The dominant cost pattern in multi-agent systems: use a frontier model (Opus) for planning and judging, and cheaper models (Sonnet/Haiku) for execution.

```
Role        Model       Cost Ratio    Justification
─────────────────────────────────────────────────────
Planner     Opus        1x            Needs deep reasoning for decomposition
Worker A    Sonnet      0.2x          Executes specific, well-defined tasks
Worker B    Sonnet      0.2x          Executes specific, well-defined tasks
Worker C    Haiku       0.05x         Simple tasks (tests, formatting)
Judge       Opus        1x            Needs judgment for quality assessment
─────────────────────────────────────────────────────
Total: ~2.45x vs. 5x if all agents used Opus
       (up to 50% cost reduction)
```

This is already supported by AionUi's per-agent backend configuration in `ResearchAgentConfig`.

---

## 9. Risk Mitigation

### Known Failure Modes (from MAST taxonomy)

| Failure Mode | Mitigation in Agent Sprint |
|-------------|---------------------------|
| Specification ambiguity | Planner produces structured tasks with explicit file ownership |
| Agents talk past each other | Workers don't communicate — coordination is through the board only |
| Duplicate work | File ownership prevents two agents from touching the same files |
| No one validates assumptions | Judge phase explicitly validates all work |
| Runaway subtask creation | Max 6 tasks per sprint, max 3 iterations, max 4 workers |
| Context window exhaustion | Each agent is independent — no shared conversation history |
| File conflicts | Strict file ownership assigned during planning phase |

### Circuit Breakers

```typescript
const SPRINT_LIMITS = {
  maxTasks: 8,            // Max tasks per sprint
  maxWorkers: 4,          // Max parallel workers (the 4-agent threshold)
  maxIterations: 3,       // Max plan→execute→review cycles
  maxTokensPerAgent: 500_000,  // Kill switch per agent
  maxSprintDuration: 30 * 60 * 1000,  // 30 minute timeout
  maxArtifactSize: 100_000,  // 100KB per artifact file
};
```

---

## 10. Implementation Roadmap

### Phase 1: Sprint Board (extend existing)
- Extend `BoardManager` with task-level tracking (backlog/progress/review/done columns)
- Add dependency graph with auto-unblocking
- Add file ownership tracking per task
- Add burndown data collection

### Phase 2: Sprint Orchestrator
- Create `SprintTeamManager` combining planner → executor → judge phases
- Implement planner output parser (structured task list)
- Implement judge output parser (verdict + fix-it tasks)
- Wire up phase transitions with events

### Phase 3: Extended Team Tools
- Add `task_claim`, `task_complete`, `task_block` tools for workers
- Add `request_review` tool to trigger judge phase
- Update prompt builder for planner, worker, judge roles

### Phase 4: Sprint UI
- Sprint board view (4-column Kanban)
- Burndown chart component
- Timeline event log
- Agent detail view (live conversation stream)
- Sprint controls (pause, add task, send message, stop)

### Phase 5: Observability & Metrics
- Post-sprint report (tasks completed, iterations, tokens, time)
- Historical sprint tracking
- Per-agent performance metrics
- Cost breakdown by role

---

## 11. Summary

| Question | Answer |
|----------|--------|
| Can agents use Agile? | Yes — hybrid Scrum-Kanban works best |
| What topology works? | Planner-Worker-Judge (hierarchical, not flat swarm) |
| How many agents? | 3-6 total (1 planner, 1-4 workers, 1 judge) |
| How to prevent conflicts? | Strict file ownership assigned during planning |
| How to track progress? | Sprint board with burndown chart (tasks over time) |
| How to ensure quality? | Judge phase reviews all work before completion |
| How to control costs? | Frontier model plans/judges, cheaper models execute |
| What's the biggest risk? | Coordination failure (79% of multi-agent failures) |
| What's the mitigation? | Structured board, no inter-worker chat, circuit breakers |

The key insight: **agents work best when treated like a well-organized engineering team** — clear roles, explicit ownership, shared visibility, structured review gates, and bounded scope. The Agent Sprint methodology maps directly onto AionUi's existing infrastructure (BoardManager, ResearchTeam, TeamControl) and can be implemented incrementally.

---

## References

- Claude Code Agent Teams: https://code.claude.com/docs/en/agent-teams
- MAST Failure Taxonomy (NeurIPS 2025): https://arxiv.org/abs/2503.13657
- Intelligent AI Delegation Framework (Feb 2026): https://arxiv.org/html/2602.11865
- STACKPLANNER (Jan 2025): https://arxiv.org/pdf/2601.05890
- AgentOrchestra (Jun 2025): https://arxiv.org/html/2506.12508v1
- 17x Error Trap (multi-agent scaling): https://towardsdatascience.com/why-your-multi-agent-system-is-failing-escaping-the-17x-error-trap-of-the-bag-of-agents/
- European Scrum AI Agile Guide 2025: https://www.europeanscrum.org/uploads/2/4/5/1/24513648/ai_agile_guide_2025.v2.0_-_europeanscrum.org.pdf
- Cursor 2.0 Multi-Agent Architecture: https://devops.com/cursor-2-0-brings-faster-ai-coding-and-multi-agent-workflows/
- Anthropic 2026 Agentic Coding Trends Report: https://resources.anthropic.com/hubfs/2026%20Agentic%20Coding%20Trends%20Report.pdf
