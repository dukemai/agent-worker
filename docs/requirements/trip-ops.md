# Trip Ops

## Intent

Trip Ops extends Dad-Ops into family and group travel planning. The goal is not to become a travel-booking product, but to help compare options, make decisions, remember tasks, and coordinate with other families.

The dashboard should turn scattered trip thoughts, emails, chats, and research into a structured planning surface with clear next actions.

## Product Fit

Trip planning fits the dashboard because it is another form of family operational load:

- Many open decisions across a long time window
- Multiple people and constraints
- Time-sensitive bookings and renewals
- Details spread across emails, notes, links, and messages
- A strong need for today / this week / later task surfacing

Trip Ops should stay connected to the existing task buckets and daily digest instead of becoming a separate travel app.

## Core Concepts

### Trip

A trip is a long-running planning project. It can be for only the family or for a group of several families.

Each trip should capture:

- Destination candidates
- Date windows
- Participants
- Structured participant counts and kid ages
- Travel options
- Accommodation options
- Multiple accommodations with separate check-in and check-out timing
- Food plans
- Activities
- Decisions
- Tasks
- Notes
- Curated preference suggestions

### Participants

Participants represent the people or families involved in the trip.

For group trips, useful fields include:

- Family name
- Adults and children
- Kid ages
- Budget preferences
- Date constraints
- Must-haves
- Notes or open replies

The first version can keep this lightweight and editable by the primary user.
The MVP stores freeform participant notes plus structured `adult_count`, `kid_count`, and `kid_ages` so suggestions can reason about the family shape without needing named people.

### Preferences

Preferences combine freeform notes with curated reusable suggestions. The user can manage suggestion presets in `/trips/preferences`, then apply active suggestions from the trip detail page.

Useful categories:

- Pace
- Kids
- Weather
- Food
- Nature
- Culture
- Logistics
- Budget
- Planning style

Selected preferences are stored on the trip as text rows and may later seed AI prompts for options and itinerary blocks.

### Options

Options are comparable choices inside a trip, such as destinations, flights, trains, accommodations, restaurants, and activities.

Each option should support:

- Title
- Type
- Cost estimate
- Relevant dates or times
- Link
- Pros
- Cons
- Status
- Notes

### Decisions

Decisions track unresolved choices.

Examples:

- Choose destination
- Confirm travel dates
- Pick accommodation
- Decide group budget
- Book flights
- Choose rainy-day activities

Each decision should have an owner or waiting status, a due date when relevant, and a final outcome once resolved.

### Trip Tasks

Trip tasks should reuse the normal dashboard task system where possible.

Examples:

- Renew passport before booking
- Ask the group about budget
- Book apartment by Friday
- Check travel insurance
- Buy museum tickets
- Pack car seats

Trip-related tasks can be stored in `tasks` with metadata such as:

```json
{
  "item_type": "trip_task",
  "trip_id": "...",
  "category": "booking"
}
```

This keeps trip work visible in the existing today / this week / later flow and allows daily digest integration.

## Dashboard Scope

### MVP

The first version should support planning one real trip end to end:

- Create a trip
- Add and edit destination/date/window notes
- Track participants or families
- Add comparable options
- Track decisions
- Convert trip items into normal dashboard tasks
- Show trip tasks in existing task buckets
- Include upcoming trip tasks in the daily digest
- Include upcoming trips in the daily digest with a countdown as the start date gets close

### Trip Detail Page

A trip detail page should provide these sections:

- Overview
- Knowledge
- Options
- Decisions
- Tasks
- Itinerary
- Notes

The page should be practical and dense, closer to an operations dashboard than a travel inspiration site.
The itinerary should support fixed logistics blocks for arrival, departure, and accommodation check-in/check-out. Trips may include multiple accommodations, so structured logistics should preserve each stay separately and allow each stay's check-in and check-out to become itinerary blocks.

### Trip List

The trip list should group trips by lifecycle:

- Ideas
- Planning
- Upcoming
- Archived

## AI Assistance

AI should act as a trip coordinator, producing editable structured outputs rather than one large prose answer.

Useful AI flows:

