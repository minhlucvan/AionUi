---
id: prd-generator
name: PRD Generator
triggers: generate prd, create prd, plan feature, plan task, new project
---

**Description**: Generates a structured Product Requirements Document from a feature description through interactive clarification.

**Workflow**:

1. When the user describes a feature or project, ask 3-5 clarifying questions:
   - What is the primary goal?
   - Who are the target users?
   - What are the key constraints (tech stack, timeline, dependencies)?
   - What quality gates exist (tests, linting, type checking)?
   - Are there any specific acceptance criteria priorities?

2. Generate a comprehensive PRD with properly ordered user stories

3. Write the PRD to `prd.json` in the workspace

**Story Sizing Rules**:
- Each story must be completable in ONE iteration (one AI context window)
- If a story seems too large, split it into 2-3 smaller stories
- Dependencies flow forward: schema -> backend -> frontend -> integration
- Always include quality checks in acceptance criteria

**Priority Ordering**:
- Priority 1 = most urgent, execute first
- Infrastructure/schema stories come first
- Core logic stories follow
- UI/integration stories come last
- Testing stories at the end

---

---
id: prd-converter
name: PRD Converter
triggers: convert prd, prd to json, import requirements, parse requirements
---

**Description**: Converts markdown PRD documents or plain text requirements into the structured `prd.json` format.

**Input Formats Supported**:
- Markdown PRD documents
- Plain text feature descriptions
- Bullet-point requirement lists
- User story lists (As a... I want... So that...)

**Conversion Rules**:

1. Extract individual requirements/features
2. Convert each to a user story with:
   - Unique ID (US-001, US-002, etc.)
   - Descriptive title
   - User story format description
   - Specific, verifiable acceptance criteria
   - Priority based on dependency ordering
3. Validate no backward dependencies (higher priority stories should not depend on lower priority ones)
4. Ensure each story is small enough for one iteration
5. Add "Typecheck passes" and "Tests pass" to every story's acceptance criteria

**Output**: Writes `prd.json` and initializes `progress.txt`

---

---
id: ralph-loop
name: Ralph Autonomous Loop
triggers: start ralph, run ralph, begin autonomous, execute prd, run loop
---

**Description**: Manages the autonomous execution loop that iterates through user stories until all are complete.

**Activation**:
When the user says "start ralph", "run ralph", "begin autonomous execution", or similar:

1. Verify `prd.json` exists in the workspace
2. Verify the workspace has quality check commands available
3. Begin the iteration loop

**Loop Behavior**:

Each iteration follows the strict 10-step workflow defined in the Ralph rules:
1. Read prd.json
2. Read progress.txt
3. Verify branch alignment
4. Select highest-priority incomplete story
5. Implement the story
6. Run quality checks
7. Update documentation
8. Commit changes
9. Mark story as complete in prd.json
10. Append progress entry

**Completion Signal**:
- Output `<promise>COMPLETE</promise>` when all stories pass
- Output `<promise>CONTINUE</promise>` when stories remain

**Error Recovery**:
- If quality checks fail: fix and retry (up to 3 attempts)
- If blocked: skip to next available story, note the blocker
- If max iterations reached: report remaining stories

**Integration with AionUi**:
The loop leverages AionUi's cron system for scheduled iteration execution:
- Each iteration is a separate message to the conversation
- The Ralph service monitors responses for completion/continue signals
- yoloMode enables autonomous tool approval
- Progress is tracked and displayed in the UI

---

---
id: story-validator
name: Story Validator
triggers: validate stories, check prd, verify stories, audit prd
---

**Description**: Validates the current `prd.json` for correctness, proper sizing, and dependency ordering.

**Validation Checks**:

1. **Structure Validation**
   - All required fields present
   - Valid JSON format
   - Unique story IDs
   - Priority numbers are sequential

2. **Size Validation**
   - Each story has fewer than 8 acceptance criteria
   - Story descriptions are specific (not vague)
   - No story appears too large for one iteration

3. **Dependency Validation**
   - No backward dependencies (story N should not depend on story N+1)
   - Schema/infrastructure stories come first
   - Integration stories come last

4. **Quality Validation**
   - Every story includes "Typecheck passes" in acceptance criteria
   - Every story includes "Tests pass" in acceptance criteria
   - Acceptance criteria are objective and verifiable

**Output**: Report of issues found with suggestions for fixes
