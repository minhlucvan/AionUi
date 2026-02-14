# Agent Team Feature - Design Proposal

## Overview

Add an **Agent Team** feature to AionUi that lets users define and launch coordinated multi-agent teams from bot mode. Each team consists of multiple Claude Code (ACP) sessions working together, with a tabbed conversation UI where each tab connects to one team member.

---

## 1. Claude Agent Teams - Key Concepts

Reference: https://code.claude.com/docs/en/agent-teams

Claude Agent Teams is an experimental feature that coordinates multiple Claude Code instances:

| Component      | Description                                                    |
| -------------- | -------------------------------------------------------------- |
| **Team Lead**  | Main session that creates the team, assigns tasks, synthesizes |
| **Teammates**  | Independent Claude Code instances working on assigned tasks    |
| **Task List**  | Shared work items that teammates claim and complete            |
| **Mailbox**    | Messaging system for inter-agent communication                 |

Key properties:
- Each teammate has its own context window (independent sessions)
- Teammates can message each other directly (not just report to lead)
- Shared task list with states: pending, in-progress, completed
- Task dependencies: blocked tasks auto-unblock when dependencies complete
- Lead can require plan approval before teammates implement

---

## 2. Architecture Decision

### Option A: Use Claude's Native Agent Teams (Not Recommended)

Spawn one ACP session, tell it to create a team. Claude Code handles teammate spawning internally.

**Problems:**
- Teammates are subprocess of the lead CLI, not accessible to AionUi
- No way to connect each teammate to a separate UI tab
- Experimental feature, may change without notice
- AionUi loses control over lifecycle and routing

### Option B: AionUi-Orchestrated Teams (Recommended)

AionUi acts as the team orchestrator, spawning independent ACP sessions for each member and implementing coordination (task list, messaging) at the application level.

**Advantages:**
- Full control over UI (each member = a conversation tab)
- Leverages existing `AcpAgentManager` infrastructure
- Task list and messaging managed by AionUi with proper UI
- Each member's conversation is stored in the database
- Works with any ACP backend, not just Claude
- No dependency on experimental CLI features

**The "under the hood" aspect:** Each team member IS a Claude Code session (via ACP). The orchestration patterns (task list, roles, coordination) mirror Claude Agent Teams, but the orchestrator is AionUi instead of a lead CLI session.

---

## 3. Data Model

### 3.1 Team Definition

Stored in ConfigStorage under `'agent.teams'`:

```typescript
// src/common/team.ts

type TeamMemberRole = 'lead' | 'member';

interface ITeamMemberDefinition {
  id: string;                      // UUID
  name: string;                    // e.g., "Frontend Engineer"
  role: TeamMemberRole;
  systemPrompt: string;            // Role-specific instructions
  backend?: AcpBackend;            // Default: 'claude'
  model?: string;                  // e.g., 'sonnet', 'opus'
  presetAssistantId?: string;      // Reuse existing assistant presets
  skills?: string[];               // Enabled skills for this member
}

interface ITeamDefinition {
  id: string;                      // UUID
  name: string;                    // e.g., "Full-Stack Dev Team"
  description?: string;
  icon?: string;                   // Emoji or avatar
  members: ITeamMemberDefinition[];
  defaultWorkspace?: string;
  createdAt: number;
  updatedAt: number;
}
```

### 3.2 Team Session (Runtime)

```typescript
// src/common/team.ts

type TeamTaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

interface ITeamTask {
  id: string;
  title: string;
  description?: string;
  assigneeId?: string;             // Team member ID
  status: TeamTaskStatus;
  dependsOn?: string[];            // Task IDs
  createdAt: number;
  updatedAt: number;
}

interface ITeamSession {
  id: string;                      // UUID
  teamDefinitionId: string;
  name: string;
  workspace: string;
  memberConversations: Record<string, string>;  // memberId -> conversationId
  tasks: ITeamTask[];
  status: 'active' | 'completed' | 'cancelled';
  createdAt: number;
  updatedAt: number;
}
```

### 3.3 Database Changes

Add a `team_sessions` table:

