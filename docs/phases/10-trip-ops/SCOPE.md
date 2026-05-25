# Phase 10: Trip Ops — Scope

**Status**: MVP implemented; AI generation and sharing are follow-ups.

## Goal

Add a practical family trip-planning workflow to Dad-Ops so a real trip can move from fixed logistics and scattered ideas into a shortlist, loose itinerary, and normal dashboard tasks.

Trip Ops should reduce planning research load. It is not a booking product or travel inspiration feed; it is an operations surface for deciding what to do, what to skip, and what still needs action.

## First Real Use Case

Plan a four-day Gotland trip where ferry tickets and dates are already booked, and the family wants to prioritize places and activities they have not already done on previous visits.

This use case should shape the MVP flow:

1. Capture fixed logistics: destination, dates, ferry arrival/departure, home base, transport mode, participants.
2. Capture trip memory: places already visited, activities to avoid repeating, family preferences, kid-energy constraints.
3. Generate a ranked shortlist of options instead of a full itinerary first.
4. Let the user shortlist, reject, or convert options into itinerary blocks.
5. Convert planning items into normal Dad-Ops tasks and daily digest reminders.

## Implemented Deliverables

- **Trips list**: group trips by lifecycle (`ideas`, `planning`, `upcoming`, `archived`).
- **Trip detail page**: dense operational view with Overview, Options, Decisions, Tasks, Itinerary, and Notes.
- **Known logistics**: dates, destination, participants, travel/accommodation notes, important links.
- **Accommodation timing**: multiple stays can be extracted into structured logistics and added to the itinerary as separate check-in/check-out blocks.
- **Structured participants**: adult count, kid count, and kid ages alongside freeform participant notes.
- **Already done / avoid list**: reusable travel memory so suggestions prioritize new places.
- **Curated preferences**: admin-managed preference catalog with picker modal on trip detail.
- **Option shortlist**: editable cards for activities, restaurants, rainy-day backups, scenic stops, and kid-friendly ideas.
- **Decision tracking**: unresolved choices with status, due date, and final outcome.
- **Loose itinerary blocks**: morning anchor, lunch area, afternoon option, backup, and "drop first if tired" notes for each day.
- **Task integration**: create trip-related rows in `tasks` using `metadata.item_type = "trip_task"` and `metadata.trip_id`.
- **Digest integration**: upcoming trip tasks and near-trip planning reminders appear in the morning digest.
- **Gotland starter**: seed editable shortlist, decisions, and itinerary blocks for the first validation trip.
- **Public trip links**: create opaque read-only links for friends to view a trip without signing in.

## Product Principles

- Prioritize decision support over exhaustive research.
- Prefer ranked shortlists and clear tradeoffs over long prose plans.
- Keep Trip Ops connected to existing Dad-Ops buckets and digest.
- Treat family reality as first-class: buffers, weather backups, kid fatigue, booking friction, and drive time.
- Store structured outputs the user can edit, not one-off AI text.

## Out of Scope (v1)

- Booking ferries, flights, hotels, restaurants, or activity tickets directly.
- Full collaborative trip accounts for other families.
- Expense splitting or payment tracking.
- Replacing external travel search engines.
- A polished public travel guide or social sharing product.

## Possible Data Model

Trip Ops uses dedicated tables:

- `trips`
- `trip_participants`
- `trip_options`
- `trip_decisions`
- `trip_itinerary_items`
- `trip_preference_suggestions`
- `trip_knowledge_items`

Trip tasks should continue to use the existing `tasks` table with metadata.

Notes, participants, prior visits, and preferences are stored directly on `trips` for the MVP.
Structured counts, selected preferences, future logistics extraction, and future already-done extraction are also stored on `trips`.

## Follow-Up Scope

- AI assistance that turns messy notes or trip constraints into editable options, decisions, tasks, and itinerary blocks.
- AI extraction from logistics notes into `logistics_details`.
- Daily automation for extracting queued Markdown trip knowledge items.
- AI extraction from prior-visit notes into `already_done_items`.
- Dedicated digest section for upcoming trip planning reminders.
- Lightweight voting.

## Acceptance Criteria

- One real family trip can be planned end to end from fixed logistics to a four-day itinerary.
- Previously visited places can be captured and used to steer suggestions away from repeats.
- Options can be shortlisted, rejected, and placed into itinerary blocks.
- Decisions and planning tasks are visible from the trip page.
- Trip tasks appear in normal dashboard buckets and the daily digest.
- AI output lands as editable structured data.

## Related Later Phases

- [Phase 11: YouTube Knowledge Extraction](../11-youtube-knowledge-extraction/SCOPE.md)
- [Phase 12: Learning Agent Specialization](../12-learning-agents/SCOPE.md)
