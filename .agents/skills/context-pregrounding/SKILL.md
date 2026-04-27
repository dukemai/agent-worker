---
name: context-pregrounding
description: Use before implementing, debugging, reviewing, planning, or changing this project when current repo context is needed. Preground from the repo docs folder, especially architecture, requirements, and phase documents, before touching code.
metadata:
  short-description: Load project context from docs before work
---

# Context Pregrounding

Use this skill at the start of project work when the task depends on existing product, architecture, API, database, phase, or design context.

The goal is to build just enough context from `docs/` to work quickly and accurately. Do not read every document by default.

## Pregrounding Workflow

1. Inspect the docs map.
   - Start with `docs/SPEC.md` for product scope and domain.
   - Read `docs/ARCHITECTURE.md` for repo layout, stack, integration points, and shared package boundaries.
   - Read `docs/requirements/INDEX.md` to route feature-specific requirements.
   - Use `docs/GLOSSARY.md` when domain terms, table names, or metadata conventions are unclear.

2. Select task-specific docs.
   - For dashboard or UI work: read `docs/DASHBOARD-ARCHITECTURE.md`, `docs/DESIGN-SYSTEM.md`, and the relevant requirement doc.
   - For API, database, Worker, Supabase, or shared-package work: read `docs/DATABASE-ARCHITECTURE.md`, `docs/ARCHITECTURE.md`, and the relevant requirement doc.
   - For feature work: use `docs/requirements/INDEX.md` to pick only the requirement docs related to the requested feature.
   - For work tied to a known phase: read that phase folder's `SCOPE.md`; read `TASKS.md` for implementation status and `RETRO.md` for lessons or follow-up context when present.
   - For roadmap or prioritization work: read `docs/ROADMAP.md` and the relevant phase docs.
   - For architectural choices: read `docs/DECISIONS.md` before proposing or changing patterns.

3. Use search before broad reads.
   - Prefer `rg` and `rg --files docs` to locate relevant docs, feature names, routes, table names, or phase numbers.
   - Avoid loading large generated/raw JSON files from `docs/requirements/` unless the task explicitly needs catalog sample data.

4. State the working context briefly.
   - Before making edits, summarize the docs read and the key constraints they imply.
   - If docs conflict with code, treat code as current behavior and call out the doc drift.

5. Keep docs current.
   - If code changes alter product behavior, API contracts, database shape, architecture, design system patterns, or phase status, update the smallest relevant doc.
   - Prefer updating an existing requirement, architecture, phase `TASKS.md`, or phase `RETRO.md` rather than creating a new doc.

## Project Doc Map

- `docs/SPEC.md`: product spec, user, feature areas, high-level data schema.
- `docs/ARCHITECTURE.md`: stack, monorepo layout, Worker, shared package, integrations.
- `docs/DASHBOARD-ARCHITECTURE.md`: dashboard routes, frontend structure, data flow.
- `docs/DATABASE-ARCHITECTURE.md`: Supabase schema and persistence decisions.
- `docs/DESIGN-SYSTEM.md`: UI conventions.
- `docs/requirements/INDEX.md`: feature requirement routing.
- `docs/phases/*/SCOPE.md`: phase intent and boundaries.
- `docs/phases/*/TASKS.md`: phase task status.
- `docs/phases/*/RETRO.md`: completed work, decisions, and follow-ups.
- `docs/DECISIONS.md`: architecture and product decisions.
- `docs/ROADMAP.md`: sequencing and future direction.
- `docs/GLOSSARY.md`: domain terms and schema vocabulary.

## Fast Commands

```bash
rg --files docs
rg -n "feature|route|table|phase" docs
sed -n '1,220p' docs/requirements/INDEX.md
```

## Done Criteria

Pregrounding is complete when you can name:

- the relevant product requirement or phase,
- the architecture or data boundary affected,
- the likely files or modules to inspect next,
- any doc/code drift or missing context.
