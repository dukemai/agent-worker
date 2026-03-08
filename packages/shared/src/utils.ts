/**
 * ISO date string (YYYY-MM-DD) for Monday of the given week (UTC).
 * Used for growing_suggestions_log week_start_date and other week-based logic.
 */
export function getWeekStartDate(now = new Date()): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

/**
 * Extracts a source URL from a Supabase relation value (e.g. source:growing_sources(url)).
 * Handles both a single object { url } and an array of such objects (returns the first).
 * Returns null if value is falsy or no string url is present.
 */
export function resolveRelatedSourceUrl(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    const first = value[0] as { url?: unknown } | undefined;
    return typeof first?.url === "string" ? first.url : null;
  }

  const objectValue = value as { url?: unknown };
  return typeof objectValue.url === "string" ? objectValue.url : null;
}
