# Phase 8.2: Tasks

## 1. Database & Types
- [x] Create `030_birthdays.sql` migration for the `birthdays` table
- [x] Define `Birthday` and `BirthdayCategory` types in `apps/dashboard/src/types/database.ts`
- [x] Add `BirthdayDigestItem` to `packages/shared/src/types/digest.ts`

## 2. API Implementation
- [x] Implement `GET /api/birthdays` for proximity-sorted listing
- [x] Implement `POST /api/birthdays` for creating new records
- [x] Implement `PATCH /api/birthdays/[id]` for updates (name, date, wishlist, status)
- [x] Implement `DELETE /api/birthdays/[id]`

## 3. UI Components
- [x] Create `AddBirthdayCard.tsx` for entry creation
- [x] Create `BirthdaysCard.tsx` with proximity countdowns and status management
- [x] Implement "Convert to Party Task" logic using the shared task creation utility
- [x] Manually implement `dropdown-menu.tsx` as a missing shadcn component

## 4. Dashboard Integration
- [x] Add "Birthdays" tab to `TasksDashboard.tsx`
- [x] Connect `BirthdaysCard` to the dashboard state and TanStack Query
- [x] Ensure category filters and proximity sorting are reactive

## 5. Email Integration
- [x] Implement `fetchUpcomingBirthdays` in `packages/shared/src/digest.tsx`
- [x] Integrate birthday countdowns into `generateBriefingNarrative` (Swedish text)
- [x] Update `DailyDigestEmail.tsx` template with "Birthdays & Events" section (Pink theme)
- [x] Highlight birthday countdown text in the daily briefing email
- [x] Update `DigestPreviewResponse` to support email testing in the dashboard

## 6. Verification
- [x] Verify year-end wrap-around logic for December/January birthdays
- [x] Test "Create Party Task" button and confirm title/bucket assignment
- [x] Verify email preview renders correctly with birthday data
- [x] Fix syntax error in `DailyDigestEmail.tsx`
- [x] Fix null pointer/undefined checks in related knowledge section of email
