export const PROMO_WATCHLIST_KEY = "promo_watchlist";
export const MAX_PROMO_WATCHLIST_ITEMS = 50;

/** Loads watchlist strings from `family_context` (same source as Promo grocery watchlist). */
export async function fetchPromoWatchlist(): Promise<string[]> {
  const response = await fetch(`/api/context/${encodeURIComponent(PROMO_WATCHLIST_KEY)}`, {
    cache: "no-store",
  });
  if (response.status === 404) {
    return [];
  }
  if (!response.ok) {
    const json = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(json.error ?? "Failed to load watchlist");
  }
  const row = (await response.json()) as { value: string };
  return parsePromoWatchlistValue(row.value);
}

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
