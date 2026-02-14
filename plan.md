# Mission Control Module — Design Plan

## Problem

The current `TeamMonitorService` reads Claude Code's native `~/.claude/tasks/` files every 2–3s and holds them in memory only. Tasks are ephemeral — when monitoring stops, all state is lost. There's no history, no progress tracking, no enriched metadata. The UI shows raw task snapshots with no context about _when_ things happened or _how_ they progressed.

## Goal

Build a **MissionControl** module that:
1. Syncs Claude Code's native task files into a persistent SQLite table
2. Enriches tasks with timestamps, history, and AionUi-specific metadata
3. Exposes missions via IPC for a richer UI experience
4. Lays groundwork for bidirectional sync (UI → Claude task files) later

## Architecture Overview

```
~/.claude/tasks/{team}/          MissionSyncService          SQLite (missions table)
  ┌──────────────┐       ┌─────────────────────┐       ┌──────────────────┐
  │ tasks.json   │──────>│  diffAndSync()       │──────>│  MissionStore    │
  │ tasks.jsonl  │ poll  │  - detect new tasks  │ upsert│  - insert/update │
  └──────────────┘  2s   │  - detect state Δ    │       │  - query         │
                         │  - record transitions│       └────────┬─────────┘
                         └──────────┬───────────┘                │
                                    │ emit events                │ read
                                    ▼                            ▼
                         ┌──────────────────────┐   ┌──────────────────────┐
                         │  IPC Bridge           │   │  Renderer Context    │
                         │  missionControl.*     │──>│  useMissionControl() │
                         └──────────────────────┘   └──────────────────────┘
```

## Step-by-step Plan

### Step 1: Common types — `src/common/missionControl.ts`

New types extending the existing `TeamTask`:

```ts
type MissionState = 'pending' | 'in_progress' | 'completed' | 'blocked';

type Mission = {
  id: string;                    // from Claude's task id
  externalId: string;            // original id from Claude file
  conversationId: string;        // which conversation owns this
  teamName: string;              // which team
  subject: string;               // task title
  description?: string;
  state: MissionState;
  assignee?: string;             // agent name
  dependencies?: string[];
  // Enriched fields (not in Claude's files)
  createdAt: number;             // first seen timestamp
  updatedAt: number;             // last state change
  startedAt?: number;            // when moved to in_progress
  completedAt?: number;          // when moved to completed
  stateHistory: StateTransition[];  // full audit trail
  source: 'claude_file' | 'user'; // who created it
};

type StateTransition = {
  from: MissionState;
  to: MissionState;
  at: number;                    // timestamp
  triggeredBy?: string;          // agent name or 'user'
};

type MissionControlEvent =
  | { type: 'missions_synced'; data: { teamName: string; missions: Mission[] } }
  | { type: 'mission_updated'; data: Mission };
```

### Step 2: DB migration v17 — `missions` table

Add to `src/process/database/migrations.ts`:

```sql
CREATE TABLE IF NOT EXISTS missions (
  id TEXT PRIMARY KEY,
  external_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  state TEXT NOT NULL DEFAULT 'pending',
  assignee TEXT,
  dependencies TEXT,            -- JSON array
  source TEXT NOT NULL DEFAULT 'claude_file',
  state_history TEXT,           -- JSON array of transitions
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER
);

CREATE INDEX idx_missions_conversation ON missions(conversation_id);
CREATE INDEX idx_missions_team ON missions(team_name);
CREATE INDEX idx_missions_state ON missions(state);
CREATE UNIQUE INDEX idx_missions_external ON missions(conversation_id, team_name, external_id);
```

The unique index on `(conversation_id, team_name, external_id)` enables upsert sync — same external task ID in the same team/conversation always maps to one mission row.

### Step 3: MissionStore — `src/process/services/missionControl/MissionStore.ts`

Follows the `CronStore` pattern exactly:
- `upsert(mission)` — INSERT OR UPDATE (key for sync)
- `getById(id)`
- `listByConversation(conversationId)`
- `listByTeam(teamName)`
- `updateState(id, newState, triggeredBy?)` — appends to stateHistory, updates timestamps
- `deleteByConversation(conversationId)`

