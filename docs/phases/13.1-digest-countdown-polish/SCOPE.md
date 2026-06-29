# Phase 13.1: Digest Countdown Polish - Scope

## Status

Implemented.

## Goal

Make daily digest countdowns feel human-scale instead of exposing raw day counts when an event is still far away.

For example, a public holiday 60 days away should read closer to "in about 2 months" than "in 60 days". Close events should still use exact day wording because they are operationally relevant.

## In Scope

- Update red-day / public-holiday countdown copy in the daily briefing.
- Use exact labels for near events: today, tomorrow, and day counts inside roughly two weeks.
- Use approximate week or month labels for longer lead times.
- Keep the digest focused on events that help planning, rather than turning it into a long calendar feed.
- Document the countdown behavior in the Daily Digest requirements.

## Out of Scope

- Building a configurable public-days knowledge base.
- Calendar sync.
- New public-day data sources.
- Broader Summer Activities changes.

## Acceptance Criteria

- A red day around 60 days away renders as an approximate month label, not a raw day count.
- Events inside two weeks still render with exact urgency.
- The daily briefing highlight rendering still works for day, week, and month countdown units.
- The behavior is covered by focused validation or a manual digest preview check.

## Follow-Up

Phase 15 should add a configurable public-days knowledge base for digest notifications, starting with Swedish red days and allowing family-specific dates such as school term starts, sports breaks, and other planning-relevant public days.
