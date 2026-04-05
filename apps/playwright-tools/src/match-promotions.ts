import type { ScrapedPromotion } from "./promotion-types";

/** One watchlist string matched to one scraped offer. */
export type PromotionWatchlistMatch = {
  interest: string;
  promotion: ScrapedPromotion;
  /** 0–100; substring hit = 100, all tokens present = 90–99 */
  score: number;
};

function normalize(s: string): string {
  return s.toLocaleLowerCase("sv-SE").replace(/\s+/g, " ").trim();
}

/**
 * Score how well `interest` matches normalized haystack (same rules as promotions).
 * - Full phrase as substring (after normalize) → 100.
 * - Otherwise: split into tokens (length ≥ 2); if every token appears in haystack → 90 + min(9, token count) (cap 99).
 */
export function scoreInterestAgainstHaystack(interest: string, haystack: string): number {
  const raw = interest.trim();
  if (raw.length < 2) {
    return 0;
  }
  const h = normalize(haystack);
  const needle = normalize(raw);
  if (needle.length < 2) {
    return 0;
  }
  if (h.includes(needle)) {
    return 100;
  }
  const tokens = needle
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  if (tokens.length === 0) {
    return 0;
  }
  const allHit = tokens.every((t) => h.includes(t));
  if (!allHit) {
    return 0;
  }
  return Math.min(99, 90 + Math.min(tokens.length, 9));
}

/**
 * Score how well `interest` matches offer text.
 * - Full phrase as substring (after normalize) → 100.
 * - Otherwise: split into tokens (length ≥ 2); if every token appears in haystack → 90 + min(9, token count) (cap 99).
 */
export function scoreInterestAgainstPromotion(
  promotion: ScrapedPromotion,
  interest: string,
): number {
  return scoreInterestAgainstHaystack(
    interest,
    `${promotion.title}\n${promotion.cardText}`,
  );
}

/**
 * Pair watchlist strings with promotions that look relevant (rules-only; no LLM).
 * Stable sort: score desc, then promotion index, then interest.
 */
export function matchPromotionsToWatchlist(
  promotions: ScrapedPromotion[],
  watchlistItems: string[],
  options?: { minScore?: number },
): PromotionWatchlistMatch[] {
  const minScore = options?.minScore ?? 50;
  const interests = [
    ...new Set(
      watchlistItems.map((s) => s.trim()).filter((s) => s.length >= 2),
    ),
  ];
  const out: PromotionWatchlistMatch[] = [];
  for (const promotion of promotions) {
    for (const interest of interests) {
      const score = scoreInterestAgainstPromotion(promotion, interest);
      if (score >= minScore) {
        out.push({ interest, promotion, score });
      }
    }
  }
  out.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (a.promotion.index !== b.promotion.index) {
      return a.promotion.index - b.promotion.index;
    }
    return a.interest.localeCompare(b.interest, "sv");
  });
  return out;
}
