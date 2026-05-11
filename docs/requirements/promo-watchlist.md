# Promo grocery watchlist

## Overview

The user maintains an **explicit list of grocery items and phrases** they want to watch for on **promotions / weekly offers** (flyers, store web pages). The UI and route are **general**; today’s primary example is **ICA Maxi**, and Playwright strategies can add more retailers later. The same `promo_watchlist` data drives offline scrapers (`apps/playwright-tools`) to **match** live offers against intent, then meal/shopping planning (Phase 8).

This doc covers **dashboard UI + persistence**. Scrape and match algorithms live with Playwright; export for machines uses [`/api/scrape/promo-watchlist`](../../apps/dashboard/src/app/api/scrape/promo-watchlist/route.ts).

## User goals

- Add, remove, and scan items **without** editing raw `family_context` JSON in the generic Context screen.
- Keep the list **current** for the week (same mental model as a paper shopping list).
- Optional later: tie items to a **fixed store** (e.g. Barkarbystaden offers URL); v1 can document the URL in UI copy or a read-only hint.

## Data

| Store | Mechanism |
|-------|-----------|
| `family_context` | Single row: `key = 'promo_watchlist'`, `value` = JSON string array of user strings, e.g. `["Smör Arla", "kycklingfilé"]` |

**Constraints**

- Normalize trim on save; reject empty strings; cap list length reasonably (e.g. 100) to avoid huge payloads.
- Upsert follows existing `family_context` uniqueness on `key`.

## API (existing)

| Method | Path | Use |
|--------|------|-----|
| GET | `/api/context` | List all context rows (includes `promo_watchlist` only while the row exists) |
| PUT | `/api/context/:key` | Body `{ "value": "<json string or text>" }` — use key `promo_watchlist` for create/update |
| DELETE | `/api/context/:key` | **Removes the entire row** for that key. For `promo_watchlist`, use for “clear all” (after confirm in UI). Response `404` if key did not exist. After delete, `GET /api/scrape/promo-watchlist` returns `items: []` and `lastUpdated: null`. |
| GET | `/api/scrape/promo-watchlist` | **Machine**: `Authorization: Bearer SCRAPE_SYNC_SECRET` + service role on server; returns `{ items, lastUpdated, fetchedAt }` |

**Remove one item (without deleting the row):** `PUT /api/context/promo_watchlist` with a new JSON array that omits that item.

**Remove the whole watchlist:** `DELETE /api/context/promo_watchlist`.

Dashboard UI uses **cookie auth** via existing context routes; scrapers use the **scrape** route after `pnpm promo:download-watchlist`.

### Environment (dashboard + machine export)

| Variable | Where | Role |
|----------|--------|------|
| `SCRAPE_SYNC_SECRET` | Dashboard server env (e.g. `.env.local`) | Bearer secret for `GET /api/scrape/promo-watchlist`; must match the value used by the download script |
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard server env | Lets the scrape route read `family_context` with service role |
| `DASHBOARD_BASE_URL` | Shell / `.env` when running `pnpm promo:download-watchlist` | Base URL of the running dashboard (e.g. `http://localhost:3000`, no trailing slash) |
| `SCRAPE_SYNC_SECRET` | Same as above, in the shell that runs the script | Passed as `Authorization: Bearer …` by [`download-promo-watchlist.mjs`](../../apps/playwright-tools/scripts/download-promo-watchlist.mjs) |

### Weekly promotion import by store (all offers, dashboard filtering)

The current strategy is to import **all** weekly promotions first, then let the
dashboard filter them for the signed-in user. This replaces the older
matched-only upload as the primary flow.

Weekly imports are scoped by `storeKey` so several stores can coexist for the
same week. Stores can also have multiple imports in one ISO week when they run
separate promotion batches. Each upload creates one `promotion_import_runs` row
with its `store_key`; all child offers copy the same store key. Dashboard
current-week reads aggregate every import for the selected store/week instead of
collapsing to the latest run. When the same offer appears in more than one run,
the aggregate view merges it by `storeKey` + slugified offer title and keeps the
latest visible row for that store.

