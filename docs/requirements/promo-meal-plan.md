# Promo meal plan (AI — 10 måltider)

## Status (direction)

The live **`POST /api/promo-matches/meal-plan`** flow returns **exactly 10 meal ideas** (not a Mon–Sun calendar). A separate [**10-meal UI mockup**](promo-meal-suggestions.md) explored layout earlier; the **PromoMealPlanWeekView** component now renders the **same 10-card** pattern for the API result.

## Purpose

Turn a chosen import’s **weekly promotion matches** (`promo_match_runs` / `promo_match_items`, keyed by **`runId`**) into **10 shoppable meal suggestions** in **Swedish**, using **Gemini** with a **fixed JSON schema**. The model is instructed to:

- **Leverage promotions** (offers can be the star ingredient or only part of the dish).
- Respect **user / watchlist interests** as **cuisine direction** (e.g. asiatiskt, vietnamesiskt, svensk husman, italienskt).
- List **ingredients realistic in Sweden** (typical supermarkets + common “world food” availability).
- Return **exactly 10** meals in **`meals`**.

This is **assistive planning**, not automated shopping or nutrition advice.

**Prerequisites:** imported `watchlist-matches-only.json` so the chosen run has matched offer rows with **`week_number`** where applicable.

## Data flow

1. **Source of truth:** a specific **`promo_match_runs.id`** from the client (usually latest from `/api/promo-matches/latest`), with child `promo_match_items` ordered by `sort_order`.
2. **Server** (`POST /api/promo-matches/meal-plan` with JSON `{ "runId": "<uuid>" }`): loads that run + items; builds a compact payload (`watchlist_interests` + promotions with `title`, `card_text`, `price_hint`, `matched_interest`); passes **`iso_week`** from `promo_match_runs.week_number` or items.
3. **Model:** [`generatePromoMealPlanForWeek`](../../packages/shared/src/gemini.ts) → `gemini-2.5-flash`, `responseMimeType: application/json` + response schema.
4. **Response:** `{ plan, meta }` where **`plan`** is `PromoMealPlanResult` (**`meals` length 10**); **`meta`** includes `iso_week`, `promotion_count`, `store_key`, `generated_at`, **`run_id`**. **Not persisted** in v1.

## Structured output (`PromoMealPlanResult`)


| Field                | Meaning |
| -------------------- | ------- |
| `intro`              | Short Swedish intro (1–3 sentences). |
| `meals`              | **Exactly 10** objects: `title`, `summary`, `meal_kind`, `ingredients[]`, `cooking_note`, `uses_promotion_titles[]`, `cuisine_style` (Swedish tag, e.g. vietnamesiskt, italienskt). |
| `shopping_reminders` | Short Swedish bullets. |


Sanitization enforces **exactly 10** meals after mapping; otherwise the API returns **502** with an error.

## Prompt logic (high level)

- **Role:** home cook in **Sweden**; ICA-like weekly deals.
- **Promotions:** use offers actively; they may be **partial** inputs to a recipe.
- **Interests:** `watchlist_interests` steer **variety of cuisines** (examples in prompt: asiatiskt, vietnamesiskt, svenskt, italienskt).
- **Ingredients:** Swedish grocery realism; Swedish strings.
- **Truncation:** long `card_text` / `price_hint` shortened server-side before the model call.

## API


| Method | Path                           | Auth           | Notes                                                                                                                                                          |
| ------ | ------------------------------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/promo-matches/meal-plan` | Cookie session | Body: **`{ "runId": "<uuid>" }`**. **400** if body/`runId` invalid or run has no items; **404** if run not found; **503** if `GEMINI_API_KEY` unset; **502** on model/parse failures (including if the model does not return 10 meals). |


## Dashboard UI

- **Matched offers:** **Plan meals only** sends **`runId`**. **`PromoMealPlanWeekView`** shows intro, a **horizontal rail of 10 cards** (snap scroll), each with **cuisine_style**, **ingredients**, optional **Visa tillagning**, promotion **badges**, and **Inköp & påminnelser**.
- **Preview sample week** uses **`PROMO_MEAL_PLAN_SAMPLE`** (10 meals) with a **Sample preview** ribbon.

## Environment

- **`GEMINI_API_KEY`**: required on the **Next.js dashboard** host (e.g. `.env.local`).

## Out of scope (v1)

- Persisting meal plans in Supabase or syncing to shopping lists.
- Recalculating when the user edits only the watchlist without re-importing promos.
- Multi-store or multi-user plans.

## Related

- [promo-watchlist.md](promo-watchlist.md) — watchlist, import, `/api/promo-matches/*`
- [promo-meal-suggestions.md](promo-meal-suggestions.md) — earlier mockup-only spec (optional overlap with this flow)
- Phase 8: [../phases/08-meal-shopping-from-promotions/SCOPE.md](../phases/08-meal-shopping-from-promotions/SCOPE.md)
- Phase 9 (recipe corpus / grounding): [../phases/09-recipe-sources-sweden/SCOPE.md](../phases/09-recipe-sources-sweden/SCOPE.md)
