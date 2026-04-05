# Development Log - Week 14

Week: 14 (ISO week)  
Year: 2026

## Goals

- Migrate growing weekly suggestion tracking from `week_start_date` to single `week_number` (ISO week number).
- Keep weekly generation, refresh, and digest behavior working with the new schema.
- Document logic and link implementation docs to requirements.

## Progress

- Added shared week-number helper `getISOWeekNumber` and switched weekly matching to direct equality checks (`week_number = currentWeek`) in generation and API flows.
- Updated `generateWeeklySuggestions` to:
  - read existing rows by `week_number`,
  - insert `week_number: currentWeekNumber`,
  - upsert on conflict key `week_number,window_id`.
- Updated weekly APIs:
  - `GET /api/growing/weekly` now checks by `week_number`.
  - `POST /api/growing/weekly/inspirations/refresh` deletes pending inspirations by `week_number`.
- Updated digest weekly pull (`fetchWeeklyGrowingSuggestions`) to use `week_number` instead of `week_start_date`.
- Updated shared and dashboard TS types for `GrowingSuggestion` to use `week_number: number`.
- Added migration `014_growing_suggestions_week_numbers.sql` to:
  - add `week_number INT`,
  - backfill from legacy `week_start_date`,
  - replace unique index with `(week_number, window_id)`,
  - drop `week_start_date`.
- Created and linked docs:
  - `packages/shared/docs/generate-weekly-suggestions.md`
  - linked from `docs/requirements/growing.md`
  - updated `docs/DATABASE-ARCHITECTURE.md` to reflect `week_number`.
- Reworked weekly generation flow to rebuild current week from scratch:
  - cleanup current week rows first,
  - select only seasonal, verified windows,
  - exclude windows already converted to tasks,
  - keep top 10 **actions** only.
- Added robustness for environments missing composite unique index:
  - keep `upsert` on `(week_number,window_id)` when supported,
  - fallback to `insert` if ON CONFLICT constraint is unavailable.
- Added migration `015_growing_suggestions_unique_week_number_window_id.sql`:
  - deduplicate historical rows by `(week_number, window_id)`,
  - enforce unique index on `(week_number, window_id)`.
- Introduced action-linked supporting knowledge in weekly response:
  - new shared helper builds per-action knowledge matches from `growing_knowledge`,
  - scoring uses overlap with action tags, action title tokens, and profile interests,
  - returns grouped payload: `[{ action_id, window_id, knowledge[] }]`.
- Updated dashboard weekly UI:
  - replaced inspirations usage with "Knowledge for your actions",
  - renders related knowledge snippets directly under each action card.
- Updated docs and contracts to match new behavior:
  - `docs/requirements/growing-api.md` now documents `supporting_knowledge` grouped by action,
  - `docs/requirements/growing.md` reflects actions + supporting knowledge model,
  - `packages/shared/docs/generate-weekly-suggestions.md` includes supporting-knowledge flow details.

- Polished dashboard tasks UX:
  - Switched \"Add Task\" inline card to a Radix dialog modal trigger to free vertical space for the task columns.
  - Moved loading state and item counts into each `BucketCard` header so every column shows its own \"Loading tasks…\" and `(n)` count.
  - Flattened bucket columns (removed borders/shadows) while keeping individual tasks as cards.
  - Redesigned `TaskCard` to use background and typography for status (pending vs done) and compact icon-sized controls for complete, open, and delete.

- Improved growing weekly planning & UI:
  - Updated `generateWeeklySuggestions` to derive initial `status` from the real tasks table: any window that already has a task now comes back as `status: "converted"` with `converted_task_id` set, so the dashboard can show it as \"Planned\".
  - Preserved per-window dismissed status across regenerations by reading existing `growing_suggestions_log` rows for the current week and keeping `status: \"dismissed\"` when rebuilding suggestions.
  - Filtered dismissed actions out of the \"Recommended Actions\" bucket in `GrowingWeeklyTab` while still keeping them in the raw response (so UI only highlights active recommendations).
  - Turned the growing context editor into a modal with a compact trigger and a one-line profile summary, aligning growing UI with the updated task design system.
  - Added a compact \"Regenerate\" control on the weekly growing tab that calls `/api/growing/weekly/inspirations/refresh` and refreshes weekly suggestions without dominating the layout.

- Tasks board filtering and sorting (per column):
  - Each `BucketCard` now has its own status filter (all / undone / done) and sort (last updated newest or oldest; status with undone or done first).
  - Default sort is **undone first**, with newest activity as the tie-breaker within the same status.
  - Header counts show `(visible/total)` when a filter other than \"all\" is active.
  - Added migration `016_tasks_updated_at.sql`: `tasks.updated_at` column, backfill from `created_at`, and a `BEFORE UPDATE` trigger so \"last updated\" reflects real edits; `Task` in dashboard types includes optional `updated_at` until all DBs are migrated.

- Global dialog scrolling:
  - `DialogContent` now caps height (`max-h` using viewport) with `overflow-y-auto` and `min-w-0` so tall content (e.g. Add Source with long transcript) stays scrollable and the footer actions remain reachable.

- Growing Knowledge tab layout:
  - \"Mark verified\" / \"Mark unverified\" and \"Delete\" moved to the right side of each knowledge row (aligned with Growing Windows cards).
  - Filter controls moved into the **Knowledge Library** card header (same pattern as the Windows tab), instead of a separate Filters card.

- Growing Sources tab layout:
  - **Delete** and **Clean & re-extract** sit in the top row on the right; **Video/Blog** and **status** badges sit inline next to the title, with subtitle (channel / hostname) on the next line.

## Decisions

- Use single ISO `week_number` as the primary weekly key for growing suggestions.
- Keep week start date logic in API response for display continuity for now, while storage/filtering moved to `week_number`.
- Replace weekly inspiration generation with action-linked supporting knowledge from verified `growing_knowledge`.
- Treat weekly output as action-first: actions are persisted in `growing_suggestions_log`; supporting knowledge is computed on read.

## Issues / Risks

- **Year collision risk**: week number alone can collide across years (e.g., week 14 in different years). A `week_year` field may be needed for strict uniqueness over time.
- Some non-core docs/contracts may still reference legacy `week_start_date` and should be aligned in a follow-up sweep.
- Until all environments apply migration `015`, some DBs may still hit ON CONFLICT constraint gaps (fallback path currently mitigates this).
- Until migration `016_tasks_updated_at` is applied, task \"last updated\" sorts fall back to `created_at` only.

## Next Steps

- Decide whether to add `week_year` (recommended) and update unique key/index accordingly.
- Run pending DB migrations in target environments (including `016_tasks_updated_at` for task `updated_at`) and verify backfill and dashboard sort behavior.
- Remove deprecated inspirations refresh endpoint/client helper if no longer needed.
- Smoke-test end-to-end flows: weekly generation, convert-to-task, action-linked supporting knowledge relevance, and digest rendering.
