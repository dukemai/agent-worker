---
name: project-plan
description: Guides structured project planning from raw ideas to actionable implementation plans. Use when the user wants to plan a feature, brainstorm requirements, scope a project, or create an implementation roadmap.
---

# Project Planning

Systematic process for turning a raw idea into a clear, scoped implementation plan. Follow these phases in order. Do not skip to implementation until requirements are unambiguous.

## Phase 0: Brainstorm (when the idea is vague)

If the user presents a vague or new idea, run the [brainstorm](.cursor/skills/brainstorm/SKILL.md) skill first. This produces a clear problem statement, alternatives analysis, and a decision statement ("We will build X because Y").

Skip this phase only when:
- The user already has a clear, specific feature request (not an idea).
- Requirements are already written and confirmed.

The brainstorm output feeds directly into Phase 1 below.

## Phase 1: Collect Requirements

Start by understanding what the user actually needs. If Phase 0 was completed, use its outputs (problem statement, target statement, decision statement) as the foundation — do not re-ask questions already answered.

Ask structured questions using the AskQuestion tool when available, otherwise ask conversationally.

### Core questions to answer

1. **Problem**: What pain point or opportunity does this address? (Already answered if brainstorm was done.)
2. **Users**: Who will use it and how? (e.g., mobile, desktop, API consumer)
3. **Scope boundary**: What is explicitly out of scope for v1? (Already answered if brainstorm was done.)
4. **Existing context**: What parts of the codebase, infra, or data model already exist that this touches?
5. **Constraints**: Deadlines, tech stack limits, cost limits, compliance requirements?

Cross-check all requirements against the [project-requirements](.cursor/skills/project-requirements/SKILL.md) baselines (NR1-NR6, TR1-TR4).

### Gather, don't assume

- If the user gives a one-liner ("add reminders"), run the brainstorm skill instead of guessing.
- Capture exact terminology the user uses (it reveals mental models).
- List unknowns explicitly. Flag them for discussion.

## Phase 2: Clarify and Confirm

Goal: eliminate remaining ambiguity and surface hidden decisions.

### Techniques

1. **Scenario walk-through**: Narrate the user journey step by step. ("You open the app, you see X, you tap Y, then Z happens.") Ask the user if each step matches their expectation.
2. **Trade-off surfacing**: When multiple valid approaches exist, present 2-3 options with pros/cons and a recommended default. Use the AskQuestion tool for structured choices.
3. **Edge-case probing**: Ask "what happens when..." for at least 3 edge cases (empty state, error, high volume, permissions).
4. **Integration mapping**: Identify every system this feature touches (DB tables, APIs, cron jobs, UI pages, email templates). Draw a simple list or diagram.

### Output of this phase

A short requirements summary (5-15 bullet points) that the user confirms before moving on. Format:

```
### Requirements (confirmed)
- R1: [requirement]
- R2: [requirement]
- ...

### Baseline compliance
- [x] NR1-NR6: [notes]
- [x] TR1-TR4: [notes]

### Open questions
- Q1: [question — needs answer before implementation]
```

## Phase 3: Design the Solution

Translate confirmed requirements into a technical shape.

### What to produce

1. **Data model changes**: New tables, columns, or metadata conventions. Include column names, types, constraints.
2. **API surface**: Endpoints, methods, request/response shapes.
3. **UI changes**: Which pages/components are added or modified. Describe layout briefly.
4. **Integration points**: Cron jobs, email sections, external APIs.
5. **Migration/rollout notes**: Anything that needs to run in order or has a dependency.

Keep this section concise. Use bullet lists, not prose.

## Phase 4: Create the Implementation Plan

Structure the work into ordered phases that can each be verified independently.

### Plan structure

```
## Phase N: [Short name]
- What to build (specific files, tables, endpoints)
- Acceptance criteria (how to verify it works)
- Dependencies (what must be done before this phase)
```

### Rules

- Each phase should be independently testable (avoid "big bang" phases).
- Include a **verify locally** step in every phase that touches the database or creates new routes. Reference the `planning-with-database` skill for the verification template.
- Order phases so the user sees value early (data model first, then API, then UI, then polish).
- Keep the total plan to 3-6 phases for a typical feature.

## Phase 5: Document the Plan

