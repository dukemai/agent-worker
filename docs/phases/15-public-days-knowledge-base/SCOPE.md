# Phase 15: Public Days Knowledge Base - Scope

## Status

Planned.

## Goal

Expand the configurable planning-day foundation introduced in Phase 13.2 into a fuller public-days knowledge base.

The default dataset should cover Swedish red days. The family should also be able to add practical dates such as kids returning to school, sportlov, school breaks, bridge days, term starts, local closure days, and other dates that affect household planning.

## In Scope

- Extend the planning-day data model and management experience where needed.
- Maintain and update the default Swedish red-day data.
- Broader categories, lifecycle, and knowledge-base behavior beyond Phase 13.2's digest settings.
- Digest selection logic that uses the Phase 13.1 human-scale countdown formatter.
- Dashboard management UI or a simple admin surface for adding and editing dates.
- Migration cleanup or enrichment beyond the Phase 13.2 foundation.

## Requested Entries (captured 2026-09-08)

Concrete planning days to support once this phase is built:

- **Mid-Autumn Festival (Tết Trung Thu)**: a single-day, lunar-calendar cultural event important in Vietnamese family tradition. Not a Swedish public day, so it needs a category beyond red day/school/closure, e.g. `cultural` or `family_tradition`. The date shifts every year against the Gregorian calendar, so recurrence can't reuse a simple fixed month/day rule the way most Swedish red days can.
- **Höstlov**: the Swedish autumn school break, represented as a date range like sportlov. Beyond the standard countdown, it should support a "no trip planned yet" nudge — when the break enters its lead-time window and no Trip Ops trip ([trip-ops.md](../../requirements/trip-ops.md)) covers those dates, the digest should prompt planning instead of only counting down. This is new behavior beyond a plain countdown and needs a date-overlap check against `trips`.

Note: general "what autumn events are happening in Sweden" (activities, not fixed dates) is a separate ask that fits the existing Summer Activities pattern generalized to an `autumn_2026` season ([summer-activities.md](../../requirements/summer-activities.md)) rather than this planning-days knowledge base — cross-referenced here, not owned by this phase.

## Out of Scope

- Full calendar sync.
- Automatic school-calendar crawling.
- Multi-country holiday imports.
- Complex recurrence rules beyond what is needed for yearly public days and school-related dates.

## Acceptance Criteria

- The daily digest can notify about both default Swedish red days and user-added planning days.
- A kids-back-to-school date can be added and rendered in the digest with the right countdown wording.
- Sportlov or another school break can be represented as a date range.
- The old hard-coded public-holiday list is no longer the source of truth.
- Public-day notifications stay concise and do not turn the digest into a generic calendar feed.
- Mid-Autumn Festival can be added as a recurring lunar-calendar single-day cultural entry outside the Swedish red-day set.
- Höstlov (or any date-range planning day) can trigger a "plan travel" digest nudge when no trip is linked to its dates, separate from its plain countdown.
