# Phase 14: Trip Ops Post-Use Improvements - Scope

## Status

Planned for after the Summer Activities phase. This phase captures feedback from using Trip Ops on real trips and should be discussed before implementation.

## Goal

Turn Trip Ops from a planning/editing workspace into a practical pre-trip and in-trip operations companion.

The current implementation is strong for collecting knowledge, editing itinerary blocks, and planning options. The next improvement layer should make the relevant trip easy to reach, make the digest useful when travel is imminent or underway, reduce known planning risks such as closed activities or crowded event weekends, and preserve what was learned after the trip.

## User Feedback From Real Use

- Accessing the useful trip information is too slow: current path is `Trips Ops` -> select trip -> scroll to itinerary.
- The trip detail page currently feels mainly like an editing workspace.
- The digest does not become itinerary-aware when the trip is about to start or during the trip.
- There should be pre-trip reminders, tips, and checklists a few days before departure.
- Large local events can affect restaurants, traffic, crowds, and booking availability, but Trip Ops did not warn about them.
- Activity opening times were not checked well enough, which caused an activity to be planned on a closed day.
- Finished trips need an archive flow that summarizes what happened and saves useful memory to Trip Ops knowledge.
- There is a new discovery need: find possible short weekend trips with the best practical cost.

## In Scope

- A current/relevant trips entry point separate from the editing-heavy trip list/detail flow.
- A trip run sheet view focused on today, next itinerary item, weather, bookings, open decisions, and quick links.
- Daily digest improvements for pre-trip and in-trip itinerary awareness.
- Pre-trip reminder cadence for packing, bookings, travel documents, restaurant reservations, tickets, weather, and kid logistics.
- Local event risk checks for destination/date windows and itinerary locations.
- Opening-hours validation for options and itinerary items, including stale/unknown source states.
- Trip archive flow with post-trip summary and knowledge capture.
- Weekend trip discovery workflow optimized for short duration, kids, logistics effort, and estimated cost.

## Out of Scope

- Booking restaurants, transport, accommodation, or tickets directly.
- Full calendar sync as the primary interface.
- Perfect real-time event coverage for every destination.
- Fully automated cost accuracy; early versions can use estimates and confidence levels.
- Replacing travel search engines for exhaustive discovery.

## Discussion Tracks

### 1. Fast Access To Relevant Trips

Decision to discuss: should the primary access point be a dashboard widget, a `/trips/current` route, or a mode inside `/trips`?

Possible shape:

- Dashboard card for active/upcoming trips.
- Dedicated "Current Trip" view when a trip is in progress.
- Quick actions for itinerary, today's plan, packing/checklist, tasks, share link, and archive.
- Automatic relevance rules based on lifecycle, start/end dates, open tasks, and recently edited trips.

### 2. Digest As Trip Companion

Decision to discuss: how much trip detail belongs in the morning digest versus a link to a run sheet.

Possible cadence:

- T-14: unresolved decisions and booking risk.
- T-7: packing/checklist, tickets, weather trend, reservations.
- T-3: opening-hours check, local event risk, restaurant booking reminders.
- T-1: tomorrow's travel logistics, departure time, documents, kid essentials.
- During trip: today's itinerary, weather for destination, open/closed warnings, reservation gaps, backup options.
- After trip: archive prompt and memory capture.

### 3. Event Risk Alerts

Decision to discuss: should events be manually attached first, automatically searched, or both?

Possible shape:

- `trip_event_risks` records with title, location, date range, source URL, impact type, confidence, and mitigation notes.
- Event impact types: crowding, restaurants, traffic/parking, accommodation price, noise, road closures, weather-exposed outdoor plans.
- Digest and trip view warnings when event dates overlap the trip or itinerary area.
- Mitigations such as book restaurants earlier, choose less central lunch areas, reserve parking, add backups.

### 4. Opening-Hours Validation

Decision to discuss: whether opening hours are stored on options, itinerary items, or a shared place profile.

Possible shape:

- Add `opening_hours`, `opening_hours_source_url`, `opening_hours_checked_at`, and `opening_hours_confidence`.
- Validate every planned itinerary item against its scheduled date before and during the trip.
- Show states: open, closed, possibly closed, unknown, stale.
- Add routine checks at T-7, T-3, T-1, and each trip morning.
- Keep manual override and note fields because seasonal opening hours are often messy.

### 5. Archive And Knowledge Capture

Decision to discuss: what should become durable knowledge versus one-off trip history.

Possible shape:

- Archive action changes lifecycle to `archived`.
- Post-trip review asks what was actually done, skipped, liked, hard with kids, too expensive, worth repeating, and should avoid next time.
- Generate a trip summary from itinerary, options, decisions, notes, and manual reflections.
- Save reusable memories into trip knowledge or already-done items so future trips can avoid repeats and reuse lessons.

### 6. Weekend Trip Discovery

Decision to discuss: whether discovery should be a Trip Ops tab, a new `/trips/discover` route, or a recurring digest section.

Possible shape:

- Search for 1-2 night trips from Stockholm.
- Rank by travel time, kid fit, weather/season fit, estimated cost, booking friction, and novelty.
- Support constraints such as car/train, max budget, max travel time, indoor fallback, and "leave Friday after work."
- Convert a candidate into a trip idea with options, likely costs, logistics notes, and first tasks.

## Acceptance Criteria

- The current relevant trip can be reached from the dashboard without digging through the editing workspace.
- The digest gives useful pre-trip and in-trip information based on itinerary dates and trip state.
- A planned activity with known closed hours is flagged before the travel day.
- Event risks can be captured, reviewed, and surfaced with mitigation advice.
- A finished trip can be archived into a concise summary plus reusable trip knowledge.
- Weekend discovery can produce a ranked shortlist with cost/logistics tradeoffs and create a trip idea.

## Related Docs

- [Trip Ops requirements](../../requirements/trip-ops.md)
- [Daily Digest requirements](../../requirements/daily-digest.md)
- [Phase 10 Trip Ops](../10-trip-ops/SCOPE.md)
- [Summer Activities](../13-summer-activities/SCOPE.md)
