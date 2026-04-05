# Phase 07: Stability & Polish

**Status**: done (see `RETRO.md`)

## Goal
Stabilize the growing suggestions logic and resolve UI inconsistencies in the dashboard.

## Scope
- **API Corrections**: Fix `GET /api/growing/weekly` to correctly separate and return actions and inspirations.
- **Deterministic Sorting**: Ensure suggestions are sorted consistently across API and Worker.
- **Duplicate Prevention**: Enhance Worker and Refresh logic to handle existing suggestions (converted/dismissed) gracefully.
- **UI Improvements**: Update dashboard components to handle inspiration states correctly.
- **Email Preview Improvements**: Include task bodies in growing tasks and modernize the email template using React Email Tailwind.

## Success Criteria
- [x] Weekly API returns **actions** as the primary persisted suggestions; **supporting knowledge** is computed per action from verified knowledge (replaces the old inspiration-heavy weekly model).
- [x] Regeneration respects **converted** and **dismissed** windows for the current week (no duplicate noise for done items).
- [x] Sorting and filtering behave consistently in the dashboard (including per-column task sorts with `updated_at` where migrated).

## Adjustments (2026-04-03)

**Trigger**: Phase retro; implementation pivoted to action-linked supporting knowledge and `week_number` storage.

### Changed
- Weekly “inspirations” emphasis → **supporting knowledge** under each action; inspiration refresh endpoint may be deprecated or narrowed.
