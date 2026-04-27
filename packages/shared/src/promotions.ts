export type WeeklyPromotionForMatching = {
  id?: string;
  storeKey: string;
  sourceUrl: string;
  index: number;
  title: string;
  cardText: string;
  priceHint?: string | null;
  imageUrl?: string | null;
};

export type WeeklyPromotionWatchlistMatch<TPromotion extends WeeklyPromotionForMatching> = {
  interest: string;
  promotion: TPromotion;
  /** 0-100; substring hit = 100, all tokens present = 90-99. */
  score: number;
};

function normalizePromotionText(value: string): string {
  return value.toLocaleLowerCase("sv-SE").replace(/\s+/g, " ").trim();
}

export function scoreInterestAgainstPromotionText(
  interest: string,
  haystack: string,
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

  if (normalizedHaystack.includes(needle)) {
    return 100;
  }

  const tokens = needle
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
  if (tokens.length === 0) {
    return 0;
  }

  if (!tokens.every((token) => normalizedHaystack.includes(token))) {
    return 0;
  }

  return Math.min(99, 90 + Math.min(tokens.length, 9));
}

export function scoreInterestAgainstWeeklyPromotion(
  promotion: WeeklyPromotionForMatching,
  interest: string,
): number {
  return scoreInterestAgainstPromotionText(
    interest,
    `${promotion.title}\n${promotion.cardText}`,
  );
}

export function matchWeeklyPromotionsToWatchlist<
  TPromotion extends WeeklyPromotionForMatching,
>(
  promotions: TPromotion[],
  watchlistItems: string[],
  options?: { minScore?: number },
): Array<WeeklyPromotionWatchlistMatch<TPromotion>> {
  const minScore = options?.minScore ?? 50;
  const interests = [
    ...new Set(watchlistItems.map((item) => item.trim()).filter((item) => item.length >= 2)),
  ];

  const matches: Array<WeeklyPromotionWatchlistMatch<TPromotion>> = [];
  for (const promotion of promotions) {
    for (const interest of interests) {
      const score = scoreInterestAgainstWeeklyPromotion(promotion, interest);
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