| Method | Path | Use |
|--------|------|-----|
| POST | `/api/promotions/import-weekly` | Cookie-auth. Body: `application/json` or multipart field `file` containing `<store-key>-scraped-promotions.json` (`{ storeKey, storeName, count, promotions }`) from Playwright. Creates `promotion_import_runs` + `weekly_promotions`; response echoes `{ runId, storeKey, storeName, weekNumber, isoYear, itemCount }`. |
| GET | `/api/promotions/stores` | Cookie-auth. Returns known store keys from previous imports, with latest week/count metadata for a selector. |
| GET | `/api/promotions/current-week?storeKey=` | Cookie-auth. Returns `{ run }` for the latest weekly promotion import, optionally scoped to one store. |
| GET | `/api/promotions/current-week/items?storeKey=` | Cookie-auth. Returns `{ run, items }` for all promotions in the latest import, ordered by scrape order. Also accepts `?runId=` or `?scope=current-week` to aggregate all current-week imports; `scope=current-week&storeKey=...` aggregates all current-week imports for one store. |
| POST | `/api/promotions/filter` | Cookie-auth. Body `{ "runId": "<uuid>" }` optional, or `{ "storeKey": "..." }` to filter the latest run for one store. Matches `weekly_promotions` against `family_context.promo_watchlist` and rewrites `weekly_promotion_matches` for that run. The dashboard calls this once per visible current-week run when filtering an aggregate store/week view. |
| GET | `/api/promotions/current-week/matches?storeKey=` | Cookie-auth. Returns matched offers for the latest run, optionally scoped to one store. Also accepts `?runId=` or `?scope=current-week` to view all matched promotions from all current-week imports; `scope=current-week&storeKey=...` limits the aggregate to one store. |
| POST | `/api/promotions/recipe-recommendations` | Cookie-auth. Body `{ "matchIds": ["<weekly_promotion_match_id>"] }`. Scores selected matched promotions against the signed-in user’s saved recipe library and returns up to 12 recommendations with plan status. |

Dashboard flow:

1. Upload all promotions for this week and store.
2. Store canonical weekly promotions under that `storeKey`.
3. Pick **All matched this week** or one store in the dashboard. Store views show all imports for that store in the current ISO week.
4. Run filtering for this user, store, and week. If there are multiple visible imports, the dashboard filters each run and aggregates the result.
5. Show **matched offers** and allow viewing **all promotions** for the selected store.
6. Select matched offers to get rules-based saved recipe recommendations, then add chosen recipes to **Plan to cook**.

Recipe recommendations are v1 deterministic: selected match interests and offer
titles are scored against saved recipe `ingredient_picks`, structured
`ingredients`, title, and summary. No Gemini call or schema change is required.

### Food-style favorite suggestions

The watchlist editor also supports adding favorites by food style. The mapping is
stored in `food_style_favorite_suggestions`, seeded with initial Vietnamese,
Korean, and Swedish/Nordic suggestions. The dashboard includes a standalone
`/recipe-generator/mapping` admin page so suggestions can be added or removed
without editing raw JSON.

The modal can ask AI for help: it sends the selected **food style** plus the
ICA picker catalog categories/items from
`ica-maxi-promo-picker-catalog.json` to Gemini, receives exact `watchlistText`
suggestions, and lets the user review/save selected mappings.
Food styles come from the same preset list as the recipe generator:
`apps/dashboard/public/data/recipe-food-types.json`.

| Method | Path | Use |
|--------|------|-----|
| GET | `/api/promo-food-style-suggestions` | List style → watchlist suggestion mappings. |
| POST | `/api/promo-food-style-suggestions` | Add one mapping: `{ styleId, styleLabel, watchlistText, priority }`. |
| POST | `/api/promo-food-style-suggestions/ai` | Generate draft mappings from `{ styleLabel }` using Gemini + ICA catalog categories/items. |
| DELETE | `/api/promo-food-style-suggestions/:id` | Remove one mapping. |

### Legacy promo match import (matched-only)

| Method | Path | Use |
|--------|------|-----|
| POST | `/api/promo-matches/import` | **Cookie-auth session.** Body: `application/json` matching Playwright **`watchlist-matches-only.json`**, or **`multipart/form-data`** with field **`file`** (same JSON). Creates a **`promo_match_runs`** row (with **`week_number`**) and **`promo_match_items`** rows. Response: `{ runId, itemCount, storeKey }`. |
| GET | `/api/promo-matches/latest` | **Cookie-auth.** Returns `{ run, items }` for the most recent import by `created_at`, or `{ run: null, items: [] }`. **`run`** includes **`week_number`** (ISO week at import). |
| DELETE | `/api/promo-matches/run/[runId]` | **Cookie-auth.** Deletes that import run and its items (CASCADE). Use when clearing the current import. Response: `{ deleted: true, runId }`. |
| POST | `/api/promo-matches/meal-plan` | **Cookie-auth.** JSON **`{ "runId": "<uuid>" }`** — builds a Swedish 7-day meal sketch from that import’s offers via Gemini; requires `GEMINI_API_KEY` on the server. See [promo-meal-plan.md](promo-meal-plan.md). |

The older matched-only path remains for compatibility with prior imports, but
the main dashboard flow uses `scraped-promotions.json` and dashboard-side
filtering. **`promo_match_runs.week_number`** and each
**`promo_match_items.week_number`** store the ISO week (UTC) at import time for
filtering and meal planning later.

