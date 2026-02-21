---
name: organize-documents
description: Defines where project documents live and what each one contains. Use when creating, updating, or reorganizing documentation files, READMEs, specs, plans, or decision records in the workspace.
---

# Document Organization

## Directory Structure

All project documentation follows this layout:

```
repo-root/
├── README.md                    # Quick start: what this is, how to run it, how to deploy
├── docs/
│   ├── SPEC.md                  # Single source of truth for product specification
│   ├── ARCHITECTURE.md          # System design, data flow, tech stack rationale
│   ├── DECISIONS.md             # Append-only log of key decisions (tagged by phase)
│   ├── ROADMAP.md               # Current and future phases with status markers
│   └── phases/                  # Phase-specific artifacts (scope + retro)
│       ├── 01-ingestion-mvp/
│       │   ├── SCOPE.md
│       │   └── RETRO.md
│       ├── 02-intelligence/
│       │   ├── SCOPE.md
│       │   └── RETRO.md
│       └── ...
├── .cursor/
│   ├── plans/                   # Cursor-managed implementation plans (auto-generated)
│   └── skills/                  # Agent skills (project-scoped)
├── dashboard/README.md          # Sub-app quick start (setup, env vars, dev commands)
└── fixtures/README.md           # Test data documentation
```

## Document Responsibilities

### README.md (root)

Purpose: first thing a new contributor reads. Keep under 80 lines.

Required sections:
1. One-line description
2. Quick start (clone, install, configure, run)
3. Project structure (directory listing with one-line descriptions)
4. Deploy instructions
5. Link to `docs/` for deeper context

Do NOT put product spec, roadmap, or architecture here.

### docs/SPEC.md

Purpose: single source of truth for **what the product does and why**.

Contains:
- Executive summary
- User personas and use cases
- Core workflows (step-by-step)
- Data schema overview (table names, key columns, relationships)
- Environment and constraints (city, timezone, language)

Update this when product direction changes. Previous versions live in git history.

### docs/ARCHITECTURE.md

Purpose: **how the system is built** — for technical onboarding.

Contains:
- Tech stack with rationale (why Cloudflare Workers, why Supabase, why Gemini)
- System diagram (input → processing → storage → output)
- Integration points (email routing, cron triggers, external APIs)
- Environment variables reference table

### docs/DECISIONS.md

Purpose: append-only log of **why** we chose X over Y.

Format:
```
## YYYY-MM-DD: [Short title]

**Context**: [What problem or question came up]
**Decision**: [What we chose]
**Alternatives considered**: [What we rejected and why]
**Status**: accepted | superseded by [link]
```

Add an entry when:
- Choosing between libraries or approaches
- Changing product direction
- Dropping or deferring a feature

### docs/ROADMAP.md

Purpose: what is done, what is in progress, what is next.

Format:
```
### Phase N: [Name] — [done | in progress | planned | deferred]
- [x] Completed item
- [ ] Pending item
- [ ] Pending item
```

Keep this in sync with `.cursor/plans/` but at a higher level (phases, not file-level tasks).

### docs/phases/ — Phase Archives

Each phase gets a numbered folder under `docs/phases/`. A phase folder contains exactly two files.

#### Naming convention

Format: `NN-short-name/` where NN is zero-padded phase number, short-name is lowercase kebab-case.

Examples:
- `01-ingestion-mvp/`
- `02-intelligence/`
- `03-dashboard-ui/`
- `04-daily-loop/`
- `05-ops-extension/`

#### SCOPE.md — written when a phase starts

Purpose: snapshot of what this phase will deliver and what is explicitly out of scope.

Template:
```
# Phase N: [Name]

## Goal
[One sentence: what problem this phase solves]

## In scope
- [Deliverable 1]
- [Deliverable 2]
- [Deliverable 3]

## Out of scope
- [Thing explicitly deferred]
- [Thing explicitly deferred]

## Acceptance criteria
- [ ] [How to verify deliverable 1 works]
- [ ] [How to verify deliverable 2 works]

## Key files touched
- `path/to/file.ts`
- `path/to/migration.sql`
```

Rules:
- Write SCOPE.md before starting implementation.
- Keep it under 40 lines. If it's longer, the phase is too big — split it.
- Do not update SCOPE.md during the phase. It's a snapshot of the plan at the start.

#### RETRO.md — written when a phase ends

Purpose: record what actually shipped vs. what was planned, and capture lessons.

Template:
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
```

Rules:
- Write RETRO.md immediately when the phase is marked done in ROADMAP.md.
- Be honest about deferred items — they feed the next phase's SCOPE.md.
- Keep it concise. 20-40 lines is ideal.

#### Phase lifecycle

1. **Starting a phase**: Create `docs/phases/NN-name/SCOPE.md`. Update `docs/ROADMAP.md` status to `in progress`.
2. **During a phase**: Update living docs (`SPEC.md`, `ARCHITECTURE.md`) as features ship. Log decisions in `DECISIONS.md` tagged with `[Phase N]`.
3. **Completing a phase**: Write `docs/phases/NN-name/RETRO.md`. Update `docs/ROADMAP.md` status to `done`.

#### Linking phases to decisions

Entries in `docs/DECISIONS.md` are tagged with the phase they belong to:

```
## 2026-02-17: [Phase 5] Use tasks metadata for renewals instead of new table

**Context**: Needed to store renewal reminders without a schema migration.
**Decision**: Store renewals as tasks with metadata.item_type = "renewal".
**Alternatives considered**: Dedicated renewals table (rejected: extra migration, RLS setup, and API surface for minimal benefit).
**Status**: accepted
```

This lets you filter decisions by phase when writing a retro or revisiting past choices.

### Sub-app READMEs (e.g., dashboard/README.md)

Purpose: standalone quick start for that sub-app. Someone should be able to run just the dashboard without reading the root README.

Required:
- What it is (one line)
- Prerequisites (Node version, env vars)
- Install + run commands
- Environment variables table

Replace boilerplate (e.g., create-next-app default) with project-specific content.

## Rules

1. **No duplicate specs.** There is exactly one `SPEC.md`. If two files describe the product, merge them.
2. **README is for running, docs/ is for understanding.** Never put architecture or roadmap in README.
3. **Keep documents current.** When implementing a feature, update the relevant doc in the same PR. Stale docs are worse than no docs.
4. **Link, don't copy.** If SPEC.md describes the data schema, ARCHITECTURE.md links to it instead of repeating it.
5. **Decisions are permanent records.** Never edit a past decision entry — add a new one that supersedes it.
6. **Sub-app READMEs are self-contained.** They should work without the root README.

## When to Create vs. Update

| Situation | Action |
|-----------|--------|
| New feature changes product direction | Update `docs/SPEC.md` |
| New tech choice or integration | Update `docs/ARCHITECTURE.md`, add `docs/DECISIONS.md` entry |
| Starting a new phase | Create `docs/phases/NN-name/SCOPE.md`, update `docs/ROADMAP.md` to `in progress` |
| Completing a phase | Write `docs/phases/NN-name/RETRO.md`, update `docs/ROADMAP.md` to `done` |
| Key decision made during a phase | Append to `docs/DECISIONS.md` with `[Phase N]` tag |
| Phase completed or priorities shift | Update `docs/ROADMAP.md` |
| New sub-app or service added | Create its own `README.md` |
| Boilerplate README exists | Replace with project-specific content |
| Two docs say the same thing | Merge into the canonical location, delete the duplicate |
