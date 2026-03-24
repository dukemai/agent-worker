# Phase 07 Tasks

## API Improvements
- [ ] Fix `apps/dashboard/src/app/api/growing/weekly/route.ts`
    - [ ] Correctly filter `actions` by `suggestion_kind === 'action'`
    - [ ] Correctly filter `inspirations` by `suggestion_kind === 'inspiration'`
    - [ ] Add deterministic sorting (priority DESC, title ASC)
- [ ] Fix `apps/dashboard/src/app/api/growing/weekly/inspirations/refresh/route.ts`
    - [ ] Add deterministic sorting to selection logic

## Worker Improvements
- [ ] Fix `apps/worker/src/crons/growing-suggestions.ts`
    - [ ] Fetch existing window IDs for the week to avoid unique constraint violations
    - [ ] Add deterministic sorting to selection logic

## UI Improvements
- [ ] Update `apps/dashboard/src/components/dashboard/growing-weekly-tab.tsx`
    - [ ] Show "Linked task" for inspirations if they have been converted
    - [ ] Ensure buttons are hidden/disabled if suggestion is already converted

## Email Preview Improvements
- [ ] Update `packages/shared/src/types/digest.ts`
    - [ ] Add `body` field to `GrowingTaskDigestItem`
- [ ] Update `packages/shared/src/digest.tsx`
    - [ ] Extract `original_body` in `extractGrowingTaskItems`
- [ ] Update `packages/shared/src/emails/DailyDigestEmail.tsx`
    - [ ] Use `Tailwind` and update template based on `email-sample.tsx`
    - [ ] Display `original_body` for tasks