```sql
CREATE TABLE team_sessions (
  id TEXT PRIMARY KEY,
  team_definition_id TEXT NOT NULL,
  name TEXT NOT NULL,
  workspace TEXT NOT NULL,
  member_conversations TEXT NOT NULL,  -- JSON: { memberId: conversationId }
  tasks TEXT NOT NULL DEFAULT '[]',    -- JSON: ITeamTask[]
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

Extend `conversations` table — no schema change needed. Use `extra` JSON field:

```typescript
// In conversation.extra for team member conversations:
interface TeamMemberExtra extends AcpExtra {
  teamSessionId: string;           // Links to team_sessions.id
  teamMemberId: string;            // Which member definition this is
  teamMemberName: string;
  teamRole: TeamMemberRole;
}
```

---

## 4. Backend Architecture

### 4.1 TeamManager (Main Process)

New service: `src/process/services/TeamManager.ts`

```typescript
class TeamManager {
  private activeSessions: Map<string, ITeamSession>;

  // Lifecycle
  async createSession(definition: ITeamDefinition, workspace: string): Promise<ITeamSession>;
  async destroySession(sessionId: string): Promise<void>;

  // Member management - each spawns an AcpAgentManager
  async spawnMember(sessionId: string, memberDef: ITeamMemberDefinition): Promise<string>; // returns conversationId
  async shutdownMember(sessionId: string, memberId: string): Promise<void>;

  // Messaging between members (injected as system messages)
  async sendTeamMessage(sessionId: string, fromId: string, toId: string, content: string): Promise<void>;
  async broadcastTeamMessage(sessionId: string, fromId: string, content: string): Promise<void>;

  // Shared task list
  async addTask(sessionId: string, task: Omit<ITeamTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<ITeamTask>;
  async updateTask(sessionId: string, taskId: string, updates: Partial<ITeamTask>): Promise<void>;
  async getTasks(sessionId: string): Promise<ITeamTask[]>;

  // Query
  getSession(sessionId: string): ITeamSession | undefined;
  getActiveSessions(): ITeamSession[];
}
```

### 4.2 Member Spawning Flow

```
TeamManager.spawnMember(sessionId, memberDef)
  │
  ├─ Create conversation via ConversationService.createConversation({
  │    type: 'acp',
  │    extra: {
  │      backend: memberDef.backend || 'claude',
  │      teamSessionId: sessionId,
  │      teamMemberId: memberDef.id,
  │      teamMemberName: memberDef.name,
  │      teamRole: memberDef.role,
  │      presetContext: buildTeamSystemPrompt(memberDef, teamDef),
  │    }
  │  })
  │
  ├─ Register with WorkerManage.buildConversation()
  │
  ├─ Update team session memberConversations map
  │
  └─ Return conversationId
```

### 4.3 Team System Prompt Builder

Each member receives a system prompt that includes:

```typescript
function buildTeamSystemPrompt(
  member: ITeamMemberDefinition,
  team: ITeamDefinition,
  tasks: ITeamTask[]
): string {
  return `
## Team Context

You are "${member.name}" on the "${team.name}" team.
Your role: ${member.role === 'lead' ? 'Team Lead - coordinate work and synthesize results' : 'Team Member'}

### Your Instructions
${member.systemPrompt}

### Team Members
${team.members.map(m => `- ${m.name} (${m.role}): ${m.systemPrompt.slice(0, 100)}...`).join('\n')}

### Current Task List
${tasks.map(t => `- [${t.status}] ${t.title}${t.assigneeId === member.id ? ' (assigned to you)' : ''}`).join('\n')}

### Communication
When you need to communicate with teammates, prefix your message with:
@team:<member-name> <message>
To update task status, use:
@task:<task-id> status:<new-status>

The orchestrator will route your messages and task updates.
`;
}
```

### 4.4 Message Routing

AionUi intercepts special message patterns from agent output:

```typescript
// In AcpAgentManager.onStreamEvent handler, detect team commands:
class TeamMessageRouter {
  // Parse agent output for team commands
  parseTeamCommands(content: string): TeamCommand[];

