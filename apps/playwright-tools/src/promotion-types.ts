import type { Page } from "@playwright/test";

/**
 * Normalized shape for any store-specific Playwright scraper.
 * Downstream (LLM, Supabase) maps this to meal/shopping rows.
 */
export type ScrapedPromotion = {
  /** e.g. `ica-maxi-barkarbystaden` — one scraper module per store/site template */
  storeKey: string;
  /** Page URL when the scrape ran */
  sourceUrl: string;
  /** Order on the page (0-based); not stable across weeks */
  index: number;
  /** Short label for lists */
  title: string;
  /** Full visible card copy — safest input for later NLP */
  cardText: string;
  /** Heuristic price / offer line if detected */
  priceHint?: string;
  /** Product photo URL when the tile exposes one (absolute https). */
  imageUrl?: string;
};

/** Optional scrape scope (e.g. map watchlist strings to store categories first). */
export type ExtractPromotionsOptions = {
  /** When set and non-empty, ICA Maxi restricts weekly-offers filter chips via promo picker catalog. */
  watchlistInterests?: string[];
};

/**
 * Each retailer (or store URL template) implements this.
 * Keeps selectors, scroll/wait, and parsing out of generic tests.
 */
export type StorePromotionStrategy = {
  readonly storeKey: string;
  readonly defaultOffersUrl: string;
  /** Navigate and wait until offers are ready to scrape */
  gotoOffersPage: (page: Page) => Promise<void>;
  /** Read structured candidates from the current page (or scoped views when options are supported). */
  extractPromotions: (
    page: Page,
    options?: ExtractPromotionsOptions,
  ) => Promise<ScrapedPromotion[]>;
};
