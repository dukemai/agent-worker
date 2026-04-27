# Phase 09: Recipe generator & library (Sweden-oriented) — Scope

**Status**: in progress

## Goal

Ship a **dashboard experience** where the user picks **ingredients from the ICA Maxi catalog** (same picker data as the promo watchlist), chooses a **type of food** from Sweden-relevant presets, optionally checks **Vegetarian**, gets **AI-generated meal ideas with recipes**, **adds** chosen recipes to a **saved library**, and marks each as **tested** or not.

Optional later: **grounding** from a curated corpus or RAG—v1 is **generate-first**, persistence in Supabase.

## Primary deliverables (v1)

- **Requirements**: [`recipe-generator.md`](../../requirements/recipe-generator.md) — flows, API sketch, acceptance criteria.
- **Persistence**: `saved_recipes` (or equivalent) with **`tested` boolean**, RLS aligned with existing authenticated dashboard patterns.
- **AI**: New structured Gemini call in `@agent/shared` (JSON schema), called from `POST /api/recipes/generate`.
- **Dashboard**: Route (e.g. `/recipe-generator` or `/recipes`) with (1) ICA-based ingredient picker + food-type dropdown + **Vegetarian** checkbox + optional **exclude meal titles** (for “more suggestions”), (2) results with **Add** per recipe, (3) **library** table (**Tested**, and show vegetarian run flag).

## Secondary / follow-on (same phase if time allows)

- Optional “one custom ingredient phrase” beside ICA picks (same idea as promo watchlist).
- Detail drawer or page for one saved recipe (read-only view of steps).

## Out of scope (v1)

- Medical nutrition targets or allergy guarantees.
- Scraping third-party recipe sites into the library.
- Tight integration with `promo_match_*` / weekly offers (can link later).

## Prerequisites

- `GEMINI_API_KEY` on the dashboard host (same as meal-plan).
- Phase 8 patterns: [`generatePromoMealPlanForWeek`](../../packages/shared/src/gemini.ts), dashboard API + TanStack Query.

## Related phases

- [Phase 10: YouTube knowledge extraction](../10-youtube-knowledge-extraction/SCOPE.md) — separate pipeline.
- [Phase 11: Learning agent specialization](../11-learning-agents/SCOPE.md).
