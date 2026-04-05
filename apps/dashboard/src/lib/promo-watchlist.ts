export const PROMO_WATCHLIST_KEY = "promo_watchlist";
export const MAX_PROMO_WATCHLIST_ITEMS = 50;

/** Parse `family_context.value` (JSON string of string array). */
export function parsePromoWatchlistValue(raw: string | null | undefined): string[] {
  if (raw == null || raw.trim() === "") {
    return [];
  }
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) {
      return [];
    }
    return v
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** Unique, trimmed, capped; serializes to JSON string for `family_context.value`. */
export function serializePromoWatchlist(items: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of items) {
    const s = t.trim();
    if (!s || seen.has(s)) {
      continue;
    }
    seen.add(s);
    out.push(s);
    if (out.length >= MAX_PROMO_WATCHLIST_ITEMS) {
      break;
    }
  }
  return JSON.stringify(out);
}
