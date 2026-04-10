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

- Normalize trim on save; reject empty strings; cap list length reasonably (e.g. 50) to avoid huge payloads.
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

### Promo match import (weekly offers you matched offline)

| Method | Path | Use |
|--------|------|-----|
| POST | `/api/promo-matches/import` | **Cookie-auth session.** Body: `application/json` matching Playwright **`watchlist-matches-only.json`**, or **`multipart/form-data`** with field **`file`** (same JSON). Creates a **`promo_match_runs`** row (with **`week_number`**) and **`promo_match_items`** rows. Response: `{ runId, itemCount, storeKey }`. |
| GET | `/api/promo-matches/latest` | **Cookie-auth.** Returns `{ run, items }` for the most recent import by `created_at`, or `{ run: null, items: [] }`. **`run`** includes **`week_number`** (ISO week at import). |
| DELETE | `/api/promo-matches/run/[runId]` | **Cookie-auth.** Deletes that import run and its items (CASCADE). Use when clearing the current import. Response: `{ deleted: true, runId }`. |
| POST | `/api/promo-matches/meal-plan` | **Cookie-auth.** JSON **`{ "runId": "<uuid>" }`** — builds a Swedish 7-day meal sketch from that import’s offers via Gemini; requires `GEMINI_API_KEY` on the server. See [promo-meal-plan.md](promo-meal-plan.md). |

After running the ICA extract test with a non-empty local watchlist, upload **`apps/playwright-tools/data/promo-run/watchlist-matches-only.json`** from the Promo grocery watchlist page. Each upload appends a new run; the UI shows the **latest** run only (older runs remain in DB for future “history” if needed). **`promo_match_runs.week_number`** and each **`promo_match_items.week_number`** store the ISO week (UTC) at import time for filtering and meal planning later.

Server helper **`deletePromoMatchRun`** in `apps/dashboard/src/lib/promo-matches-run.ts` performs the DELETE used by the API route.

## UI (shipped)

- **Route:** **`/promo-grocery-watchlist`** — kebab-case URL, parallel to `/context`, `/growing`.
- **Nav / title:** **Promo grocery watchlist** — general-purpose wording (not retailer-specific).
- **Weekly matched offers:** Second tab on the same page — upload `watchlist-matches-only.json`, list latest import from DB (see import APIs above); meal plan from chosen run.
- **Primary editor**: Dedicated page; generic Context page links here and does not list `promo_watchlist` rows.
- **Item list layout:** **`table`** with **`#`**, **`Item`**, **`Actions`** (remove); horizontal scroll on small viewports; table caption for assistive tech.
- **Add flow:** ICA-aligned picker catalog (`apps/dashboard/public/data/ica-maxi-promo-picker-catalog.json`, runtime-validated) plus **Add my own text**; clear-all with confirm (`DELETE` the context row).
- **Persistence**: Immediate save per add/remove (TanStack Query).
- **Copy**: Example weekly offers link (ICA Maxi Barkarbystaden), `pnpm promo:download-watchlist`, note that per-store scrapers read the same list.

## Out of scope (this requirement)

- Automatic scrape scheduling from the dashboard.
- Separate DB lists per retailer in v1 (single `promo_watchlist`; multi-store is a future shape if needed).
- LLM interpretation of list items (matching logic is Playwright package / shared `score*` later).

## Acceptance criteria

1. User can maintain `promo_watchlist` entirely from the new UI; values round-trip as JSON array in DB.
2. Generic Context page does **not** list `promo_watchlist`; **one** canonical editor on `/promo-grocery-watchlist`.
3. `GET /api/scrape/promo-watchlist` with valid bearer returns the same logical items as the UI shows after save.
4. Mobile layout is usable: table remains readable (scroll or compact table pattern), tappable **Actions** targets.

## Playwright: match weekly promotions to the watchlist

Local flow (see `apps/playwright-tools`):

1. **Download watchlist** — with dashboard running and env set: `pnpm promo:download-watchlist` (writes `apps/playwright-tools/data/promo-watchlist.json`; gitignored).
2. **Scrape ICA offers** — `pnpm playwright:test -- tests/ica-maxi-extract-promotions.spec.ts` (network; uses [`ica-maxi-barkarbystaden`](../../apps/playwright-tools/src/strategies/ica-maxi-barkarbystaden.ts): maps `data/promo-watchlist.json` items to departments via [`ica-maxi-promo-picker-catalog.json`](ica-maxi-promo-picker-catalog.json), then clicks weekly-offers filter chips per department before scraping tiles).
3. **Rule-based match** — [`match-promotions.ts`](../../apps/playwright-tools/src/match-promotions.ts) scores each `ScrapedPromotion` against every watchlist string (full substring after Swedish case-fold, or all tokens ≥2 chars). The extract test attaches **`watchlist-matches.json`** when `data/promo-watchlist.json` exists. A second test runs scrape + match only if that file is present (skipped otherwise).

**On-disk outputs (no report download):** under **`apps/playwright-tools/data/promo-run/`** — **`watchlist-matches-only.json`** (`{ interests, matches }`, same as the report attachment) whenever the watchlist file has items; **`watchlist-matches.json`** (slim summary + `watchlist-matches.json`-style rows) from the main extract test; the rank-only test overwrites **`watchlist-matches-only.json`** if both run. Full **`scraped-promotions.json`** stays a Playwright attachment only unless you copy from the report. Set **`PROMO_NO_DISK_OUTPUT=1`** to skip disk writes.

Tuning: add broader or narrower phrases on the dashboard; optional `minScore` (default 50) when calling `matchPromotionsToWatchlist`.

## Related

- [promo-meal-suggestions.md](promo-meal-suggestions.md) — 10 meal ideas from imports (near-term; mockup + future API)
- [promo-meal-plan.md](promo-meal-plan.md) — deferred 7-day AI meal sketch (data flow, schema, API, env)
- [promotions-find-strategy.md](promotions-find-strategy.md) — how scrapers find offer tiles and match the watchlist
- [promotions.md](promotions.md) — email deal extraction
- [dashboard.md](dashboard.md) — app shell
- [ica-maxi-picker-catalog-source.md](ica-maxi-picker-catalog-source.md) — ICA Maxi Handla **category** tree (grouping reference for interests; not product lists or live promos)
- Phase 8: [../phases/08-meal-shopping-from-promotions/SCOPE.md](../phases/08-meal-shopping-from-promotions/SCOPE.md)
