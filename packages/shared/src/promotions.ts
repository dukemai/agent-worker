export type WeeklyPromotionForMatching = {
  id?: string;
  storeKey: string;
  sourceUrl: string;
  index: number;
  title: string;
  cardText: string;
  categoryKey?: string | null;
  categoryName?: string | null;
  priceHint?: string | null;
  imageUrl?: string | null;
};

export type WeeklyPromotionWatchlistMatch<TPromotion extends WeeklyPromotionForMatching> = {
  interest: string;
  promotion: TPromotion;
  /** 0-100; exact/rule hit = 100, all tokens present = 90-99. */
  score: number;
};

function normalizePromotionText(value: string): string {
  return value.toLocaleLowerCase("sv-SE").replace(/\s+/g, " ").trim();
}

export type WeeklyPromotionMatchRule = {
  aliases: string[];
  blockedTerms?: string[];
  allowedCategoryTerms?: string[];
};

export type WeeklyPromotionMatchRulesByInterest = Record<string, WeeklyPromotionMatchRule>;

const DEFAULT_PROMOTION_MATCH_RULES: WeeklyPromotionMatchRulesByInterest = {
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
};

function promotionTextTokens(value: string): string[] {
  return normalizePromotionText(value)
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter(Boolean);
}

function phraseAppearsAsTokens(phrase: string, haystackTokens: string[]): boolean {
  const phraseTokens = promotionTextTokens(phrase);
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

function categoryMatchesRule(
  rule: WeeklyPromotionMatchRule,
  categoryText?: string | null,
): boolean {
  if (!categoryText || !rule.allowedCategoryTerms?.length) {
    return true;
  }

  const normalizedCategoryText = normalizePromotionText(categoryText);
  return rule.allowedCategoryTerms.some((term) =>
    normalizedCategoryText.includes(normalizePromotionText(term)),
  );
}

function ruleForInterest(
  interest: string,
  rulesByInterest?: WeeklyPromotionMatchRulesByInterest,
): WeeklyPromotionMatchRule | null {
  const normalizedInterest = normalizePromotionText(interest);
  return rulesByInterest?.[normalizedInterest] ?? DEFAULT_PROMOTION_MATCH_RULES[normalizedInterest] ?? null;
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
  const normalizedAlias = normalizePromotionText(alias);
  return phraseAppearsAsTokens(normalizedAlias, haystackTokens) ||
    (normalizedAlias.length >= 4 && normalizedHaystack.includes(normalizedAlias));
}

export function scoreInterestAgainstPromotionText(
  interest: string,
  haystack: string,
  options?: {
    categoryText?: string | null;
    matchRulesByInterest?: WeeklyPromotionMatchRulesByInterest;
  },
): number {
  const raw = interest.trim();
  if (raw.length < 2) {
    return 0;
  }

  const normalizedHaystack = normalizePromotionText(haystack);
  const needle = normalizePromotionText(raw);
  if (needle.length < 2) {
    return 0;
  }

  const rule = ruleForInterest(needle, options?.matchRulesByInterest);
  const haystackTokens = promotionTextTokens(normalizedHaystack);
  if (rule) {
    if (!categoryMatchesRule(rule, options?.categoryText)) {
      return 0;
    }
    if (
      rule.blockedTerms?.some((term) =>
        phraseAppearsAsTokens(term, haystackTokens) || normalizedHaystack.includes(normalizePromotionText(term)),
      )
    ) {
      return 0;
    }
    if (rule.aliases.some((alias) => aliasMatchesPromotionText(alias, haystackTokens, normalizedHaystack))) {
      return 100;
    }
    return 0;
  } else if (phraseAppearsAsTokens(needle, haystackTokens)) {
    return 100;
  } else if (needle.length >= 4 && normalizedHaystack.includes(needle)) {
    return 100;
  }

  const tokens = needle
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
  if (tokens.length === 0) {
    return 0;
  }

  if (!tokens.every((token) => tokenMatchesPromotionText(token, haystackTokens, normalizedHaystack))) {
    return 0;
  }

  return Math.min(99, 90 + Math.min(tokens.length, 9));
}

export function scoreInterestAgainstWeeklyPromotion(
  promotion: WeeklyPromotionForMatching,
  interest: string,
  options?: { matchRulesByInterest?: WeeklyPromotionMatchRulesByInterest },
): number {
  return scoreInterestAgainstPromotionText(
    interest,
    `${promotion.title}\n${promotion.cardText}`,
    {
      categoryText: [promotion.categoryKey, promotion.categoryName].filter(Boolean).join(" "),
      matchRulesByInterest: options?.matchRulesByInterest,
    },
  );
}

export function matchWeeklyPromotionsToWatchlist<
  TPromotion extends WeeklyPromotionForMatching,
>(
  promotions: TPromotion[],
  watchlistItems: string[],
  options?: {
    minScore?: number;
    matchRulesByInterest?: WeeklyPromotionMatchRulesByInterest;
  },
): Array<WeeklyPromotionWatchlistMatch<TPromotion>> {
  const minScore = options?.minScore ?? 50;
  const interests = [
    ...new Set(watchlistItems.map((item) => item.trim()).filter((item) => item.length >= 2)),
  ];

  const matches: Array<WeeklyPromotionWatchlistMatch<TPromotion>> = [];
  for (const promotion of promotions) {
    for (const interest of interests) {
      const score = scoreInterestAgainstWeeklyPromotion(promotion, interest, {
        matchRulesByInterest: options?.matchRulesByInterest,
      });
      if (score >= minScore) {
        matches.push({ interest, promotion, score });
      }
    }
  }

  matches.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (a.promotion.index !== b.promotion.index) {
      return a.promotion.index - b.promotion.index;
    }
    return a.interest.localeCompare(b.interest, "sv");
  });

  return matches;
}
