# Strategy to find promotions

## Purpose

Describe how **weekly retail offers** are discovered in code: store-specific Playwright **scrapers** produce `ScrapedPromotion` rows, then a **rule-based matcher** pairs them with the user’s **`promo_watchlist`** (`family_context`). This is separate from [promotion **emails**](promotions.md), which flow through ingestion and tasks.

## End-to-end flow

1. **Intent** — User maintains strings on [Promo grocery watchlist](promo-watchlist.md) (dashboard + `GET /api/scrape/promo-watchlist` for machines).
2. **Download locally** — `pnpm promo:download-watchlist` writes `apps/playwright-tools/data/promo-watchlist.json` (gitignored).
3. **Open the right surfaces** — A `StorePromotionStrategy` navigates to offer grids. For ICA Maxi the **target** is to derive **categories from those interests** first, then open each relevant category (offers filter and/or Handla aisle—see below). **v1** opens a single weekly offers hub.
4. **Extract tiles** — Strategy-specific DOM logic collects one record per offer (title, card text, optional price line, **product `imageUrl` when the tile has an `img`**, page URL, stable index on the page).
5. **Match** — [`match-promotions.ts`](../../apps/playwright-tools/src/match-promotions.ts) scores each offer against each watchlist string; results can be attached in tests as `watchlist-matches.json`.

## Code layout

| Piece | Role |
|-------|------|
| [`promotion-types.ts`](../../apps/playwright-tools/src/promotion-types.ts) | `ScrapedPromotion`, `StorePromotionStrategy` contract |
| `src/strategies/*.ts` | One module per retailer / URL template (selectors, waits, parsing) |
| [`match-promotions.ts`](../../apps/playwright-tools/src/match-promotions.ts) | Normalization, scoring, `matchPromotionsToWatchlist` |
| Tests under `apps/playwright-tools/tests/` | e.g. `ica-maxi-extract-promotions.spec.ts` wires strategy + optional watchlist match |

Adding a new store means implementing `gotoOffersPage` + `extractPromotions` and pointing tests at the new strategy.

## ICA Maxi — category-first strategy (target)

Weekly **erbjudanden** pages can expose hundreds of tiles; loading everything at once is brittle, and many interests clearly belong under specific **Handla** aisles. The intended flow is:

1. **Resolve categories from interests** — For each `promo_watchlist` string, map to one or more ICA category nodes using [`ica-maxi-promo-picker-catalog.json`](ica-maxi-promo-picker-catalog.json): match `watchlistText` (and close synonyms), or use the picker’s `fullURLPath` / `name` data when the user chose from the catalog. Dedupe so the same parent aisle is not opened many times.
2. **Visit each relevant category context** — For every distinct category (or small set of parent paths),
   - open the **weekly offers** surface **filtered** to that department when ICA exposes a chip or query that maps cleanly (see [`ica-maxi.spec.ts`](../../apps/playwright-tools/tests/ica-maxi.spec.ts): “Filter för erbjudanden” chips such as `Mejeri (5)`), **and/or**
   - open the **Handla** category URL for the store (built from the category `fullURLPath` and the store’s online-shop pattern) if that is where promotions or “erbjudande” product grids should be scraped.
3. **Extract promotions in that slice** — Reuse the same tile heuristic where the DOM matches (“Lägg i inköpslista”, card bounds). Scroll or paginate within the category until counts stabilize where needed.
4. **Match** — Keep [`match-promotions.ts`](../../apps/playwright-tools/src/match-promotions.ts) as a final pass (or narrow the haystack earlier once categories are correct).

**Why:** Smaller DOM slices reduce noise, improve relevance before matching, and align automation with how shoppers think (aisle → deals). Exact URL patterns and whether “promo-only” lives on `erbjudanden` filters vs Handla PLP must stay aligned with ICA’s live templates—discover and lock them in tests.

**Status:** Weekly-offers **filter chips** + catalog mapping are implemented when `extractPromotions` is called with `watchlistInterests` (see below). Handla PLP URLs per `fullURLPath` remain a future option if needed.

## ICA Maxi Barkarbystaden (current implementation)

