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
- Travel options
- Accommodation options
- Food plans
- Activities
- Decisions
- Tasks
- Notes

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

### Trip Detail Page

A trip detail page should provide these sections:

- Overview
- Options
- Decisions
- Tasks
- Itinerary
- Notes

The page should be practical and dense, closer to an operations dashboard than a travel inspiration site.

### Trip List

The trip list should group trips by lifecycle:

- Ideas
- Planning
- Upcoming
- Archived

## AI Assistance

AI should act as a trip coordinator, producing editable structured outputs rather than one large prose answer.

Useful AI flows:

- Turn a messy pasted note into structured trip options
- Compare destination, travel, or accommodation options
- Generate a packing checklist based on dates, destination, kids, and transport
- Draft a message to the group
- Suggest itinerary blocks
- Summarize unresolved decisions
- Extract tasks from trip-related emails or notes

AI output should land as trip options, decisions, notes, or tasks that the user can edit.

## Group Trip Sharing

Later versions can add lightweight sharing:

- Opaque read-only trip link
- Shared option list
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

## Phase Candidate

Trip Ops is a good candidate for a future phase after meal and shopping workflows stabilize.

Suggested phase:

**Phase 12: Trip Ops**

Success criteria:

- One real family or group trip can be planned end to end
- Decisions and tasks are visible from the dashboard
- Trip tasks appear in the daily flow
- AI can convert messy planning input into structured trip data