### Step 4: MissionSyncService — `src/process/services/missionControl/MissionSyncService.ts`

Core sync logic. Called by `TeamMonitorService` when `task_update` events fire:

```ts
class MissionSyncService {
  /** Sync Claude task files → missions table */
  syncFromClaudeTasks(
    conversationId: string,
    teamName: string,
    claudeTasks: TeamTask[]
  ): Mission[] {
    const existing = missionStore.listByTeam(teamName);
    const existingMap = new Map(existing.map(m => [m.externalId, m]));

    for (const task of claudeTasks) {
      const current = existingMap.get(task.id);
      if (!current) {
        // New task — insert
        missionStore.upsert(taskToMission(task, conversationId, teamName));
      } else if (current.state !== mapState(task.state)) {
        // State changed — update with history
        missionStore.updateState(current.id, mapState(task.state), task.assignee);
      }
    }
    return missionStore.listByTeam(teamName);
  }
}
```

### Step 5: Wire into TeamMonitorService

In `TeamMonitorService.pollTasks()`, after emitting `task_update`, also call:
```ts
missionSyncService.syncFromClaudeTasks(this.conversationId, teamName, tasks);
```

This keeps the sync purely additive — existing team monitoring is untouched.

### Step 6: IPC bridge — `missionControl` namespace

Add to `src/common/ipcBridge.ts`:
```ts
export const missionControl = {
  getMissions: bridge.buildProvider<IBridgeResponse<Mission[]>, { conversationId: string }>('mission-control.get-missions'),
  getMission: bridge.buildProvider<IBridgeResponse<Mission | null>, { id: string }>('mission-control.get-mission'),
  onMissionsSync: bridge.buildEmitter<{ teamName: string; missions: Mission[] }>('mission-control.missions-synced'),
  onMissionUpdate: bridge.buildEmitter<Mission>('mission-control.mission-updated'),
};
```

Add `src/process/bridge/missionControlBridge.ts` to wire handlers.

### Step 7: Renderer context — `useMissionControl()`

Add `src/renderer/context/MissionControlContext.tsx`:
- Subscribes to `missionControl.onMissionsSync` and `missionControl.onMissionUpdate`
- Exposes `missions: Mission[]` for UI consumption
- Integrates with existing `TeamMonitorContext` (reads `conversationId`)

## Files to create/modify

| File | Action | Purpose |
|------|--------|---------|
| `src/common/missionControl.ts` | **Create** | Types: Mission, StateTransition, events |
| `src/process/database/migrations.ts` | **Modify** | Add migration v17: missions table |
| `src/process/services/missionControl/MissionStore.ts` | **Create** | SQLite CRUD for missions |
| `src/process/services/missionControl/MissionSyncService.ts` | **Create** | Claude files → DB sync logic |
| `src/process/services/teamMonitor/TeamMonitorService.ts` | **Modify** | Call sync after task polling |
| `src/common/ipcBridge.ts` | **Modify** | Add missionControl namespace |
| `src/process/bridge/missionControlBridge.ts` | **Create** | IPC handlers |
| `src/renderer/context/MissionControlContext.tsx` | **Create** | React context + hook |
| `tests/unit/MissionStore.test.ts` | **Create** | Store unit tests |
| `tests/unit/MissionSyncService.test.ts` | **Create** | Sync logic tests |

## Design decisions

1. **Claude files remain source of truth** — We only read, never write back (yet). This avoids race conditions with Claude's own file management.
2. **Upsert by external_id** — The unique index `(conversation_id, team_name, external_id)` means repeated syncs are idempotent.
3. **State history is append-only JSON** — Stored as a JSON text column. Simple, queryable enough for our needs, avoids a separate transitions table.
4. **Additive integration** — `TeamMonitorService` continues to work exactly as before. `MissionSyncService` is called _after_ existing task polling, so it can't break team monitoring.
5. **No UI changes in this phase** — Context + hook only. UI components come in a follow-up.
