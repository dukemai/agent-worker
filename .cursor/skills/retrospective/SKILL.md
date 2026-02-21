---
name: retrospective
description: Guides a structured retrospective after completing a project phase. Use when a phase is marked done, when the user says a phase is complete, or when the user asks to move to the next phase.
---

# Phase Retrospective

Structured process for reflecting on a completed phase before moving forward. Run this whenever a phase ends.

## When to trigger

A phase is considered **done** when either:
- The user explicitly says the phase is done (e.g., "phase 3 is done", "that's complete", "let's wrap up this phase").
- The user asks to move to the next phase (e.g., "let's start phase 4", "what's next", "continue to the next phase").

When either signal is detected, run this retrospective **before** starting any new work.

## Step 1: Gather evidence

Before writing anything, collect facts:

1. **Read the phase SCOPE.md** (`docs/phases/NN-name/SCOPE.md`) to see what was planned.
2. **Check what actually shipped** — scan recent commits, file changes, or ask the user.
3. **Identify gaps** — compare planned deliverables against what shipped.
4. **Note surprises** — anything unexpected: scope creep, tech issues, changed requirements, things that were easier or harder than expected.

## Step 2: Collect user feedback

Ask the user if they want to give feedback on the phase. Use the AskQuestion tool if available, otherwise ask conversationally.

If the user says **yes**, ask them:
1. **Top 3 things that worked well** — what should we keep doing?
2. **Top 3 things that didn't work well** — what should we change?

Incorporate their answers into the RETRO.md under a `## User Feedback` section. If they decline, skip the section entirely (do not add an empty one).

## Step 3: Write RETRO.md

Create `docs/phases/NN-name/RETRO.md` using this template:

```
# Phase N: [Name] — Retro

## Shipped
- [What was delivered]
- [What was delivered]

## Deferred
- [What was planned but moved to a later phase, and why]

## Surprises
- [Anything unexpected: scope creep, tech issues, changed requirements]

## Lessons
- [What would we do differently next time]
- [Patterns worth repeating]

## User Feedback (if provided)

### Worked well
1. [User's #1]
2. [User's #2]
3. [User's #3]

### Didn't work well
1. [User's #1]
2. [User's #2]
3. [User's #3]
```

### Rules for writing retros

- Be honest about what was deferred — these feed the next phase's SCOPE.md.
- Keep it concise: 20-40 lines.
- Include at least one lesson, even if everything went smoothly.
- Do not restate the SCOPE.md — focus on delta (what changed from plan to reality).
- If there were mid-phase decisions, reference them by linking to `docs/DECISIONS.md` entries.

## Step 4: Update living docs

After writing the retro:

1. **Update `docs/ROADMAP.md`**: Set the completed phase status to `done`.
2. **Update `docs/SPEC.md`**: If the phase changed what the product does, update the spec.
3. **Update `docs/ARCHITECTURE.md`**: If the phase introduced new tech, APIs, or integrations.
4. **Log any unrecorded decisions**: Check if decisions made during the phase are captured in `docs/DECISIONS.md`.

## Step 5: Confirm with user

Present a summary to the user:

```
Phase N is complete. Here's what I captured:

**Shipped**: [brief list]
**Deferred**: [items, if any]
**Key lesson**: [most important takeaway]

RETRO.md written to docs/phases/NN-name/RETRO.md
ROADMAP.md updated.

Ready to review Phase N+1 scope?
```

Wait for user confirmation before proceeding to the next phase.

## Step 6: Feed into next phase

Deferred items, lessons, and user feedback from this retro should be reviewed during the Phase 7 (Review Before Each Phase) step of the [project-plan](.cursor/skills/project-plan/SKILL.md) skill. Specifically:

- Deferred items may need to be added to the next phase's SCOPE.md.
- Lessons may change how the next phase is approached.
- Surprises may reveal new constraints.
- User feedback on what worked well should be continued; what didn't work well should be addressed or adjusted.

## Anti-patterns

- **Skipping the retro**: Never jump to the next phase without reflecting. Even a 5-line retro is better than none.
- **Copy-pasting SCOPE.md**: The retro is about what actually happened, not what was planned.
- **Blame-oriented writing**: Focus on process improvements, not what went wrong.
- **Forgetting deferred items**: Deferred work that isn't captured will be lost. Always list it.
