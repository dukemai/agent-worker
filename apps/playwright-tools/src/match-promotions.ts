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

type PromotionMatchRule = {
  aliases: string[];
  blockedTerms?: string[];
  allowedCategoryTerms?: string[];
};

const PROMOTION_MATCH_RULES: Record<string, PromotionMatchRule> = {
  "ägg": {
    aliases: ["ägg"],
    blockedTerms: ["vägg", "lägg"],
    allowedCategoryTerms: ["ägg", "mejeri", "ost"],
  },
  "svamp": {
    aliases: ["svamp", "champinjon", "champinjoner", "portabello", "skogschampinjon"],
    blockedTerms: ["rengöringssvamp", "disksvamp", "tvättsvamp"],
    allowedCategoryTerms: ["svamp", "frukt", "grönt", "färskvaror"],
  },
  "smör": {
    aliases: ["smör"],
    blockedTerms: ["smörgås", "smörgåsmat"],
    allowedCategoryTerms: ["smör", "margarin", "mejeri", "ost"],
  },
};

function tokens(s: string): string[] {
  return normalize(s)
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.trim())
    .filter(Boolean);
}

function phraseAppearsAsTokens(phrase: string, haystackTokens: string[]): boolean {
  const phraseTokens = tokens(phrase);
  if (phraseTokens.length === 0 || phraseTokens.length > haystackTokens.length) {
    return false;
  }

  for (let i = 0; i <= haystackTokens.length - phraseTokens.length; i += 1) {
    if (phraseTokens.every((token, offset) => haystackTokens[i + offset] === token)) {
      return true;
    }
  }

  return false;
}

function categoryMatchesRule(rule: PromotionMatchRule, categoryText?: string): boolean {
  if (!categoryText || !rule.allowedCategoryTerms?.length) {
    return true;
  }
  const normalizedCategoryText = normalize(categoryText);
  return rule.allowedCategoryTerms.some((term) => normalizedCategoryText.includes(normalize(term)));
}

function ruleForInterest(interest: string): PromotionMatchRule | null {
  return PROMOTION_MATCH_RULES[normalize(interest)] ?? null;
}

function tokenMatchesPromotionText(
  token: string,
  haystackTokens: string[],
  normalizedHaystack: string,
): boolean {
  return phraseAppearsAsTokens(token, haystackTokens) || (token.length >= 4 && normalizedHaystack.includes(token));
}

function aliasMatchesPromotionText(
  alias: string,
  haystackTokens: string[],
  normalizedHaystack: string,
): boolean {
  const normalizedAlias = normalize(alias);
  return phraseAppearsAsTokens(normalizedAlias, haystackTokens) ||
    (normalizedAlias.length >= 4 && normalizedHaystack.includes(normalizedAlias));
}

/**
 * Score how well `interest` matches normalized haystack (same rules as promotions).
 * - Catalog-backed aliases as whole tokens → 100.
 * - Full phrase as whole tokens or a long compound-safe substring (after normalize) → 100.
 * - Otherwise: split into tokens (length ≥ 2); if every token appears as a whole token or long compound-safe substring → 90 + min(9, token count) (cap 99).
 */
export function scoreInterestAgainstHaystack(
  interest: string,
  haystack: string,
  options?: { categoryText?: string },
): number {
  const raw = interest.trim();
  if (raw.length < 2) {
    return 0;
  }
  const h = normalize(haystack);
  const needle = normalize(raw);
  if (needle.length < 2) {
    return 0;
  }
  const rule = ruleForInterest(needle);
  const haystackTokens = tokens(h);
  if (rule) {
    if (!categoryMatchesRule(rule, options?.categoryText)) {
      return 0;
    }
    if (
      rule.blockedTerms?.some((term) => phraseAppearsAsTokens(term, haystackTokens) || h.includes(normalize(term)))
    ) {
      return 0;
    }
    if (rule.aliases.some((alias) => aliasMatchesPromotionText(alias, haystackTokens, h))) {
      return 100;
    }
    return 0;
  } else if (phraseAppearsAsTokens(needle, haystackTokens)) {
    return 100;
  } else if (needle.length >= 4 && h.includes(needle)) {
    return 100;
  }
  const needleTokens = needle
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  if (needleTokens.length === 0) {
    return 0;
  }
  const allHit = needleTokens.every((t) => tokenMatchesPromotionText(t, haystackTokens, h));
  if (!allHit) {
    return 0;
  }
  return Math.min(99, 90 + Math.min(needleTokens.length, 9));
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
    { categoryText: [promotion.categoryKey, promotion.categoryName].filter(Boolean).join(" ") },
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
