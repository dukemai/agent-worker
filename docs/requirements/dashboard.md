# Dashboard

## Overview

Mobile-first Next.js app. Primary interface for viewing and acting on tasks.

## Sections

- **Tasks** — Today / This Week / Later buckets
- **Renewals** — Expiration reminders with escalation
- **Learning** — Topic/category lessons
- **Context** — Family preferences (shopping list, plant list, interests)
- **Promo grocery watchlist** — Route `/promo-grocery-watchlist`; explicit grocery promo intent (`family_context.promo_watchlist`) for flyer/page matching (Phase 8)
- **Recipes hub** — Route `/recipes`; four sections: **Cook** (search visible recipes, plan, cooking), **Manage** (library, generate/import/edit, food-style ingredient mapping, ingredient sources, Vietnamese meals), **Collect** (family recipe ideas/review), and **Share** (read-only recipe/style links).
- **Recipe library/admin** — Managed under `/recipes?tab=manage` with legacy redirects from `/recipe-generator`; saved recipes default view, search/filter, linked standalone generation/import flows, style-first AI recipe ideas, and admin-managed ICA ingredient source overview (`saved_recipes`)
- **Family recipes** — Managed under `/recipes?tab=collect` with legacy redirects from `/family/recipes`; household invite, collaborator account join, recipe candidate submission/review, shared recipe search with ICA ingredient autocomplete, and add-to-plan collaboration
- **Birthdays** — Route `/birthdays`; shared birthday/event view available to collaborators
- **Trip Ops** — Route `/trips`; family travel logistics, structured participants, curated preference suggestions (`/trips/preferences`), option shortlist, decisions, itinerary blocks, and trip task conversion
- **Growing** — Seasonal suggestions, sources, knowledge, windows

## Interactions

- One-tap: mark done, move between buckets, snooze, dismiss
- Edit context key-value pairs
- Convert growing suggestions to planner tasks

## Related

- [Ingestion](ingestion.md) — task source
- [Renewals](renewals.md)
- [Growing](growing.md)
- [Learning](learning.md)
