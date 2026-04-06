# Phase 08 — Implementation tasks (promo watchlist UI-first slice)

Time-boxed order for **grocery intent UI** + docs touchpoints; scrape/match hardening can follow in the same phase.

**Canonical `family_context` key (decided):** `promo_watchlist` — `value` is a JSON stringified array of user strings, e.g. `["Smör Arla","kycklingfilé"]`. Do not use `grocery_watchlist` or reuse `shopping_list` for this feature; `shopping_list` remains the Worker/email matching key.

## 1. Requirements & contract (done in docs)

- [x] `docs/requirements/promo-watchlist.md` — behavior, data shape, API surface
- [x] `docs/requirements/ica-maxi-picker-catalog-source.md` — ICA Maxi Handla category tree (regenerated from `ica-maxi-initial-state-raw.json`; basis for picker grouping / interests)
- [x] Phase 8 `SCOPE.md` — aligned plan and links

## 2. Data & API verification

- [ ] **Create / update:** `PUT /api/context/promo_watchlist` with body `{ "value": "<JSON array string>" }` — row exists in `family_context`, `value` round-trips as a string array client-side.
- [ ] **Read:** `GET /api/context` includes `promo_watchlist` with parseable `value` after save; `GET /api/context/promo_watchlist` returns the row (`404` if never created).
- [ ] **Delete row (clear entire watchlist):** `DELETE /api/context/promo_watchlist` — returns `200` + `{ success: true }` when row existed, `404` when absent; afterward `GET /api/context` omits `promo_watchlist` and **`GET /api/scrape/promo-watchlist`** returns `items: []`, `lastUpdated: null`.
- [ ] **Delete one item (keep row):** `PUT` a shorter JSON array (no `DELETE` of the key).
- [ ] **Machine export:** `GET /api/scrape/promo-watchlist` (Bearer `SCRAPE_SYNC_SECRET`) matches dashboard state after PUT and after DELETE-key.
- [ ] Document env vars for machine export: `SCRAPE_SYNC_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` (dashboard), `DASHBOARD_BASE_URL` + secret (download script).

## 3. Dashboard UI — **Promo grocery watchlist** (general route)

- [ ] Add app route **`/promo-grocery-watchlist`** (`app/promo-grocery-watchlist/page.tsx`). **User-facing name:** “Promo grocery watchlist” (general: grocery promos / flyers, not ICA-specific in title). ICA Maxi is only an example in help/onboarding copy until more stores exist.
- [ ] Wire **main nav + mobile menu** (same pattern as Context / Growing): label **Promo grocery watchlist** → `/promo-grocery-watchlist`. Update [dashboard.md](../../requirements/dashboard.md) section list when shipped.
- [ ] Load `promo_watchlist` from context API; parse JSON array; empty state when missing.
- [ ] Render items in a **`table`**: columns **#**, **Item**, **Actions** (remove); header row; mobile-friendly (horizontal scroll or equivalent). Add / clear-all controls outside the table per [promo-watchlist.md](../../requirements/promo-watchlist.md).
- [ ] **Add item (improved UX)** — not only raw text:
  - **Curated picker:** static **JSON** catalog of **interest labels** (what users might want to track — **not** live promo SKUs; matching real offers happens later via scrape). Categories + searchable list; **filter by category** chips/dropdown aligned with ICA-style groupings.
  - **Source of catalog:** align picker groupings with the Handla **category** tree in [ica-maxi-picker-catalog-source.md](../../requirements/ica-maxi-picker-catalog-source.md) (block regenerated from `ica-maxi-initial-state-raw.json`); produce committed **interest** JSON via **AI** or manual pass (e.g. under `packages/shared` or `apps/dashboard/public/data`) with **schema validation** so bad output never ships.
  - **Custom phrase:** always allow **“Add my own text”** so items not in the catalog still work.
  - Persist selection with existing `PUT /api/context/promo_watchlist` (merge into array, dedupe if desired).
- [ ] **Remove one item**: per-row control in **Actions** → `PUT` array without that item.
- [ ] **Clear entire list** (optional control): confirm → `DELETE /api/context/promo_watchlist` (not an empty PUT — `PUT` rejects empty `value` today).
- [ ] **Optional**: hide `promo_watchlist` from generic Context grid to prevent double editing, or show read-only link “Edit in Promo grocery watchlist”.
- [ ] Help text: example store (ICA Maxi Barkarbystaden offers URL), `pnpm promo:download-watchlist`, and note that scrapers per retailer consume the same list.

## 4. Polish

- [ ] Loading/error states (TanStack Query) consistent with other dashboards.
- [ ] Cap list length + trim validation; toast or inline error on failure.

## 5. Weekly promo import (Option A — manual upload → DB → dashboard)

- [x] Migrations `017_promo_match_import.sql` + `018_promo_match_items_week_number.sql` — runs/items tables, RLS, `promo_match_items.week_number` (ISO, UTC).
- [x] Parser / types — `apps/dashboard/src/lib/promo-matches-import.ts` (`watchlist-matches-only.json` shape).
- [x] `POST /api/promo-matches/import` — JSON or multipart `file`; inserts run + items; rolls back run on item failure.
- [x] `GET /api/promo-matches/latest` — latest run by `created_at` + ordered items.
- [x] Dashboard UI on `/promo-grocery-watchlist` — `PromoWeeklyMatchesSection` (upload, TanStack Query, table with image / title / interest / score / link).
- [ ] **Verify**: run `supabase db push` (or equivalent) on target project; sign in → upload sample `apps/playwright-tools/data/promo-run/watchlist-matches-only.json` → rows appear with `week_number` set; refresh shows same latest run.

## 6. Follow-on (same phase, after UI ships)

- [x] Playwright: read `data/promo-watchlist.json` and rank `ScrapedPromotion[]` — [`match-promotions.ts`](../../apps/playwright-tools/src/match-promotions.ts), tests in `apps/playwright-tools/tests/match-promotions.spec.ts`; ICA extract spec attaches matches when the watchlist file exists.
- [ ] Lazy-load / scroll ICA strategy for full offer grid (~180 items).

## Verify

- Manual: add items → scrape export matches; remove one item via `PUT` → export matches; **clear all** via `DELETE` → export shows `items: []`.
- Regression: existing Context flows still work; **`shopping_list`** / other keys unchanged.