Implementation: [`ica-maxi-barkarbystaden.ts`](../../apps/playwright-tools/src/strategies/ica-maxi-barkarbystaden.ts). Catalog helpers: [`promo-picker-catalog.ts`](../../apps/playwright-tools/src/ica-maxi/promo-picker-catalog.ts) reading [`ica-maxi-promo-picker-catalog.json`](ica-maxi-promo-picker-catalog.json).

**URL** — Fixed ICA Maxi stormarknad **weekly offers** hub (`defaultOffersUrl` in the strategy).

**Watchlist-scoped scrape** — If `watchlistInterests` is non-empty, each string is scored against catalog `watchlistText` + `name` (same rules as [`match-promotions.ts`](../../apps/playwright-tools/src/match-promotions.ts)). Matched items contribute their row’s **`departmentId`** → department **`name`**. **`mergeIcaMaxiWeeklyOffersDepartments`** then adds promotion-only filters **`Färskvaror`** and **`Djupfryst`** (weekly-offers chips not present as Handla top-level categories in [`ica-maxi-promo-picker-catalog.json`](ica-maxi-promo-picker-catalog.json)). Available chips are read from **`.categoriesContainer`** (prefer **`aria-label`**). Each department is **matched only to chips that appear** (`findChipLabelForDepartment`); missing chips are **skipped** (logged). If nothing from the catalog matches the watchlist, extraction still tries those weekly-offers-only departments before falling back to a full scrape when no chips match.

**Full-page scrape** — If `watchlistInterests` is omitted or empty, or nothing in the catalog reaches score ≥ 50, behavior falls back to a single pass over the default “all offers” view (with a console warning when the catalog had no hits).

**Load** — `page.goto` with `domcontentloaded`, then wait for visible copy that indicates the offers UI (“Filter för erbjudanden”) and at least one “Lägg i inköpslista” control.

**Finding offer cards** — ICA tiles expose “Lägg i inköpslista” on buttons/links. The scraper:

- Collects elements whose text matches that phrase (case-insensitive).
- For each, walks up the DOM (bounded depth) to find an ancestor whose full text contains **exactly one** list-CTA occurrence and whose length is within a band (roughly one product card, not the whole page).
- Derives **title** from non-empty lines of card text (first substantial line that does not look like a raw price line).
- Derives **priceHint** from a line that has digits and currency/size hints (`kr`, `för`, `/kg`, etc.).
- Picks **`imageUrl`** from the first suitable `img` in the card (`src`, `data-src`, or `currentSrc`), resolved to an absolute URL; skips tiny placeholders.
- Strips trailing “lägg i inköpslista” noise from stored strings.

**Limits** — Only tiles currently in the DOM are scraped. If the site lazy-loads more offers on scroll, the strategy may need scroll/retry until counts stabilize (not implemented in v1). Category-first navigation should mitigate some of this by scraping smaller views per interest.

## Watchlist matching rules

Rules-only; no LLM.

- **Normalize** — Swedish locale lowercasing, collapse whitespace for both interest and `title` + `cardText`.
- **Substring** — If the full normalized interest appears in that haystack → score **100**.
- **Tokens** — Else split interest on spaces; keep tokens with length ≥ 2. If **every** token appears somewhere in the haystack → score **90 + min(9, token count)** (capped at **99**).
- **Filter** — Default `minScore` is **50**, so only substring and all-token hits are kept.

Tune behavior by changing phrases on the watchlist or passing a different `minScore` when calling `matchPromotionsToWatchlist`.

## How to run

See [promo-watchlist.md — Playwright section](promo-watchlist.md#playwright-match-weekly-promotions-to-the-watchlist): download watchlist, run the ICA extract spec, inspect attachments when `promo-watchlist.json` exists.

## Related

- [promo-watchlist.md](promo-watchlist.md) — data model, dashboard, scrape export, Playwright commands
- [promotions.md](promotions.md) — email-sourced deals
- [ica-maxi-picker-catalog-source.md](ica-maxi-picker-catalog-source.md) — Handla **category** tree (picker / interests), not live weekly tiles
- [ica-maxi-promo-picker-catalog.json](ica-maxi-promo-picker-catalog.json) — merged categories + items with `watchlistText` / `fullURLPath` for mapping interests to aisles
