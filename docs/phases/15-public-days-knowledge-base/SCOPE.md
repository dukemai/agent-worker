# Phase 15: Public Days Knowledge Base - Scope

## Status

Planned.

## Goal

Replace the hard-coded red-day countdown list with a configurable public-days knowledge base that can notify the daily digest about planning-relevant dates.

The default dataset should cover Swedish red days. The family should also be able to add practical dates such as kids returning to school, sportlov, school breaks, bridge days, term starts, local closure days, and other dates that affect household planning.

## In Scope

- Data model for public days / planning days.
- Default Swedish red-day seed data.
- User-managed dates with category, date or date range, lead time, and digest relevance.
- Digest selection logic that uses the Phase 13.1 human-scale countdown formatter.
- Dashboard management UI or a simple admin surface for adding and editing dates.
- Migration path away from the current hard-coded holiday list.

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
