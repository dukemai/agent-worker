# Daily Digest

## Overview

Morning email sent at 06:30 Stockholm time. Primary decision surface for the day.

## Workflow

1. Cloudflare Cron Trigger runs daily at 05:30 UTC (06:30 Stockholm).
2. Worker fetches pending tasks, Stockholm weather, learning lessons, promotions, renewals, and growing suggestions.
3. Gemini generates a narrative briefing (weather-aware, e.g., rain = remind kids about rain coats).
4. A single structured email is sent via Resend.

## Digest Sections

- **Weather** — Stockholm summary, rain alert
- **Today's Briefing** — AI-generated narrative
- **Tasks** — Today, This Week, Later
- **Garden This Week** — Converted growing tasks + weekly ideas *(included only on Mondays and Fridays)*
- **New Growing Knowledge** — Recent tips from videos/articles (last 24h) *(included only on Mondays and Fridays)*
- **Upcoming Renewals** — T-30 to T-1
- **Today's Learning** — Bite-sized lessons
- **Deals for You** — Matched promotions
- **Upcoming Trips** — Trips starting in the next 45 days, with countdowns highlighted in the briefing during the final 14 days

## Countdown Wording

Digest countdowns should be human-scale. Exact day counts are useful near an event, but noisy when the event is far away.

- Today: say `today`.
- Tomorrow: say `tomorrow`.
- 2-13 days away: use exact days.
- 14-55 days away: use approximate weeks.
- 56-364 days away: use approximate months.
- 365+ days away: hide from the normal digest unless the event has a specific planning reason.

Countdown wording and notification eligibility are separate decisions. A formatter may support distant dates without making those dates useful enough to show.

Red-day / public-holiday countdowns should follow this wording, but normal digest eligibility starts only when the date is within **three weeks**. Other digest event types can adopt the formatter with their own lead-time settings.

## Public Days Follow-Up

Phase 13.2 should add the first configurable planning-day settings needed by the digest. It should cover Swedish red days and user-maintained dates or date ranges such as kids returning to school, sportlov, other school breaks, bridge days, and family-relevant events. Individual planning days do not configure their own lead time: red days use the global red-day window and other planning dates use the standard three-week window.

Planning dates are explicitly created as either a single day or a period. Red days are always single-day entries; school breaks and similar ranges can use a start and end date.

The settings modal groups saved planning days by category and gives each category a distinct icon so red days, school dates, family dates, closures, and other dates are easy to scan.

The settings modal accepts a versioned `dad-ops.planning-days` JSON document. Imports validate every row before writing and update-or-insert by title, category, and start date without requiring a database `ON CONFLICT` constraint. The reusable template lives at `/templates/digest-planning-days.json`.

Phase 15 can expand this foundation into a broader public-days knowledge base.

## Digest Priority

The email is task-led and ordered by decision horizon:

1. **Act now** — urgent warnings, missing preparation, and overdue or time-critical tasks.
2. **Today** — today's tasks, fixed plans, and immediately relevant conditions.
3. **Prepare next** — tomorrow and near-term preparation.
4. **This week** — compact weekly planning.
5. **Optional context** — fresh, relevant information that does not require action today.

Quiet days should remain short and calm. The system should not promote low-signal content merely to fill every section.

### Relevance Memory And Send Gate

The digest is an exception surface, not a daily inventory. Successful deliveries record a stable item key and a hash of the material content that was shown. Unchanged items stay suppressed until a defined reminder milestone; changed items become eligible again. Failed deliveries do not advance this state.

- A quiet day sends no email.
- New or materially changed normal tasks may appear once; due-today and overdue tasks remain interruptive.
- Renewals use T-30, T-14, T-7, T-2, T-1, and due-day milestones.
- Birthdays use T-14, T-7, T-2, T-1, and the birthday.
- Trips use T-14, T-7, T-3, T-1, and departure day, plus material plan/readiness changes.
- Planning days use their first eligible appearance and T-21, T-14, T-7, T-2, T-1, and start-day milestones where applicable.
- Activities are limited to favorites and appear for today, an imminent booking deadline, or Thursday-through-Saturday weekend planning.
- Summer Activities taper from a recognized autumn school-start planning date: at most two items in the first school week, at most one today/imminent-booking item in weeks two and three, then none after three weeks. Without a recognized school-start date, the normal activity rules remain in effect.
- Growing content appears only on Monday and Friday and only when pending and not already shown unchanged.
- Promotions are capped at three and repeat only after a material change.