- Extract pasted Markdown inspiration into reusable trip knowledge, including approximate areas and locations for places and activities
- Choose whether each knowledge source should extract planning knowledge, destination story materials, or both
- Merge processed trip knowledge into an overview grouped by canonical Gotland areas, with duplicate places, activities, and area-name variants combined across sources
- Favorite merged places and activities so promising candidates can be carried forward into options and itinerary planning
- Create trip options directly from refined knowledge places or activities
- Extract destination story materials as a separate knowledge product so historical, natural, cultural, local-life, and kid-friendly context can later power a destination content hub or expert
- Surface research leads from destination knowledge, such as places, buildings, people, events, traditions, or concepts that need deeper investigation before becoming rich content, with search terms in English and the useful local/source language such as Swedish for Gotland topics
- Create research leads manually from refined places and activities in the knowledge overview when something looks worth investigating further
- Send a research lead back into the knowledge queue as a story-material-focused source draft with prefilled research questions and search terms, preserving an explicit lead-to-source provenance link so extracted story materials can later be filtered by the lead that created them
- Generate a reviewable AI background draft for a research lead when general model knowledge is enough to start, then let the user edit and accept it into the story-material queue while preserving the lead provenance
- Apply copyright hygiene during knowledge extraction by avoiding copied or closely paraphrased source text, and treating no-reproduction sources as research-lead-first rather than polished content
- Generate starter trip knowledge from logistics and preferences when the user has not collected sources yet
- Preview and edit the option-generation prompt before sending it to AI
- Turn a messy pasted note into structured trip options
- Plan an option into a day/block itinerary item and mark the option as planned
- Suggest local follow-up options from an itinerary block using nearby unplanned options in the same area
- Surface related destination story materials inside itinerary blocks so each planned stop can show what to notice and why it matters
- Generate reusable destination content scaffolds from a dedicated builder page where research leads and story materials can be reviewed without modal scroll constraints; AI derives the subject/title from the selected bundle and curated styles such as concise guide, family-friendly, historical deep dive, place profile, walking-tour narration, and content hub article
- Fetch flexible per-day location-based weather forecasts and show daily weather context inside the itinerary
- Compare destination, travel, or accommodation options
- Generate a packing checklist based on dates, destination, kids, and transport
- Draft a message to the group
- Suggest itinerary blocks
- Summarize unresolved decisions
- Extract tasks from trip-related emails or notes

AI output should land as trip knowledge, options, decisions, notes, or tasks that the user can edit.

## Group Trip Sharing

Trip workspaces can be shared with signed-in household members. New trips attach
to the creator's household when one exists or can be created, and household
members can open the trip list/detail workspace and collaborate on trip options,
decisions, itinerary blocks, knowledge, and favorites.

Trip plans can also be shared externally through opaque read-only public links at
`/trips/shared/[slug]`. These links are meant for friends or other families who
should see the current plan without signing in. The public payload includes trip
basics, participant counts, selected preferences, options, decisions, itinerary
blocks, and knowledge favorites. It intentionally omits authenticated task rows
and raw knowledge Markdown, and does not expose rejected options.

Later versions can add lighter external participation:

- Simple preference or vote capture
- Per-family status such as `waiting`, `confirmed`, or `declined`

This can follow the same spirit as the shared shopping list link: useful coordination without requiring full accounts for everyone.

## Possible Data Model

Trip Ops likely deserves dedicated tables once it moves beyond notes:

- `trips`
- `trip_participants`
- `trip_options`
- `trip_decisions`
- `trip_itinerary_items`
- `trip_notes`

Trip tasks can continue to use the existing `tasks` table with trip metadata.

## Non-Goals

The dashboard should not initially:

- Book flights or hotels directly
- Replace travel search engines
- Manage payments between families
- Require accounts for external families
- Build a full collaborative travel social product

## Scheduled Phase

Trip Ops is scheduled as Phase 10, inserted before the YouTube knowledge extraction and learning-agent specialization phases because a real Gotland planning need can validate the product shape now.

**Phase 10: Trip Ops**

Success criteria:

- One real family or group trip can be planned end to end
- Decisions and tasks are visible from the dashboard
- Trip tasks appear in the daily flow
- AI can convert messy planning input into structured trip data
