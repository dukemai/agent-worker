import { matchWeeklyPromotionsToWatchlist, type WeeklyPromotionForMatching } from "@agent/shared";
import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { parsePromoWatchlistValue, PROMO_WATCHLIST_KEY } from "@/lib/promo-watchlist";

type FilterBody = {
  runId?: unknown;
  storeKey?: unknown;
};

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  let body: FilterBody = {};
  try {
    body = (await request.json()) as FilterBody;
  } catch {
    body = {};
  }

  let runId = typeof body.runId === "string" && body.runId.trim() ? body.runId.trim() : null;
  if (!runId) {
    const storeKey = typeof body.storeKey === "string" ? body.storeKey.trim() : "";
    let runQuery = auth.supabase
      .from("promotion_import_runs")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1);
    if (storeKey) {
      runQuery = runQuery.eq("store_key", storeKey);
    }
    const { data: latestRun, error: runError } = await runQuery.maybeSingle();
    if (runError) {
      return errorResponse(runError.message, 500);
    }
    runId = latestRun?.id ?? null;
  }

  if (!runId) {
    return errorResponse("No weekly promotion import found", 404);
  }

  const { data: contextRow, error: contextError } = await auth.supabase
    .from("family_context")
    .select("value")
    .eq("key", PROMO_WATCHLIST_KEY)
    .maybeSingle();
  if (contextError) {
    return errorResponse(contextError.message, 500);
  }

  const watchlist = parsePromoWatchlistValue(contextRow?.value);
  if (watchlist.length === 0) {
    await auth.supabase.from("weekly_promotion_matches").delete().eq("run_id", runId);
    return NextResponse.json({ runId, matchCount: 0, watchlistCount: 0 });
  }

  const { data: promotionRows, error: promotionsError } = await auth.supabase
    .from("weekly_promotions")
    .select("id, sort_order, store_key, source_url, promotion_index, title, card_text, price_hint, image_url")
    .eq("run_id", runId)
    .order("sort_order", { ascending: true });
  if (promotionsError) {
    return errorResponse(promotionsError.message, 500);
  }

  const promotions = (promotionRows ?? []).map((row) => ({
    id: row.id,
    storeKey: row.store_key,
    sourceUrl: row.source_url,
    index: typeof row.promotion_index === "number" ? row.promotion_index : row.sort_order,
    title: row.title,
    cardText: row.card_text ?? "",
    priceHint: row.price_hint,
    imageUrl: row.image_url,
  })) satisfies WeeklyPromotionForMatching[];

  const matches = matchWeeklyPromotionsToWatchlist(promotions, watchlist, { minScore: 50 });

  const { error: deleteError } = await auth.supabase
    .from("weekly_promotion_matches")
    .delete()
    .eq("run_id", runId);
  if (deleteError) {
    return errorResponse(deleteError.message, 500);
  }

  if (matches.length > 0) {
    const { error: insertError } = await auth.supabase.from("weekly_promotion_matches").insert(
      matches.map((match) => ({
        run_id: runId,
        promotion_id: match.promotion.id,
        interest: match.interest,
        score: match.score,
        match_kind: "watchlist",
        match_reason:
          match.score === 100
            ? "Watchlist phrase appears in the offer text."
            : "All watchlist words appear in the offer text.",
      })),
    );
    if (insertError) {
      return errorResponse(insertError.message, 500);
    }
  }

  return NextResponse.json({
    runId,
    matchCount: matches.length,
    watchlistCount: watchlist.length,
    promotionCount: promotions.length,
  });
}
