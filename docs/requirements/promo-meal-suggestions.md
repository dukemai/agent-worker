# Promo meal suggestions (10 ideas)

## Purpose

Instead of a **full weekly meal plan** (7 days × meals), the near-term product is **up to 10 meal ideas** inferred from the **current imported promotion matches** (`promo_match_runs` / `promo_match_items`). Each idea should be shoppable: clear **title**, **short description**, **ingredient-style bullets**, and **which offer(s)** it mainly uses.

**Weekly calendar planning** is explicitly **later** — see [promo-meal-plan.md](promo-meal-plan.md) for the deferred 7-day sketch and existing API stub.

## UX goals

- Scan quickly: **card grid** (not a day-by-day rail).
- Trust: show **promotion titles** (or watchlist interest) the idea builds on.
- Shopping: **ingredients** as bullet lines the user can mentally check off or copy later.
- Optional: **meal kind** label (`Middag`, `Lunch`, `Grill`, `Bak` …) — not a full calendar assignment.

## Data shape (target, not all implemented)

Each suggestion (example names):

| Field | Meaning |
|-------|---------|
| `title` | Short Swedish dish / meal name. |
| `summary` | 1–2 sentences: what it is and why it fits the offers. |
| `ingredients` | `string[]` — shopping-oriented lines (amounts optional). |
| `uses_promotion_titles` | Subset of imported offer titles this idea uses (traceability). |
| `meal_kind` | Optional tag: `lunch` \| `dinner` \| `either` \| `snack` \| `other`. |

**Count:** exactly **10** suggestions when the model has enough distinct offers; fewer only if the promotion list is very short (edge case).

## Implementation phases

1. **Now:** **UI mockup** on `/promo-grocery-watchlist` (**Matched offers**) with **static sample data** — validates layout and density before Gemini work.
2. **Next:** New shared JSON schema + **`POST /api/promo-matches/meal-suggestions`** (or rename) calling Gemini with the same compact promo payload as today’s meal-plan route; replace sample with live response.
3. **Later:** Optional merge with [promo-meal-plan.md](promo-meal-plan.md) week view if users want both “10 ideas” and “map to Mon–Sun”.

## Environment (future)

Same as meal plan: `GEMINI_API_KEY` on the dashboard host when the API ships.

## Related

- [promo-watchlist.md](promo-watchlist.md) — import, latest matches.
- [promo-meal-plan.md](promo-meal-plan.md) — deferred 7-day plan + current `/api/promo-matches/meal-plan`.
- Phase 8: [../phases/08-meal-shopping-from-promotions/SCOPE.md](../phases/08-meal-shopping-from-promotions/SCOPE.md)
