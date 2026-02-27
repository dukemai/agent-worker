# Phase 5: Ops Extension — Scope

**Status**: done

## Goal

Extend the platform with mobile-first UX, renewal reminders, growing season tracker, and improved data management.

## Deliverables

### Mobile-First Dashboard
- Responsive layout: tabs on mobile, grid on desktop
- Hamburger menu for navigation on small screens
- Touch-friendly card sizes and tap targets

### Renewal Reminders
- Create, snooze, complete renewal reminders (passport, subscriptions, memberships)
- Urgency grouping: critical (≤7d), urgent (≤14d), soon (≤30d)
- Recurrence: auto-create next reminder on completion (yearly, monthly)
- Renewal section in daily digest

### Growing Season Tracker
- `growing_profiles` with Stockholm defaults
- `growing_windows` seed data (14 seasonal entries for Stockholm)
- Weekly suggestion generation (actions + inspirations by current month)
- One-tap conversion of suggestions to planner tasks
- Growing section in daily digest

### Data Fetching Refactor
- All dashboards (tasks, context, learning) migrated from `useEffect` to TanStack Query
- `useQuery` for reads, `useMutation` for writes, `invalidateQueries` for cache sync

### Category-Based Learning
- Learning profiles with `profile_type` (topic or category)
- Category-based "surprise me" lesson generation

---

## Adjustments (2026-02-25)

**Trigger**: New user requirement — extend Growing Season Tracker sources beyond YouTube.

### Added

**Growing Season Tracker — Blog source support**
- Add blog URLs as a source type alongside YouTube
- Fetch blog content (HTML → text extraction) for processing, or allow manual paste
- Reuse existing extraction pipeline (tips → growing_knowledge, growing_windows) for blog text
- UI: support blog URL input in Sources tab; detect source type (YouTube vs blog) and route accordingly