Server helper **`deletePromoMatchRun`** in `apps/dashboard/src/lib/promo-matches-run.ts` performs the DELETE used by the API route.

## UI (shipped)

- **Route:** **`/promo-grocery-watchlist`** — kebab-case URL, parallel to `/context`, `/growing`.
- **Nav / title:** **Promo grocery watchlist** — general-purpose wording (not retailer-specific).
- **Weekly offers:** Second tab on the same page — upload `scraped-promotions.json`, list matched offers after filtering, and switch to all imported promotions for the week.
- **Primary editor**: Dedicated page; generic Context page links here and does not list `promo_watchlist` rows.
- **Item list layout:** **`table`** with **`#`**, **`Item`**, **`Actions`** (remove); horizontal scroll on small viewports; table caption for assistive tech.
- **Add flow:** ICA-aligned picker catalog (`apps/dashboard/public/data/ica-maxi-promo-picker-catalog.json`, runtime-validated) plus **Add my own text**; clear-all with confirm (`DELETE` the context row).
- **Add by food style:** Pick a style such as Vietnamese, Korean, or Swedish/Nordic; select mapped suggestions; **Manage mapping** opens `/recipe-generator/mapping` for manual edit and AI-assisted suggestion generation.
- **Persistence**: Immediate save per add/remove (TanStack Query).
- **Copy**: Example weekly offers link (ICA Maxi Barkarbystaden), `pnpm promo:download-watchlist`, note that per-store scrapers read the same list.

## Out of scope (this requirement)

- Automatic scrape scheduling from the dashboard.
- Separate watchlists per retailer in v1 (single `promo_watchlist`; promotion imports are multi-store).
- LLM interpretation of list items (matching logic is Playwright package / shared `score*` later).

## Acceptance criteria

1. User can maintain `promo_watchlist` entirely from the new UI; values round-trip as JSON array in DB.
2. Generic Context page does **not** list `promo_watchlist`; **one** canonical editor on `/promo-grocery-watchlist`.
3. `GET /api/scrape/promo-watchlist` with valid bearer returns the same logical items as the UI shows after save.
4. Mobile layout is usable: table remains readable (scroll or compact table pattern), tappable **Actions** targets.

## Playwright: match weekly promotions to the watchlist

Local flow (see `apps/playwright-tools`):

1. **Download watchlist** — with dashboard running and env set: `pnpm promo:download-watchlist` (writes `apps/playwright-tools/data/promo-watchlist.json`; gitignored).
2. **Scrape store offers** — from the repo root, run `pnpm promo:scrape:ica-maxi-barkarbystaden`, `pnpm promo:scrape:ica-nara-kallhall`, or `pnpm promo:scrape:coop-kallhall` (network; writes **`<store-key>-scraped-promotions.json`** with all offers for that store). From `apps/playwright-tools`, the equivalent scripts omit the `promo:` prefix.
3. **Dashboard import + match** — upload the store-specific **`<store-key>-scraped-promotions.json`**; `POST /api/promotions/filter` scores each stored offer against every watchlist string using Swedish-aware whole-token matching plus catalog-backed aliases/blocks for ambiguous grocery terms.

**On-disk outputs (no report download):** under **`apps/playwright-tools/data/promo-run/`** — full store exports named **`<store-key>-scraped-promotions.json`** (`{ storeKey, storeName, count, promotions }`), plus **`watchlist-matches-only.json`** (`{ interests, matches }`, same as the report attachment) whenever the watchlist file has items; **`watchlist-matches.json`** (slim summary + `watchlist-matches.json`-style rows) from the main extract test; the rank-only test overwrites **`watchlist-matches-only.json`** if both run. Set **`PROMO_NO_DISK_OUTPUT=1`** to skip disk writes.

Tuning: add broader or narrower phrases on the dashboard; optional `minScore` (default 50) when calling `matchPromotionsToWatchlist`. For noisy ICA catalog terms, add aliases/blocked terms/category guards in the shared matcher instead of relying on raw substring behavior.

## Related

- [promo-meal-suggestions.md](promo-meal-suggestions.md) — 10 meal ideas from imports (near-term; mockup + future API)
- [promo-meal-plan.md](promo-meal-plan.md) — deferred 7-day AI meal sketch (data flow, schema, API, env)
- [promotions-find-strategy.md](promotions-find-strategy.md) — how scrapers find offer tiles and match the watchlist
- [promotions.md](promotions.md) — email deal extraction
- [dashboard.md](dashboard.md) — app shell
- [ica-maxi-picker-catalog-source.md](ica-maxi-picker-catalog-source.md) — ICA Maxi Handla **category** tree (grouping reference for interests; not product lists or live promos)
- Phase 8: [../phases/08-meal-shopping-from-promotions/SCOPE.md](../phases/08-meal-shopping-from-promotions/SCOPE.md)
