# Phase 13.2: Daily Digest Improvements - Scope

## Status

Scope refinement. The core product direction is agreed; implementation details and the first delivery slice still need to be finalized.

## Goal

Review the daily digest as the primary morning decision surface and agree a focused improvement slice before continuing to Phase 14.

The review should reduce planning load and make the most useful actions, warnings, and context easier to understand at a glance. It should consider the digest as one product rather than tuning isolated sections independently.

## Agreed Product Direction

The digest remains task-led. Pending tasks are the most consistently useful input and should anchor the morning email.

Organize the digest by decision horizon rather than presenting every feature as an equally important feed:

1. **Act now**: urgent warnings, missing preparation, and overdue or time-critical work.
2. **Today**: today's tasks, fixed plans, and immediately relevant conditions.
3. **Prepare next**: tomorrow and near-term preparation.
4. **This week**: a compact planning view.
5. **Optional context**: fresh, seasonally relevant information that is useful but not actionable today.

No new email-specific task actions are needed. The digest should explain and prioritize the work; normal tasks remain the action mechanism.

## Approved Improvement Areas

### Planning Days

- Show Swedish red-day reminders only inside a three-week lead window.
- Add user-managed planning dates and date ranges for school starts, sportlov, other school breaks, and similar family dates.
- Use the global red-day lead window for red days and a standard three-week window for other planning dates.
- Keep distant dates out of the normal digest even if the countdown formatter can describe them.

### Favorite Activities

- Include relevant activities explicitly marked as favorites.
- Favor timely seasonal entries and useful near-term options; do not dump the full favorites list into the email.
- Explain why a favorite appears now, such as occurring today, ending soon, requiring booking, or fitting the coming weekend.

### Trip Readiness

- Detect upcoming trips with materially incomplete planning data.
- Surface concise preparation warnings such as a missing itinerary for day one.
- Keep full itinerary-aware daily guidance, event-risk checking, opening-hours validation, and the trip run sheet in Phase 14.

### Growing Seasons

- Add user-managed growing-season settings rather than treating gardening cadence as uniform year-round.
- Distinguish at least a high-growth/gathering period from a harvest period and an off/quiet period.
- During high season, prioritize fresh care and gathering information.
- During harvest season, reduce volume and prioritize harvesting and preservation-relevant work.
- During the quiet period, omit routine growing content unless something is time-sensitive.

### Quiet Days And Period Endings

- When there is little actionable content, send a deliberately calm, compact digest instead of filling space.
- Explore a short retrospective or “rewind” near the end of a meaningful period, such as the growing high season, harvest season, summer break, or a trip.
- The exact rewind content and trigger rules remain open for discussion.

## Discussion Topics

### Decision Priority

- What must be acted on today?
- What needs preparation for tomorrow or this week?
- Which warnings deserve interruption-level prominence?
- What is useful context but not actionable?

### Structure And Density

- Section order and hierarchy.
- Maximum useful email length.
- When a section should be summarized, collapsed to a count, linked out, or omitted.
- Whether repeated items should change wording or disappear when nothing has changed.

### Timing And Cadence

- Which sections belong every day versus selected weekdays or event-driven windows.
- How near-term, weekly, and longer-range items should coexist.
- Suppression and freshness rules for stale or low-signal content.

### Actionability

- Which items need direct actions or deep links.
- Whether each item clearly communicates why it appears now.
- How completed, dismissed, deferred, or acknowledged items affect later digests.

### Personal Relevance

- Balance among tasks, renewals, trips, activities, growing, learning, promotions, weather, and public days.
- Weekday, weekend, travel, school-break, and seasonal modes.
- Whether the digest needs explicit “quiet day” behavior when there is little to report.

### Reliability And Verification

- Faithfulness between digest preview and the delivered email.
- Generation time, target date, timezone, and data-freshness visibility.
- Fixtures for empty, ordinary, busy, urgent, weekend, travel, and seasonal days.

## Boundaries During Discussion

- Do not implement the Trip Ops run sheet, live itinerary guidance, event-risk checks, or opening-hours validation here.
- Add only the school/planning-day settings needed for the agreed digest behavior; broader knowledge-base features remain a later extension.
- Do not redesign the dashboard unless a digest action requires a destination or deep link.

## Exit Criteria

- Current digest pain points are recorded and ranked.
- Content hierarchy and suppression principles are agreed.
- The first implementation slice has explicit in-scope and out-of-scope boundaries.
- Verification scenarios and success signals are defined.
- Phase 14 can reuse the agreed digest conventions without reopening the same product decisions.
