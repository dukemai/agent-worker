---
name: phase-planning
description: Breaks a phase's scope into time-boxed, actionable tasks. Use after a phase retro when planning the next phase, or when the user asks to plan implementation tasks for a phase.
---

# Phase Planning

Turns a phase's SCOPE.md into a concrete list of tasks that anyone can pick up and execute. Run **after** the [retrospective](.cursor/skills/retrospective/SKILL.md) when moving to the next phase.

## When to trigger

- After a phase retro is complete and the user confirms readiness to plan the next phase
- When the user asks to "plan the next phase", "break down phase N into tasks", or "create a task list for implementation"

## Prerequisites

1. **Phase 7 review done** — The [project-plan](.cursor/skills/project-plan/SKILL.md) Phase 7 (Review Before Each Phase) must have run. This ensures the SCOPE.md is current and incorporates lessons from the previous retro.
2. **SCOPE.md exists** — `docs/phases/NN-name/SCOPE.md` for the phase to implement.

## Step 1: Gather inputs

1. Read the phase's `docs/phases/NN-name/SCOPE.md`.
2. Read the previous phase's `docs/phases/NN-1-name/RETRO.md` (if it exists). Note:
   - Deferred items that may affect this phase
   - Lessons and surprises that change approach
   - User feedback on what worked / didn't work
3. Scan the codebase for relevant patterns (similar features, existing migrations, API shapes).

## Step 2: Decompose into tasks

Break the scope into tasks that are:

- **Time-boxed** — Each task has an explicit estimate (15 min, 30 min, 1h, 2h). No task should exceed 2h; split larger work.
- **Actionable** — Anyone can take the task and execute without guessing. Include specific files, commands, or steps.
- **Independently verifiable** — Each task has a clear "done" condition.
- **Ordered** — Dependencies first (e.g., migration before API, API before UI).

### Task template

```markdown
### Task N: [Short title] — [estimate]

**Goal**: [One sentence: what this task achieves]

**Steps**:
1. [Specific step]
2. [Specific step]
3. [Specific step]

**Files**:
- `path/to/file.ts`
- `path/to/migration.sql`

**Done when**: [How to verify — e.g., "Migration runs without error", "Endpoint returns 200 for valid input"]
```

### Time-boxing guidelines

| Estimate | Typical scope |
|----------|---------------|
| 15 min | Single file edit, config change, small fix |
| 30 min | New component, one endpoint, one migration |
| 1h | Multi-file feature, integration, refactor |
| 2h | Complex feature with tests and docs |

## Step 3: Write TASKS.md

Create `docs/phases/NN-name/TASKS.md` using this structure:

```markdown
# Phase N: [Name] — Implementation Tasks

**Total estimate**: [sum of task estimates]

## Prerequisites
- [ ] Phase 7 review completed
- [ ] SCOPE.md read and any adjustments applied

## Tasks

### Task 1: [Title] — [estimate]
...

### Task 2: [Title] — [estimate]
...

## Order
Tasks are ordered by dependency. Execute in sequence unless marked as parallel-safe.
```

### Rules

- Keep each task under 2h. If a deliverable spans more, split into sub-tasks.
- Reference actual file paths and patterns from the codebase.
- Include "Done when" for every task.
- If the previous retro had deferred items that landed in this phase, ensure they appear as explicit tasks.

## Step 4: Confirm with user

Present the task list summary:

```
Phase N task list created:

**Tasks**: [count] tasks, ~[total time] estimated
**First task**: [Task 1 title]

TASKS.md written to docs/phases/NN-name/TASKS.md

Ready to start implementation?
```

Wait for user confirmation before starting implementation.

## Integration with workflow

```
Phase N done → Retro → Phase 7 review → Phase planning (this skill) → Implementation
```

- **Retro** captures what shipped, deferred, and lessons.
- **Phase 7 review** ensures SCOPE.md is current and incorporates retro insights.
- **Phase planning** produces TASKS.md from the reviewed scope.
- **Implementation** follows TASKS.md in order.

## Anti-patterns

- **Vague tasks**: "Implement the feature" — too broad. Break into concrete steps.
- **No time estimate**: Every task needs an estimate for planning and time-boxing.
- **Skipping Phase 7**: Never plan from stale SCOPE. Review first.
- **Tasks > 2h**: Split them. Large tasks hide risk and block parallel work.
- **Missing "Done when"**: Without a verification step, "done" is ambiguous.