  // Route: inject message into target member's conversation
  async routeMessage(sessionId: string, from: string, to: string, content: string): void {
    const targetConversationId = session.memberConversations[to];
    const manager = WorkerManage.getTaskByIdRollbackBuild(targetConversationId);
    // Inject as a system/team message
    await manager.sendMessage(`[Team message from ${fromName}]: ${content}`);
  }
}
```

### 4.5 IPC Bridge Extensions

New IPC channels in `src/process/bridge/`:

```typescript
// teamBridge.ts
{
  'team:create-session': (def: ITeamDefinition, workspace: string) => ITeamSession;
  'team:destroy-session': (sessionId: string) => void;
  'team:spawn-member': (sessionId: string, memberId: string) => string;
  'team:shutdown-member': (sessionId: string, memberId: string) => void;
  'team:send-message': (sessionId: string, from: string, to: string, content: string) => void;
  'team:broadcast': (sessionId: string, from: string, content: string) => void;
  'team:add-task': (sessionId: string, task: Partial<ITeamTask>) => ITeamTask;
  'team:update-task': (sessionId: string, taskId: string, updates: Partial<ITeamTask>) => void;
  'team:get-tasks': (sessionId: string) => ITeamTask[];
  'team:get-session': (sessionId: string) => ITeamSession;
  'team:list-sessions': () => ITeamSession[];
}
```

---

## 5. Frontend Architecture

### 5.1 Team in Bot Mode

Extend the bots page to support teams:

**File: `src/renderer/pages/bots/TeamSection.tsx`**

```
┌─────────────────────────────────────────────┐
│  🤖 Bots                          [+ Bot]   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ Bot A   │ │ Bot B   │ │ Bot C   │       │
│  └─────────┘ └─────────┘ └─────────┘       │
│                                              │
│  👥 Teams                         [+ Team]   │
│  ┌─────────────────┐ ┌─────────────────┐    │
│  │ Full-Stack Team │ │ Review Team     │    │
│  │ 3 members       │ │ 2 members       │    │
│  │ [Launch]        │ │ [Launch]        │    │
│  └─────────────────┘ └─────────────────┘    │
└─────────────────────────────────────────────┘
```

**Team Creation Dialog (`TeamCreateDialog.tsx`):**
- Team name and description
- Add/remove member slots
- Per-member: name, role (lead/member), system prompt, backend, model
- Template presets (e.g., "Full-Stack Team", "Code Review Team")

### 5.2 Team Conversation Page

New component: `src/renderer/pages/conversation/TeamConversation.tsx`

```
┌──────────────────────────────────────────────────────┐
│  Full-Stack Dev Team                    [Tasks] [⚙️]  │
├──────────────────────────────────────────────────────┤
│  [🎯 Lead] [🎨 Frontend] [⚙️ Backend] [🧪 Tester]    │  ← Member tabs
├──────────────────────────────────────────────────────┤
│                                                      │
│  Active tab's ChatConversation renders here          │
│  (Each tab is a separate ACP conversation)           │
│                                                      │
│                                                      │
│                                                      │
├──────────────────────────────────────────────────────┤
│  [message input for active member]            [Send] │
└──────────────────────────────────────────────────────┘
```

**Task List Panel (slide-out sidebar):**
```
┌──────────────────────┐
│  📋 Shared Tasks      │
├──────────────────────┤
│  ☐ Design API schema │
│    → Backend          │
│                       │
│  ⏳ Build UI forms    │
│    → Frontend         │
│                       │
│  ✅ Setup project     │
│    → Lead             │
│                       │
│  [+ Add Task]         │
└──────────────────────┘
```

### 5.3 Component Tree

```
TeamConversationPage
├── TeamContext.Provider          // Team session state
│   ├── TeamHeader               // Team name, controls
│   ├── TeamMemberTabs           // Horizontal tab bar for members
│   │   └── TeamMemberTab[]      // Individual member tab buttons
│   ├── TeamChatArea             // Active member's chat
│   │   └── ChatConversation     // Existing component, reused!
│   ├── TeamTaskPanel            // Slide-out task list
│   │   └── TeamTaskItem[]
│   └── TeamMessageIndicator     // Badge showing unread cross-member messages
```

### 5.4 TeamContext

```typescript
// src/renderer/context/TeamContext.tsx

interface TeamContextValue {
  session: ITeamSession;
  definition: ITeamDefinition;
  activeMemberId: string;
  activeConversationId: string;

