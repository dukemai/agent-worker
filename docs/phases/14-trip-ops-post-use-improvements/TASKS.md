# Phase 14: Trip Ops Post-Use Improvements - Tasks

## Discussion First

- [ ] Decide the fast-access model for relevant trips: dashboard card, `/trips/current`, route mode, or a combination.
- [ ] Decide what the trip run sheet should show versus what remains in the editing workspace.
- [ ] Decide digest cadence and content for T-14, T-7, T-3, T-1, in-trip, and post-trip prompts.
- [ ] Decide the minimum useful data model for event risks and opening-hours checks.
- [ ] Decide where archived trip memories should be stored: trip knowledge, already-done items, family context, or a dedicated table.
- [ ] Decide whether weekend discovery is a Trip Ops tab, standalone route, or recurring digest workflow.

## Fast Access And Run Sheet

- [ ] Define relevance rules for current trips: in progress, upcoming soon, open trip tasks, or recently edited.
- [ ] Add dashboard quick-access card for the most relevant trip(s).
- [ ] Add a read-first trip run sheet focused on today's itinerary, next item, weather, warnings, tasks, bookings, and links.
- [ ] Add deep links from trip list/detail directly to itinerary and run sheet sections.
- [ ] Keep the existing detail page as the editing workspace.

## Digest Companion

- [ ] Add trip reminder payload generation for pre-trip, in-trip, and post-trip states.
- [ ] Render itinerary-aware trip digest sections when a trip is close or active.
- [ ] Add pre-trip checklist suggestions for packing, tickets, restaurants, travel documents, weather, and kid logistics.
- [ ] Add in-trip daily summary: today's blocks, time-sensitive bookings, weather, backup options, and warnings.
- [ ] Add post-trip archive prompt after the trip end date.

## Event Risk Alerts

- [ ] Model event risks with title, date range, location/area, source URL, impact type, confidence, and mitigation notes.
- [ ] Add manual event risk creation on trip detail or run sheet.
- [ ] Add event overlap checks against trip dates and itinerary areas.
- [ ] Surface event risks in the trip run sheet and digest.
- [ ] Later: investigate automated event discovery sources per destination.

## Opening-Hours Checks

- [ ] Add opening-hours fields or a shared place profile model for options/itinerary items.
- [ ] Add stale/unknown/open/closed status calculation for planned itinerary dates.
- [ ] Add validation routine before departure and during active trip mornings.
- [ ] Surface closed-day and unknown-hours warnings in the run sheet, itinerary, and digest.
- [ ] Add manual override and notes for seasonal or uncertain opening hours.

## Archive And Knowledge Capture

- [ ] Add archive action for finished trips.
- [ ] Add post-trip review prompts: done, skipped, liked, difficult, expensive, repeat, avoid, remember.
- [ ] Generate summary from itinerary, options, decisions, notes, and review answers.
- [ ] Save reusable memories into trip knowledge and already-done/avoid-repeat structures.
- [ ] Link archived trip summaries from the trip list.

## Weekend Discovery

- [ ] Define discovery filters: weekend length, travel mode, max travel time, max budget, kids, season, indoor backup, novelty.
- [ ] Create candidate schema for short-trip ideas with cost/logistics estimates and confidence.
- [ ] Rank candidates by practical cost, travel effort, kid fit, seasonal fit, and booking friction.
- [ ] Convert a candidate into a trip idea with initial options, notes, and tasks.
- [ ] Later: add recurring digest suggestions when a free weekend is coming.

## Verification Later

- [ ] Dashboard build passes.
- [ ] Digest preview covers no trip, upcoming trip, active trip, and post-trip states.
- [ ] Opening-hours validation has fixtures for closed day, unknown hours, stale check, and manual override.
- [ ] Event risk overlap has fixtures for exact date, partial overlap, nearby area, and unrelated event.
