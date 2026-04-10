# Dashboard

## Overview

Mobile-first Next.js app. Primary interface for viewing and acting on tasks.

## Sections

- **Tasks** — Today / This Week / Later buckets
- **Renewals** — Expiration reminders with escalation
- **Learning** — Topic/category lessons
- **Context** — Family preferences (shopping list, plant list, interests)
- **Promo grocery watchlist** — Route `/promo-grocery-watchlist`; explicit grocery promo intent (`family_context.promo_watchlist`) for flyer/page matching (Phase 8)
- **Recipe generator** — Route `/recipe-generator`; ICA-based ingredient picks, food type, vegetarian, AI recipe ideas, saved library (`saved_recipes`)
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
