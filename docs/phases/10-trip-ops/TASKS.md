# Phase 10: Trip Ops — Tasks

## Implemented MVP

- [x] Add Trip Ops tables and RLS migration (`040_trip_ops.sql`).
- [x] Add `/trips` list route grouped by lifecycle.
- [x] Add `/trips/[id]` detail workspace for logistics, options, decisions, itinerary blocks, and trip tasks.
- [x] Add authenticated API routes for trips, options, decisions, itinerary items, Gotland starter data, and task conversion.
- [x] Add Trip Ops to the dashboard navigation.
- [x] Add typed dashboard client helpers and Trip Ops domain types.
- [x] Verify dashboard production build.
- [x] Show inclusive trip length (`days / nights`) when start/end dates are set.
- [x] Add structured participant counts and kid ages to trip logistics.
- [x] Add curated trip preference catalog admin at `/trips/preferences`.
- [x] Add `Suggest preferences` modal backed by active curated preferences.
- [x] Add trip knowledge base for Markdown inspiration, AI extraction, and option-suggestion grounding.
- [x] Add merged knowledge overview for places and activities across processed sources.
- [x] Add story material extraction and a Story materials knowledge tab for historical, natural, cultural, and kid-friendly destination context.
- [x] Split trip knowledge extraction into planning vs destination story-material branches with queue-level extraction focus.
- [x] Add destination research leads for places, buildings, people, events, traditions, and concepts worth investigating further.
- [x] Add manual research lead creation from refined knowledge overview places and activities.
- [x] Add research-lead-to-queue flow with prefilled story-material-focused source drafts and copyable search terms.
- [x] Add AI-generated research drafts that can be reviewed and accepted into the story-material queue with lead provenance preserved.
- [x] Surface related story materials inside itinerary blocks using linked option/title/location matching.
- [x] Add flexible per-day location-based weather forecast fetching and daily itinerary weather context.
- [x] Add AI-generated content scaffolds from user-selected story materials and content styles.

## Follow-Ups

- [x] Add story material extraction for historical, nature, cultural, and kid-friendly context attached to places and activities.
- [x] Add real AI generation from trip constraints and already-visited history.
- [x] Add AI extraction for logistics notes into `logistics_details`.
- [x] Add multi-accommodation check-in/check-out logistics and itinerary presets.
- [ ] Tune growing-season digest recommendations so high-season actions do not surface stale early-season work.
- [ ] Add AI extraction for already-done / avoid-repeat notes into `already_done_items`.
- [ ] Add daily automation for extracting queued trip knowledge items.
- [ ] Add edit/delete flows for options, decisions, and itinerary items beyond status changes.
- [ ] Resume deferred content factory work from [`trip-content-factory.md`](../../requirements/trip-content-factory.md): research-lead inbox, multi-angle sorter, and linker sidebar.
- [x] Add daily digest rendering of upcoming trips with countdowns near the start date.
- [x] Add account-backed household sharing for trip workspaces.
- [x] Add lightweight read-only external trip sharing after household sharing is stable.
- [ ] Add lightweight external voting for group trips.
- [ ] Add browser smoke coverage after a seeded auth session or local test harness exists.
