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

## UI (planned)

- **Route (decided):** **`/promo-grocery-watchlist`** — kebab-case URL, parallel to `/context`, `/growing`.
- **Nav / title:** **Promo grocery watchlist** — general-purpose wording (not retailer-specific).
- **Primary editor**: Dedicated page—not only the generic Context key-value grid.
- **Item list layout:** **`table`** (not a loose bullet list). Suggested columns: **`#`** (1-based row index), **`Item`** (product phrase), **`Actions`** (remove row). Header row for clarity; empty state when there are no rows. On **narrow viewports**, allow **horizontal scroll** for the table or use a compact pattern that preserves row/column semantics (e.g. `role="grid"` / proper `<th>` scope) so assistive tech still understands structure.
- **Controls**: Add new entry above or below the table: input + add button; per-row delete in **Actions**; optional clear-all with confirm (outside the table).
- **Persistence**: Prefer immediate save per add/remove (TanStack Query), same as other dashboards.
- **Copy**: Short help—**example** weekly offers link (ICA Maxi Barkarbystaden), `pnpm promo:download-watchlist`, note that per-store scrapers read the same list.
- **Accessibility**: Table captions or `aria-labelledby` if helpful; focus order: add flow then table; remove buttons have discernible names (e.g. “Remove {item}”). Align with `DESIGN-SYSTEM.md`.

## Out of scope (this requirement)

- Automatic scrape scheduling from the dashboard.
- Separate DB lists per retailer in v1 (single `promo_watchlist`; multi-store is a future shape if needed).
- LLM interpretation of list items (matching logic is Playwright package / shared `score*` later).

## Acceptance criteria

1. User can maintain `promo_watchlist` entirely from the new UI; values round-trip as JSON array in DB.
2. Generic Context page may still show `promo_watchlist` or we hide that key from generic list to avoid duplicate editors—**one** canonical editor (decision during implementation).
3. `GET /api/scrape/promo-watchlist` with valid bearer returns the same logical items as the UI shows after save.
4. Mobile layout is usable: table remains readable (scroll or compact table pattern), tappable **Actions** targets.

## Playwright: match weekly promotions to the watchlist

Local flow (see `apps/playwright-tools`):

1. **Download watchlist** — with dashboard running and env set: `pnpm promo:download-watchlist` (writes `apps/playwright-tools/data/promo-watchlist.json`; gitignored).
2. **Scrape ICA offers** — `pnpm playwright:test -- tests/ica-maxi-extract-promotions.spec.ts` (network; uses [`ica-maxi-barkarbystaden`](../../apps/playwright-tools/src/strategies/ica-maxi-barkarbystaden.ts): maps `data/promo-watchlist.json` items to departments via [`ica-maxi-promo-picker-catalog.json`](ica-maxi-promo-picker-catalog.json), then clicks weekly-offers filter chips per department before scraping tiles).
3. **Rule-based match** — [`match-promotions.ts`](../../apps/playwright-tools/src/match-promotions.ts) scores each `ScrapedPromotion` against every watchlist string (full substring after Swedish case-fold, or all tokens ≥2 chars). The extract test attaches **`watchlist-matches.json`** when `data/promo-watchlist.json` exists. A second test runs scrape + match only if that file is present (skipped otherwise).

Tuning: add broader or narrower phrases on the dashboard; optional `minScore` (default 50) when calling `matchPromotionsToWatchlist`.

## Related

- [promotions-find-strategy.md](promotions-find-strategy.md) — how scrapers find offer tiles and match the watchlist
- [promotions.md](promotions.md) — email deal extraction
- [dashboard.md](dashboard.md) — app shell
- [ica-maxi-picker-catalog-source.md](ica-maxi-picker-catalog-source.md) — ICA Maxi Handla **category** tree (grouping reference for interests; not product lists or live promos)
- Phase 8: [../phases/08-meal-shopping-from-promotions/SCOPE.md](../phases/08-meal-shopping-from-promotions/SCOPE.md)