All selection uses one explicit Stockholm target date shared by preview, narrative, and delivery. Cron runs at both possible UTC offsets and sends only when the local Stockholm hour is 06:30.

Every sent digest begins with a compact **Why this was sent** summary built from the same filtered payload that controls the send gate. The dashboard preview shows the equivalent **Why this would send** explanation. Routine weekly planning is handled separately by the Sunday [Weekly Planning](weekly-planning.md) email.

## Favorite Activities

Activities marked as favorites should be eligible for the digest when they are timely: occurring today or soon, ending soon, approaching a booking deadline, or fitting the coming weekend. The digest should include only a small number and state why each appears now.

## Trip Digest Behavior

The trip section should become more useful as a trip approaches and while it is active. It should not only show that a trip exists; it should surface the right operational information from the itinerary.

Suggested cadence:

- **T-14**: unresolved decisions, booking deadlines, reservation risks, and high-level checklist.
- **T-7**: packing checklist, tickets, travel documents, weather trend, restaurant booking reminder, and activity booking reminder.
- **T-3**: opening-hours validation, local event/crowd risks, restaurant gaps, and backup activity checks.
- **T-1**: departure logistics, first-day itinerary, tickets/documents, kid essentials, and weather.
- **During trip**: today's itinerary, next time-sensitive block, destination weather, known closed/unknown opening-hours warnings, event risks, booking gaps, and backup options.
- **After trip**: archive prompt and request for quick memories while details are fresh.

The digest should link to a read-first trip run sheet when available, instead of sending the user into the editing-heavy trip detail page.

Before the richer Phase 14 behavior is available, Phase 13.2 should add basic readiness checks for upcoming trips. A trip missing materially important planning data—initially a day-one itinerary—should produce a concise reminder to complete it.

## Growing Section Schedule

The growing sections (Garden This Week, New Growing Knowledge) appear in the digest only on **Mondays** and **Fridays**. Suggestions are generated by cron on **Sundays** and **Wednesdays** — see [Growing](growing.md).

This fixed weekday schedule is a baseline, not the final relevance rule. User-managed growing periods should control emphasis:

- **High-growth/gathering**: prioritize fresh, current care and gathering information.
- **Harvest**: reduce volume and focus on harvesting and preservation-relevant work.
- **Quiet/off season**: omit routine growing content unless it is time-sensitive.

The period date ranges should be editable in settings so local conditions and the user's actual growing year can override generic season assumptions.

The settings modal should visualize the full year as a responsive horizontal timeline. Quiet time forms the neutral base, High growth and Harvest appear as distinct segments, and a Today marker shows the currently active period. The timeline updates immediately while boundaries are edited.

## Period-End Rewind

Near the end of a meaningful period, the digest may replace routine content with a short retrospective or “rewind.” Candidate periods include growing high season, harvest season, summer break, and completed trips. Exact triggers and content remain to be defined; a rewind should not appear until it has a clear planning or reflection benefit.

## Growing Recommendation Freshness

The digest should not simply repeat the top weekly growing windows when the season is moving quickly. During high season, the final email should apply a freshness pass before rendering Garden This Week:

- prefer actions whose timing phase is `do now` for the current ISO week
- demote stale prep work after its peak window, especially hardening-off, soil prep before sowing/planting, and other setup actions
- keep late actions only when labelled as catch-up and when the copy clearly says who it applies to
- use the current Stockholm weather summary to boost urgent care actions such as watering, feeding, support, pest checks, thinning, greenhouse ventilation, and rain/cold protection
- cap catch-up items so they cannot dominate the digest during optimal growing weather

## Related

- [Ingestion](ingestion.md) — task source
- [Renewals](renewals.md) — renewal section
- [Growing](growing.md) — garden section, suggestions
- [Promotions](promotions.md) — deals section
