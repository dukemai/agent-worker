/**
 * Validate `watchlist-matches-only.json` from Playwright (`interests` + `matches`).
 */

export type PromoMatchPromotion = {
  storeKey: string;
  sourceUrl: string;
  index: number;
  title: string;
  cardText: string;
  imageUrl?: string;
  priceHint?: string;
};

export type PromoMatchEntry = {
  interest: string;
  score: number;
  promotion: PromoMatchPromotion;
};

export type WatchlistMatchesOnlyPayload = {
  interests: string[];
  matches: PromoMatchEntry[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isPromotion(v: unknown): v is PromoMatchPromotion {
  if (!isRecord(v)) {
    return false;
  }
  return (
    typeof v.storeKey === "string" &&
    v.storeKey.length > 0 &&
    typeof v.sourceUrl === "string" &&
    v.sourceUrl.length > 0 &&
    typeof v.index === "number" &&
    Number.isFinite(v.index) &&
    typeof v.title === "string" &&
    typeof v.cardText === "string"
  );
}

function isMatchEntry(v: unknown): v is PromoMatchEntry {
  if (!isRecord(v)) {
    return false;
  }
  if (typeof v.interest !== "string" || typeof v.score !== "number") {
    return false;
  }
  return isPromotion(v.promotion);
}

export function parseWatchlistMatchesOnlyJson(raw: unknown):
  | { ok: true; data: WatchlistMatchesOnlyPayload }
  | { ok: false; error: string } {
  if (!isRecord(raw)) {
    return { ok: false, error: "Root must be a JSON object" };
  }

  const interests = raw.interests;
  if (!Array.isArray(interests)) {
    return { ok: false, error: "Missing or invalid interests array" };
  }
  const cleanedInterests = interests
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (cleanedInterests.length !== interests.length) {
    return { ok: false, error: "Each interest must be a non-empty string" };
  }

  const matches = raw.matches;
  if (!Array.isArray(matches)) {
    return { ok: false, error: "Missing or invalid matches array" };
  }
  const cleanedMatches: PromoMatchEntry[] = [];
  for (let i = 0; i < matches.length; i++) {
    if (!isMatchEntry(matches[i])) {
      return {
        ok: false,
        error: `matches[${i}] has invalid shape (need interest, score, promotion with storeKey, sourceUrl, index, title, cardText)`,
      };
    }
    cleanedMatches.push(matches[i]);
  }

  return {
    ok: true,
    data: { interests: cleanedInterests, matches: cleanedMatches },
  };
}
