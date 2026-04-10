# Phase 08: Meal & Shopping Plan from Promotion Letters — Scope

**Status**: done (operator checklist: [TASKS.md §5](./TASKS.md) Supabase verify on deploy)

**Requirements**: [promo-watchlist.md](../../requirements/promo-watchlist.md) (ICA Maxi grocery intent UI + persistence) — complements email deals in [promotions.md](../../requirements/promotions.md).

## Goal

Turn retailer promotions into **actionable grocery planning**: the user maintains an **explicit watchlist** in the dashboard (what they want to buy), combines it with **full offer data** from ICA Maxi (Playwright scrape), and later gets meal/shopping outputs—not only email teasers.

## Development plan (prioritized)

### Slice A — Promo watchlist UI (shipped)

1. **Persistence**: Single `family_context` row `promo_watchlist` — JSON array of strings (product names / phrases). Documented in [promo-watchlist.md](../../requirements/promo-watchlist.md).
2. **Dashboard**: Page **`/promo-grocery-watchlist`** (“**Promo grocery watchlist**” in nav)—general naming; ICA is example copy only. Add/remove list items (no raw JSON), mobile-friendly, TanStack Query patterns.
3. **Machine export** (hybrid): Existing `GET /api/scrape/promo-watchlist` + `pnpm promo:download-watchlist` writes `apps/playwright-tools/data/promo-watchlist.json` for local scrape/match runs.
4. **Verification**: UI save ↔ scrape API returns the same items.

### Slice B — Scrape & match (existing groundwork)

- Playwright per-store strategies (e.g. `ica-maxi-barkarbystaden`) produce `ScrapedPromotion[]`.
- Load local watchlist JSON; **score/filter** promotions (rules first; optional LLM later).
- Improve coverage: scroll / lazy-load for full weekly grid.

### Slice C — Manual import → dashboard DB (Option A, shipped)

1. **Migration** (`017_promo_match_import.sql`): `promo_match_runs` (metadata + full `raw_json`) and `promo_match_items` (normalized rows per matched offer). RLS: `authenticated` full access (single-user model).
2. **API**: `POST /api/promo-matches/import` — JSON body or multipart `file` (`watchlist-matches-only.json`); `GET /api/promo-matches/latest` — latest run + ordered items.
3. **UI**: On **`/promo-grocery-watchlist`**, upload control + table (photo, title, interest, score, link) sourced from DB via TanStack Query.

### Slice D — Planning output (later in phase)

- Meal sketch + shopping list grouped by store; digest or dashboard panel; traceability to sources; can consume `promo_match_*` rows for “this week’s buyables.”

## Planned deliverables (initial)

- **Watchlist UI**: CRUD for `promo_watchlist` + user-facing help for Maxi URL and download script.
- **Extraction**: Playwright strategies + local watchlist file; optional category filters (Mejeri, Bröd, etc.).
- **Import path** (Option A): User uploads Playwright `watchlist-matches-only.json`; dashboard validates, persists run + items, displays latest import.
- **Planning output** (follow-on, Slice D): Meal plan sketch + shopping list; digest section TBD.
- **Traceability**: Link matches back to offer text / store URL.

## Out of scope (v1)

- Full recipe database or nutrition optimization — see [Phase 9: Swedish recipe sources](../09-recipe-sources-sweden/SCOPE.md).
- Automatic checkout or cart integration with retailers.
- Multi-user / multi-family watchlists.

## Open questions

- **Slice A**: Hide `promo_watchlist` from generic Context page vs. read-only duplicate?
- **Slice B**: Store preferred ICA offers URL in `family_context` (`ica_maxi_offers_url`) for copy-paste-free scraper defaults?
- **Slice D**: Trigger: on-demand only vs. digest section?

## Prerequisites

- `family_context`, promotion pipeline, Playwright tools package.
- Dashboard env: `SCRAPE_SYNC_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` for scrape export route.

## Task list

See [TASKS.md](./TASKS.md) for ordered implementation checkboxes.
