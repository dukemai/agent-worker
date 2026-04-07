# Promo meal plan (AI week sketch)

## Purpose

Turn the **latest imported weekly promotion matches** (`promo_match_runs` / `promo_match_items`) into a **practical 7-day meal sketch** in **Swedish**, using **Gemini** with a **fixed JSON schema**. This is **assistive planning**, not automated shopping or nutrition advice.

**Prerequisites:** the user has imported `watchlist-matches-only.json` so `/api/promo-matches/latest` has at least one matched offer row with `**week_number`** set.

## Data flow

1. **Source of truth:** newest `promo_match_runs` row by `created_at`, with child `promo_match_items` ordered by `sort_order`.
2. **Server** (`POST /api/promo-matches/meal-plan`): loads that run + items; builds a compact payload (title, truncated `card_text`, `price_hint`, `interest` as watchlist match label); passes `**iso_week`** from `promo_match_items.week_number` (consistent across rows for a given import).
3. **Model:** `[generatePromoMealPlanForWeek](../../packages/shared/src/gemini.ts)` → `gemini-2.5-flash`, `responseMimeType: application/json` + response schema.
4. **Response:** `{ plan, meta }` where `meta` includes `iso_week`, `promotion_count`, `store_key`, `generated_at`. **Not persisted** in the database in v1; the dashboard holds the result in React state until refresh or a new promo import (which resets the meal-plan UI state).

## Structured output (`PromoMealPlanResult`)


| Field                | Meaning                                                                                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `intro`              | Short Swedish intro (1–3 sentences).                                                                                                                                        |
| `days`               | Up to **7** entries; each has `day_label`, **`breakfast`**, **`breakfast_ingredients`**, `lunch`, **`lunch_ingredients`**, `dinner`, **`dinner_ingredients`** (short Swedish shopping lines per meal; arrays may be empty when nothing extra to buy), **`lunch_cooking_note`**, **`dinner_cooking_note`**, `uses_promotion_titles`. Legacy **`cooking_note`** is mapped to `dinner_cooking_note` when the new fields are absent. |
| `shopping_reminders` | Short Swedish bullets (e.g. buy sides, check fridge).                                                                                                                       |


The schema requires `uses_promotion_titles` per day so the plan stays **traceable** to imported offers.

## Prompt logic (high level)

- **Role:** home cook in Sweden; offers are ICA-like weekly deals.
- **Constraints:** each day includes **breakfast**, lunch, dinner, **`breakfast_ingredients`**, **`lunch_ingredients`**, **`dinner_ingredients`** (what to shop for each meal), **`lunch_cooking_note`**, **`dinner_cooking_note`**; prioritize promotions where reasonable; **do not invent products** beyond what the list supports; neutral staples (rice, potatoes, salad) allowed as complements.
- **Language:** Swedish for all user-facing strings in the JSON.
- **Truncation:** long `card_text` / `price_hint` are shortened server-side before the model call to cap prompt size.

## API


| Method | Path                           | Auth           | Notes                                                                                                                                                          |
| ------ | ------------------------------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/promo-matches/meal-plan` | Cookie session | **503** if `GEMINI_API_KEY` is unset on the dashboard server; **404** if no promo import; **400** if latest run has no items; **502** on model/parse failures. |


## Dashboard UI

- **Matched offers** tab: after the week highlight strip, **“Plan meals for this week”** calls the POST route. **`PromoMealPlanWeekView`** renders the result: intro quote block, **horizontally scrollable** week rail (snap cards), per-day **frukost**, **Lunch** and **Middag** with an **Ingredienser** bullet list under each (always visible when non-empty), optional **Visa tillagning** for lunch/middag when cooking notes exist, offer **badges**, and **Inköp & påminnelser** card. Tall cards scroll vertically inside if needed (`max-h` + `overflow-y-auto`).
- **“Preview sample week”** toggles static **`PROMO_MEAL_PLAN_SAMPLE`** (same JSON shape) with a **Sample preview** ribbon—use to refine layout before `GEMINI_API_KEY` is wired.
- **New JSON import** clears the AI meal-plan mutation; a successful **Plan meals** run clears the sample toggle so the live plan is shown.

## Environment

- `**GEMINI_API_KEY`**: required on the **Next.js dashboard** host (e.g. `.env.local`), same family of key as the worker’s Gemini usage.

## Out of scope (v1)

- Persisting meal plans in Supabase or syncing to tasks / shopping lists.
- Recalculating when the user edits only the watchlist without re-importing promos.
- Multi-store or multi-user plans.

## Related

- [promo-watchlist.md](promo-watchlist.md) — watchlist, import, `/api/promo-matches/`* except meal-plan detail above.
- Phase 8: [../phases/08-meal-shopping-from-promotions/SCOPE.md](../phases/08-meal-shopping-from-promotions/SCOPE.md)

