# Phase 8: Meal & shopping from promotions — Retro

## Shipped

- `promo_watchlist` in `family_context` with dedicated **`/promo-grocery-watchlist`** UI: ICA-aligned picker catalog (runtime-validated JSON), custom phrases, table + clear-all, TanStack Query.
- Machine export: `GET /api/scrape/promo-watchlist` + `pnpm promo:download-watchlist`; env documented under [promo-watchlist.md](../../requirements/promo-watchlist.md#environment-dashboard--machine-export).
- Weekly import path: `POST /api/promo-matches/import`, latest run UI, meal plan (`POST /api/promo-matches/meal-plan`) + `PromoMealPlanWeekView`.
- Playwright: watchlist-aware matching; ICA strategy **`expandLazyLoadedOfferTiles`** to load lazy-rendered weekly-offer tiles before scraping.
- Roadmap: Phase 8 marked **done**; recipe corpus work scheduled as **Phase 9** ([`../09-recipe-sources-sweden/SCOPE.md`](../09-recipe-sources-sweden/SCOPE.md)); Trip Ops → **10**, YouTube → **11**, learning agents → **12**.

## Deferred

- **Operator verify**: Run `supabase db push` on the target project and confirm import + `week_number` (see [TASKS.md](./TASKS.md) §5).
- **Slice D** (digest / grouped shopping list from promos): still TBD; not required to call Phase 8 “done” for the watchlist + import + meal-plan slice.
- Full **multi-retailer** watchlist UX (single `promo_watchlist` remains; more stores via Playwright strategies only).

## Surprises

- Much of the Phase 8 task list was already implemented in the branch; closure was mainly validation, picker JSON guards, nav copy, ICA scroll, and doc/roadmap alignment.

## Lessons

- Treat **static JSON catalogs** like API payloads: validate at load so a bad file cannot silently break the picker.
- Keep **phase numbering** in living docs (`ROADMAP`, `GLOSSARY`, cross-links) in sync when inserting a new phase—grep for old folder names after `git mv`.