  // Member tab operations
  switchMember(memberId: string): void;

  // Tasks
  tasks: ITeamTask[];
  addTask(title: string, assigneeId?: string): Promise<void>;
  updateTask(taskId: string, updates: Partial<ITeamTask>): Promise<void>;

  // Cross-member messaging
  sendTeamMessage(toMemberId: string, content: string): Promise<void>;
  broadcastMessage(content: string): Promise<void>;

  // Lifecycle
  shutdownMember(memberId: string): Promise<void>;
  destroyTeam(): Promise<void>;
}
```

### 5.5 Routing

```typescript
// Add to router configuration:
{
  path: '/team/:teamSessionId',
  element: <TeamConversationPage />,
}

// Launch from bot mode:
navigate(`/team/${sessionId}`);
```

---

## 6. Team Presets (Built-in Templates)

Ship useful team templates out of the box:

```typescript
// src/common/presets/teamPresets.ts

const TEAM_PRESETS: ITeamDefinition[] = [
  {
    id: 'fullstack-dev',
    name: 'Full-Stack Development',
    icon: '👥',
    description: 'Lead + Frontend + Backend + QA working together',
    members: [
      {
        id: 'lead',
        name: 'Tech Lead',
        role: 'lead',
        systemPrompt: 'You are the tech lead. Break down tasks, coordinate the team, review deliverables, and synthesize the final result.',
      },
      {
        id: 'frontend',
        name: 'Frontend Engineer',
        role: 'member',
        systemPrompt: 'You specialize in frontend development: React components, styling, user interactions, and accessibility.',
      },
      {
        id: 'backend',
        name: 'Backend Engineer',
        role: 'member',
        systemPrompt: 'You specialize in backend development: APIs, database design, server logic, and performance.',
      },
      {
        id: 'qa',
        name: 'QA Engineer',
        role: 'member',
        systemPrompt: 'You specialize in testing: writing test cases, identifying edge cases, and validating implementations.',
      },
    ],
  },
  {
    id: 'code-review',
    name: 'Code Review Team',
    icon: '🔍',
    description: 'Multi-perspective code review: security, performance, quality',
    members: [
      {
        id: 'lead',
        name: 'Review Lead',
        role: 'lead',
        systemPrompt: 'Coordinate the review. Synthesize findings from all reviewers into a final report.',
      },
      {
        id: 'security',
        name: 'Security Reviewer',
        role: 'member',
        systemPrompt: 'Focus on security vulnerabilities: injection, auth issues, data exposure, OWASP top 10.',
      },
      {
        id: 'perf',
        name: 'Performance Reviewer',
        role: 'member',
        systemPrompt: 'Focus on performance: algorithmic complexity, memory usage, unnecessary re-renders, bundle size.',
      },
    ],
  },
  {
    id: 'research-team',
    name: 'Research & Investigation',
    icon: '🔬',
    description: 'Parallel research with competing hypotheses',
    members: [
      {
        id: 'lead',
        name: 'Research Lead',
        role: 'lead',
        systemPrompt: 'Coordinate research. Assign investigation areas, synthesize findings, and identify consensus.',
      },
      {
        id: 'researcher-a',
        name: 'Researcher A',
        role: 'member',
        systemPrompt: 'Investigate thoroughly. Challenge other researchers findings. Report with evidence.',
      },
      {
        id: 'researcher-b',
        name: 'Researcher B',
        role: 'member',
        systemPrompt: 'Investigate thoroughly. Challenge other researchers findings. Report with evidence.',
      },
    ],
  },
];
```

---

## 7. Implementation Plan

### Phase 1: Core Data Model & Backend

1. **Define types** — `src/common/team.ts`
   - `ITeamDefinition`, `ITeamMemberDefinition`
   - `ITeamSession`, `ITeamTask`

2. **Database migration** — Add `team_sessions` table

3. **TeamManager service** — `src/process/services/TeamManager.ts`
   - Session CRUD
   - Member spawning via existing `AcpAgentManager`
   - Task list management

4. **Team system prompt builder** — Generate role-aware prompts

5. **IPC bridge** — `src/process/bridge/teamBridge.ts`

### Phase 2: Team Message Routing

6. **TeamMessageRouter** — Parse `@team:` commands from agent output
7. **Cross-member message injection** — Route messages between ACP sessions
8. **Task status parsing** — Detect `@task:` commands and update shared list

### Phase 3: Frontend - Team Management

9. **Team CRUD UI** — Create/edit/delete team definitions in bot mode
10. **Team presets** — Built-in templates
11. **Team launch flow** — Create session, spawn members, navigate to team page

### Phase 4: Frontend - Team Conversation

12. **TeamContext** — React context for team session state
13. **TeamConversationPage** — Main page with member tabs
14. **TeamMemberTabs** — Tab bar component (reuse ConversationTabs patterns)
15. **Integrate ChatConversation** — Each tab renders existing chat component
16. **TeamTaskPanel** — Shared task list sidebar

### Phase 5: Polish & Advanced Features

17. **Unread message indicators** — Badge on member tabs for cross-team messages
18. **Team history** — List and resume past team sessions
19. **Export team results** — Aggregate outputs from all members
20. **Bot mode integration** — Link teams to bot configs for auto-launching

---

## 8. Key Files to Create/Modify

### New Files

| File                                                              | Purpose                       |
| ----------------------------------------------------------------- | ----------------------------- |
| `src/common/team.ts`                                              | Team type definitions         |
| `src/common/presets/teamPresets.ts`                                | Built-in team templates       |
| `src/process/services/TeamManager.ts`                              | Team orchestration service    |
| `src/process/services/TeamMessageRouter.ts`                        | Inter-member message routing  |
| `src/process/bridge/teamBridge.ts`                                 | IPC channels for teams        |
| `src/renderer/context/TeamContext.tsx`                              | Team React context            |
| `src/renderer/pages/conversation/TeamConversationPage.tsx`         | Team conversation page        |
| `src/renderer/pages/conversation/components/TeamMemberTabs.tsx`    | Member tab bar                |
| `src/renderer/pages/conversation/components/TeamTaskPanel.tsx`     | Shared task list panel        |
| `src/renderer/pages/conversation/components/TeamHeader.tsx`        | Team header with controls     |
| `src/renderer/pages/bots/TeamSection.tsx`                          | Team listing in bot mode      |
| `src/renderer/pages/bots/TeamCreateDialog.tsx`                     | Team creation/edit dialog     |

### Modified Files

| File                                                                   | Change                                    |
| ---------------------------------------------------------------------- | ----------------------------------------- |
| `src/common/storage.ts`                                                | Add team-related conversation extra fields |
| `src/process/database/schema.ts`                                       | Add `team_sessions` table                 |
| `src/process/database/types.ts`                                        | Add team row types                        |
| `src/process/WorkerManage.ts`                                          | Team-aware conversation building          |
| `src/process/task/AcpAgentManager.ts`                                  | Detect team commands in output            |
| `src/renderer/pages/bots/index.tsx`                                    | Add TeamSection component                 |
| `src/renderer/App.tsx` (or router config)                              | Add `/team/:id` route                    |
| `src/renderer/i18n/locales/*.json`                                     | Team-related translation keys             |

---

## 9. Token & Cost Considerations

Each team member is a separate Claude Code session:
- **3-member team** = 3x the token usage of a single conversation
- **4-member team** = 4x

Mitigations:
- Allow per-member model selection (use Haiku for simpler roles, Opus for lead)
- Show real-time token usage per member in the UI
- Default to smaller teams (2-3 members)
- Provide guidance on when teams are worth the cost vs. single agent

---

## 10. Future Enhancements

- **Native Claude Agent Teams mode**: Once the feature stabilizes, add an option to use Claude's built-in team protocol directly for advanced users
- **Mixed-backend teams**: Frontend member using Gemini, backend using Claude, etc.
- **Team chat**: A shared conversation view showing all cross-member messages in one timeline
- **Persistent teams**: Teams that survive across sessions (resume all members)
- **Team metrics**: Track task completion rates, token usage per member, time to completion
- **Git worktree integration**: Each member works in a separate git worktree to avoid file conflicts
