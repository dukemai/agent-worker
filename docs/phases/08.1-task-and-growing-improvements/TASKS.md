# Phase 08.1 — Implementation Tasks (Refined)

## 1. Task Management Refinement (Slice A)

- [ ] **Single Task View**
  - [ ] Create route `apps/dashboard/src/app/tasks/[id]/page.tsx`.
  - [ ] Implement `TaskDetailView` showing title, body, due date, and metadata.
  - [ ] For `growing` tasks, display **Related Knowledge** nuggets.
  - [ ] Display **Source Link** if available.
- [ ] **Dashboard Integration**
  - [ ] Update `TaskCard.tsx` to link title to detail page.
- [ ] **Email Digest Links**
  - [ ] Update `digest.tsx` and `DailyDigestEmail.tsx` to include `/tasks/[id]` deep links.
  - [ ] Add "View all growing tasks" link to dashboard.

## 2. Growing Catalog Management (Slice B)

- [ ] **Merge Windows API**
  - [ ] Create `apps/dashboard/src/app/api/growing/windows/merge/route.ts`.
  - [ ] Implement logic to reassig `tasks` and `growing_suggestions_log` to primary window.
  - [ ] Merge `tags` and `stockholm_note`.
  - [ ] Delete secondary windows.
- [ ] **Merge Windows UI**
  - [ ] Update `GrowingWindowsTab.tsx` with selection mode.
  - [ ] Create `MergeWindowsDialog` for confirmation and primary selection.
- [ ] **Top-up Logic**
  - [ ] Refactor `generateWeeklySuggestions` in `packages/shared/src/growing/weekly.ts`.

## 3. Verification

- [ ] Verify merge logic handles task re-assignment correctly.
- [ ] Verify detail page loads correctly from email links.
- [ ] Ensure knowledge nuggets are correctly linked in detail view.
