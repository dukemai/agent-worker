# Phase 5: Ops Extension — Retrospective

## What went well

- TanStack Query refactor dramatically reduced boilerplate — loading, error, and cache states are handled consistently.
- Metadata convention (`tasks.metadata.item_type`) let us add renewals and growing-task conversion without schema migrations.
- Growing seed data approach (static windows table) provides reliable, predictable suggestions without AI cost.
- Mobile-first responsive design works well with Tailwind `md:` breakpoints.

## What could be better

- Phase scope was large — could have been split into 5a (mobile + TanStack) and 5b (renewals + growing).
- No automated tests for API routes or mutations.
- Growing suggestions lack personalization beyond interest keywords — future phases could use AI to tailor advice.

## Lessons for future phases

- Keep phase scope to 1-2 features maximum to maintain focus.
- Metadata convention works well for up to ~3 item types; beyond that, consider dedicated tables.
- Write phase SCOPE.md before starting implementation (not after).
- Time-box large refactors and set guardrails for component size (e.g. aim for React components under ~400 lines, and break them down when they grow beyond that).

## 2026-03-05 Updates — Growing Dashboard & Suggestions

### Shipped
- Refactored the Growing dashboard into focused tabs with local query/mutation state (profile, weekly, sources, windows, knowledge).
- Added verification flows and filters for `growing_windows` and `growing_knowledge`, and wired them into the weekly suggestions.
- Implemented a refresh mechanism for weekly inspirations that regenerates from verified windows via `growing_suggestions_log` without breaking uniqueness constraints.

### Deferred
- Make weekly inspiration refresh ordering deterministic and clearly prioritized (current shuffle-like behavior is acceptable for now and scheduled for a later phase).

### Lessons
- When seeding from catalog tables (like windows) into logs, always design APIs to be idempotent with respect to unique constraints (e.g., `(week_start_date, window_id)`).
- Growing features benefit from explicit verification and filters to keep the weekly view trustworthy and not overwhelming.
