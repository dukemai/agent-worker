# Phase 13.2: Daily Digest Improvements - Tasks

## Discussion First

- [ ] Review representative delivered digests and the dashboard preview.
- [x] List the decisions the digest currently helps with and where it creates noise or extra work.
- [x] Rank the initial pain points by frequency and consequence.
- [x] Agree the hierarchy for Act now, Today, Prepare next, This week, and Optional context.
- [x] Agree initial section ordering, density, cadence, freshness, and suppression rules for the implementation slice.
- [x] Decide that normal tasks remain the action mechanism; no new email-specific actions are required.
- [x] Decide the inline detail and dashboard deep links for activities, trip readiness, and settings.
- [x] Define initial quiet-day, ordinary-day, urgent-day, travel, and growing-season behavior.
- [ ] Define the purpose, timing, and content of period-end “rewind” messages.

## Scope The First Slice

- [x] Sequence the agreed improvements: three-week planning days, favorite activities, trip readiness, growing seasons, and quiet-day behavior.
- [x] Record explicit non-goals in `SCOPE.md`.
- [x] Identify affected Worker, shared email, dashboard preview, and data boundaries.
- [x] Define acceptance criteria in the verification checklist.

## Implementation

- [x] Suppress red days outside a three-week lead window.
- [x] Add manually configurable single-day and period school/planning dates with shared lead-window rules.
- [x] Add validated, versioned planning-day JSON upload with a reusable downloadable template.
- [x] Include timely favorite activities with a concise reason for appearing.
- [x] Add upcoming-trip completeness checks, starting with missing day-one itinerary data.
- [x] Add configurable growing periods and season-aware digest volume/focus.
- [x] Add compact quiet-day rendering.
- [x] Suppress quiet-day delivery and unchanged repeated items with delivery-state memory.
- [x] Apply explicit reminder milestones, favorite-activity rules, promotion caps, and Monday/Friday growing cadence.
- [x] Gradually phase Summer Activities out for three weeks after a configured autumn school-start date.
- [x] Show a shared “Why this was sent” explanation in delivered email and preview.
- [x] Separate routine meals, shopping, tasks, and family dates into a Sunday weekly planning email.
- [x] Use one Stockholm target date for preview, selection, rendering, and DST-safe scheduling.
- [ ] Add period-end rewind only after its behavior is agreed.

## Verification

- [x] Delivered email and dashboard preview use the same shared content and ordering rules.
- [x] Dashboard TypeScript and lint pass.
- [x] Production dashboard build passes.
- [x] Add deterministic relevance-policy tests for DST, calendar dates, change detection, milestones, and quiet-day sending.
- [ ] Apply migration `060_daily_digest_preferences.sql` and verify against deployed Supabase data.
- [ ] Exercise red-day, school date, favorite activity, missing itinerary, and all three growing modes in digest preview.
