# Phase 08 — Implementation tasks (promo watchlist UI-first slice)

Time-boxed order for **grocery intent UI** + docs touchpoints; scrape/match hardening can follow in the same phase.

**Canonical `family_context` key (decided):** `promo_watchlist` — `value` is a JSON stringified array of user strings, e.g. `["Smör Arla","kycklingfilé"]`. Do not use `grocery_watchlist` or reuse `shopping_list` for this feature; `shopping_list` remains the Worker/email matching key.

## 1. Requirements & contract (done in docs)

- [x] `docs/requirements/promo-watchlist.md` — behavior, data shape, API surface
- [x] `docs/requirements/ica-maxi-picker-catalog-source.md` — ICA Maxi Handla category tree (regenerated from `ica-maxi-initial-state-raw.json`; basis for picker grouping / interests)
- [x] Phase 8 `SCOPE.md` — aligned plan and links

## 2. Data & API verification

- [x] **Create / update:** `PUT /api/context/promo_watchlist` with body `{ "value": "<JSON array string>" }` — row exists in `family_context`, `value` round-trips as a string array client-side.
- [x] **Read:** `GET /api/context` includes `promo_watchlist` with parseable `value` after save; `GET /api/context/promo_watchlist` returns the row (`404` if never created).
- [x] **Delete row (clear entire watchlist):** `DELETE /api/context/promo_watchlist` — returns `200` + `{ success: true }` when row existed, `404` when absent; afterward `GET /api/context` omits `promo_watchlist` and **`GET /api/scrape/promo-watchlist`** returns `items: []`, `lastUpdated: null`.
- [x] **Delete one item (keep row):** `PUT` a shorter JSON array (no `DELETE` of the key).
- [x] **Machine export:** `GET /api/scrape/promo-watchlist` (Bearer `SCRAPE_SYNC_SECRET`) matches dashboard state after PUT and after DELETE-key.
- [x] Document env vars for machine export: `SCRAPE_SYNC_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` (dashboard), `DASHBOARD_BASE_URL` + secret (download script). See [promo-watchlist.md](../../requirements/promo-watchlist.md#environment-dashboard--machine-export).

## 3. Dashboard UI — **Promo grocery watchlist** (general route)

- [x] Add app route **`/promo-grocery-watchlist`** (`app/promo-grocery-watchlist/page.tsx`). **User-facing name:** “Promo grocery watchlist” (general: grocery promos / flyers, not ICA-specific in title). ICA Maxi is only an example in help/onboarding copy until more stores exist.
- [x] Wire **main nav + mobile menu** (same pattern as Context / Growing): label **Promo grocery watchlist** → `/promo-grocery-watchlist`. Update [dashboard.md](../../requirements/dashboard.md) section list when shipped.
- [x] Load `promo_watchlist` from context API; parse JSON array; empty state when missing.
- [x] Render items in a **`table`**: columns **#**, **Item**, **Actions** (remove); header row; mobile-friendly (horizontal scroll or equivalent). Add / clear-all controls outside the table per [promo-watchlist.md](../../requirements/promo-watchlist.md).
- [x] **Add item (improved UX)** — not only raw text:
  - **Curated picker:** static **JSON** catalog of **interest labels** (what users might want to track — **not** live promo SKUs; matching real offers happens later via scrape). Categories + searchable list; **filter by category** chips/dropdown aligned with ICA-style groupings.
  - **Source of catalog:** align picker groupings with the Handla **category** tree in [ica-maxi-picker-catalog-source.md](../../requirements/ica-maxi-picker-catalog-source.md) (block regenerated from `ica-maxi-initial-state-raw.json`); committed **interest** JSON under `apps/dashboard/public/data/ica-maxi-promo-picker-catalog.json` with **runtime validation** in [`promo-picker-catalog-validate.ts`](../../../apps/dashboard/src/lib/promo-picker-catalog-validate.ts).
  - **Custom phrase:** always allow **“Add my own text”** so items not in the catalog still work.
  - Persist selection with existing `PUT /api/context/promo_watchlist` (merge into array, dedupe if desired).
- [x] **Remove one item**: per-row control in **Actions** → `PUT` array without that item.
- [x] **Clear entire list** (optional control): confirm → `DELETE /api/context/promo_watchlist` (not an empty PUT — `PUT` rejects empty `value` today).
- [x] **Optional**: hide `promo_watchlist` from generic Context grid to prevent double editing, or show read-only link “Edit in Promo grocery watchlist”.
- [x] Help text: example store (ICA Maxi Barkarbystaden offers URL), `pnpm promo:download-watchlist`, and note that scrapers per retailer consume the same list.

## 4. Polish

- [x] Loading/error states (TanStack Query) consistent with other dashboards.
- [x] Cap list length + trim validation; toast or inline error on failure.

## 5. Weekly promo import (Option A — manual upload → DB → dashboard)

- [x] Migrations `017_promo_match_import.sql` + `018_promo_match_items_week_number.sql` — runs/items tables, RLS, `promo_match_items.week_number` (ISO, UTC).
- [x] Parser / types — `apps/dashboard/src/lib/promo-matches-import.ts` (`watchlist-matches-only.json` shape).
- [x] `POST /api/promo-matches/import` — JSON or multipart `file`; inserts run + items; rolls back run on item failure.
- [x] `GET /api/promo-matches/latest` — latest run by `created_at` + ordered items.
- [x] Dashboard UI on `/promo-grocery-watchlist` — `PromoWeeklyMatchesSection` (upload, TanStack Query, table with image / title / interest / score / link).
- [ ] **Verify on your Supabase project:** `supabase db push` (or equivalent); sign in → upload sample `apps/playwright-tools/data/promo-run/watchlist-matches-only.json` → rows appear with `week_number` set; refresh shows same latest run.

## 6. Follow-on (same phase, after UI ships)

- [x] Playwright: read `data/promo-watchlist.json` and rank `ScrapedPromotion[]` — [`match-promotions.ts`](../../apps/playwright-tools/src/match-promotions.ts), tests in `apps/playwright-tools/tests/match-promotions.spec.ts`; ICA extract spec attaches matches when the watchlist file exists.
- [x] Lazy-load / scroll ICA strategy for full offer grid (~180 items) — `expandLazyLoadedOfferTiles` in [`ica-maxi-barkarbystaden.ts`](../../../apps/playwright-tools/src/strategies/ica-maxi-barkarbystaden.ts).

## Verify

- Manual: add items → scrape export matches; remove one item via `PUT` → export matches; **clear all** via `DELETE` → export shows `items: []`.
- Regression: existing Context flows still work; **`shopping_list`** / other keys unchanged.
