# Dashboard Refactor Plan

## Goal
Refactor the dashboard app page-by-page into smaller, focused, testable modules with clearer boundaries for data orchestration and UI presentation.

## Phases
- **Phase 1 (current):** Tasks page (`TasksDashboard`) decomposition.
- **Phase 2+:** Remaining dashboard pages (context, learning, growing) to be scoped after Phase 1 validation.

## Phase 1 Scope: Tasks Page
Break the large tasks dashboard component into a `tasks/` module where:
- `TasksDashboard` owns queries, mutations, and cache invalidation.
- Presentational cards/boards own only local UI state and rendering.

### Target module layout
- `apps/dashboard/src/components/dashboard/tasks/types.ts`
- `apps/dashboard/src/components/dashboard/tasks/api.ts`
- `apps/dashboard/src/components/dashboard/tasks/RenewalsCard.tsx`
- `apps/dashboard/src/components/dashboard/tasks/AddTaskCard.tsx`
- `apps/dashboard/src/components/dashboard/tasks/AddRenewalReminderCard.tsx`
- `apps/dashboard/src/components/dashboard/tasks/TasksBoard.tsx`
- `apps/dashboard/src/components/dashboard/tasks/TasksDashboard.tsx`
- `apps/dashboard/src/components/dashboard/tasks/index.ts`

### Implementation notes
- Keep behavior parity with current tasks page.
- Preserve bucket operations (`today`, `this_week`, `later`) and reminder actions.
- Keep mobile tabs / desktop 3-column layout in the tasks board.
- Update page wiring to import `TasksDashboard` from `@/components/dashboard/tasks`.
- Remove legacy `tasks-dashboard.tsx` after migration is complete.
