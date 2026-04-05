# Phase 07: Stability & Polish — Retro

## Shipped

- Growing weekly model moved to ISO `week_number` as the primary key (migrations, shared helpers, API, digest, types).
- Weekly generation rebuilds the current week safely: seasonal verified windows, excludes converted and preserves dismissed rows; unique index on `(week_number, window_id)` with insert fallback when needed.
- Weekly API and UI pivoted to **action-first** output with **action-linked supporting knowledge** from verified `growing_knowledge` (replaces the earlier inspiration-heavy model for weekly UX).
- Dashboard polish: tasks board (per-column filter/sort, `updated_at` + migration), Radix dialogs for add task and growing context, `BucketCard` loading/counts, `TaskCard` visual refresh, global dialog scrolling.
- Growing tabs: knowledge and sources layout aligned with the design system; weekly tab regenerate control and dismissed filtering for recommended actions.
- Documentation: `growing-api.md`, `growing.md`, `generate-weekly-suggestions.md`, `DATABASE-ARCHITECTURE`, week-14 development log.

## Deferred

- **Year-safe weekly key**: `week_number` alone can collide across years; follow up with `week_year` (or equivalent) and index updates (flagged in development log).
- **Full TASKS.md checklist**: Original checklist (strict `suggestion_kind` filters, email template Tailwind pass) partially superseded by the supporting-knowledge pivot; any remaining digest/email template gaps should be re-verified against `DailyDigestEmail` and product expectations.
- **Environments**: Confirm migrations `015`–`016` applied everywhere; remove deprecated inspirations refresh path once unused.

## Surprises

- Scope evolved from “fix actions vs inspirations API split” toward a **supporting-knowledge** read model while keeping actions as the persisted weekly rows—larger product shift than the initial SCOPE implied, but aligned with the knowledge library investment.

## Lessons

- When storage semantics change (e.g. `week_start_date` → `week_number`), ship the **migration + fallback paths** in the same slice as API/UI to avoid partial deploys.
- **Append development logs** during heavy weeks; they make retros and handoff much faster than reconstructing from commits alone.
