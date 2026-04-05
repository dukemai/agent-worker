import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * `family_context.value` for key `promo_watchlist`:
 * - JSON array of strings: `["kycklingfilé", "smör"]`
 * - or plain text: one item per line (or comma-separated)
 */
function parseWatchlistValue(value: string | null): string[] {
  const raw = value?.trim();
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((x): x is string => typeof x === "string")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  } catch {
    /* treat as plain text */
  }
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Machine-readable promo watchlist for local scrapers (Playwright, etc.).
 * Auth: `Authorization: Bearer ${SCRAPE_SYNC_SECRET}` (set in dashboard env).
 * Requires `SUPABASE_SERVICE_ROLE_KEY` to read `family_context` without a browser session.
 */
export async function GET(request: Request) {
  const syncSecret = process.env.SCRAPE_SYNC_SECRET;
  if (!syncSecret) {
    return NextResponse.json(
      { error: "SCRAPE_SYNC_SECRET is not configured" },
      { status: 500 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  if (header !== `Bearer ${syncSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const missingEnv: string[] = [];
  if (!url?.trim()) missingEnv.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceKey?.trim()) missingEnv.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missingEnv.length > 0) {
    return NextResponse.json(
      {
        error: "Supabase server env not configured for scrape export",
        missingEnv,
      },
      { status: 500 },
    );
  }

  const supabase = createClient(url, serviceKey);
  const { data, error } = await supabase
    .from("family_context")
    .select("key, value, last_updated")
    .eq("key", "promo_watchlist")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = parseWatchlistValue(data?.value ?? null);

  return NextResponse.json({
    contextKey: "promo_watchlist",
    items,
    lastUpdated: data?.last_updated ?? null,
    fetchedAt: new Date().toISOString(),
  });
}
