# Phase 15: Public Days Knowledge Base - Tasks

## Planning

- [ ] Decide the data model for single-day and date-range public days.
- [ ] Decide default categories, such as red day, school, family planning, closure, and local event.
- [ ] Decide digest lead-time defaults per category.
- [ ] Decide category and recurrence handling for non-Swedish cultural/family dates (e.g., Mid-Autumn Festival), including lunar-calendar dates that shift year to year.
- [ ] Decide how a date-range planning day (e.g., Höstlov) checks for an overlapping Trip Ops trip and what a "no trip planned yet" nudge looks like (copy, lead time, dismissal).

## Implementation

- [ ] Add database migration for public days / planning days.
- [ ] Seed Swedish red days as default entries.
- [ ] Add dashboard API routes for listing, creating, updating, and dismissing public days.
- [ ] Add a small dashboard management surface.
- [ ] Replace the hard-coded holiday lookup in shared digest generation.
- [ ] Reuse the Phase 13.1 human-scale countdown formatter.

## Validation

- [ ] Verify a red day appears in the digest with human-scale wording.
- [ ] Verify a kids-back-to-school date can be added and appears in the digest.
- [ ] Verify a school break such as sportlov can be represented as a date range.
- [ ] Verify distant dates are suppressed unless their lead-time settings make them relevant.
- [ ] Verify Mid-Autumn Festival appears as a single-day cultural entry distinct from Swedish red days.
- [ ] Verify a Höstlov entry with no linked trip produces a "plan travel" nudge, and that linking a trip suppresses it.