Follow the [organize-documents](.cursor/skills/organize-documents/SKILL.md) skill for all document placement. Specifically:

### Before implementation starts

1. **Create phase SCOPE.md**: Write `docs/phases/NN-name/SCOPE.md` with goal, in-scope, out-of-scope, and acceptance criteria. This captures the plan snapshot before any code is written.
2. **Update ROADMAP.md**: Set the new phase status to `in progress` in `docs/ROADMAP.md`.
3. **Log key decisions**: If the planning process surfaced trade-offs or choices (from Phase 2-3), append them to `docs/DECISIONS.md` tagged with `[Phase N]`.

### During implementation

4. **Update living docs as features ship**:
   - If the feature changes what the product does: update `docs/SPEC.md`.
   - If the feature introduces new tech, APIs, or integrations: update `docs/ARCHITECTURE.md`.
   - Log any mid-phase decisions to `docs/DECISIONS.md`.

### After implementation completes

5. **Run the retrospective**: Follow the [retrospective](.cursor/skills/retrospective/SKILL.md) skill. This writes `RETRO.md`, updates `ROADMAP.md`, and syncs living docs.

A phase is considered complete when the user either:
- Explicitly confirms the phase is done.
- Asks to move to the next phase.

Do not skip the retrospective. It feeds the next phase's review step (Phase 7 below).

### What NOT to create

- Do not duplicate the spec inside phase folders. SCOPE.md is a lightweight snapshot, not a copy of SPEC.md.
- Do not create standalone planning documents outside of `docs/`. All project documentation lives in `docs/` per the organize-documents skill.

## Phase 6: Confirm and Execute

- Present the full plan to the user for approval before writing any code.
- Use the `create_plan` tool (Plan mode) to formalize the plan if available.
- Only begin implementation after explicit user confirmation.

## Phase 7: Review Before Each Phase

Before starting implementation of any phase (including the first one), run a review checkpoint. This ensures the plan stays relevant as the project evolves.

### Review checklist

1. **Read the previous phase's RETRO.md** (if one exists). Check:
   - Were items deferred that affect this phase's scope?
   - Were there surprises or lessons that change how this phase should be built?
   - Did the previous phase introduce new constraints (e.g., schema decisions, API patterns) that this phase must follow?
   - If a `## User Feedback` section exists, check what the user said worked well (keep doing those things) and what didn't work well (adjust the approach for this phase).

2. **Re-read this phase's SCOPE.md**. Check:
   - Are the in-scope items still the right priority given what we learned?
   - Has the user's thinking changed since the scope was written?
   - Are there new requirements from conversations since the plan was created?

3. **Decide: proceed, adjust, or re-scope.**
   - **Proceed**: Scope is still accurate. Start implementation.
   - **Adjust**: Minor updates needed. Update SCOPE.md with a `## Adjustments` section (do not rewrite the original scope — append to it so the history is visible).
   - **Re-scope**: Scope is significantly wrong. Discuss with the user, rewrite SCOPE.md, and log the reason in `docs/DECISIONS.md`.

### Adjustments format

When adjusting a phase's SCOPE.md, append (do not replace the original):

```
## Adjustments (YYYY-MM-DD)

**Trigger**: [What changed — previous phase retro, new user requirement, technical discovery]

### Added
- [New item added to scope]

### Removed
- [Item removed from scope, and where it moved]

### Changed
- [Item that was reframed or reprioritized]
```

### When to skip the review

- The project has only one phase (nothing to review).
- The phase is trivially small (1-2 files, under 30 min).

## Anti-patterns

- **Planning without confirmation**: Never start coding from a vague idea. Always confirm requirements first.
- **Over-planning**: If the feature is small (1-2 files, < 30 min work), skip to a lightweight version: collect requirements in 2-3 questions, confirm, then implement. Skip SCOPE.md/RETRO.md for trivial work.
- **Ignoring existing patterns**: Always check how similar features were built in the codebase before proposing new patterns.
- **Monolith phases**: If a phase touches more than 5 files, split it.
- **Orphaned documents**: Never create planning docs in ad-hoc locations (root, `plan/`, random folders). Everything goes in `docs/` following the organize-documents convention.
- **Skipping the retro**: Always run the [retrospective](.cursor/skills/retrospective/SKILL.md) skill when a phase completes. Deferred items feed the next phase's SCOPE.md.
