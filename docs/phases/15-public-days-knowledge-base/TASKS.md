# Phase 15: Public Days Knowledge Base - Tasks

## Planning

- [ ] Decide the data model for single-day and date-range public days.
- [ ] Decide default categories, such as red day, school, family planning, closure, and local event.
- [ ] Decide digest lead-time defaults per category.

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
