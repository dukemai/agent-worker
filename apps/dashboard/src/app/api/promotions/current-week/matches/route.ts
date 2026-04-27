import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

export type WeeklyPromotionMatchRow = {
  id: string;
  run_id: string;
  promotion_id: string;
  interest: string;
  score: number;
  match_kind: string;
  match_reason: string | null;
  promotion: {
    id: string;
    sort_order: number;
    store_key: string;
    title: string;
    card_text: string;
    price_hint: string | null;
    image_url: string | null;
    source_url: string;
    category_key: string | null;
    category_name: string | null;
  } | null;
};

export async function GET(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const url = new URL(request.url);
  let runId = url.searchParams.get("runId");
  if (!runId) {
    const { data: run, error: runError } = await auth.supabase
      .from("promotion_import_runs")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (runError) {
      return errorResponse(runError.message, 500);
    }
    runId = run?.id ?? null;
  }

  if (!runId) {
    return NextResponse.json({ runId: null, matches: [] satisfies WeeklyPromotionMatchRow[] });
  }

  const { data: matches, error } = await auth.supabase
    .from("weekly_promotion_matches")
    .select(
      "id, run_id, promotion_id, interest, score, match_kind, match_reason, promotion:weekly_promotions(id, sort_order, store_key, title, card_text, price_hint, image_url, source_url, category_key, category_name)",
    )
    .eq("run_id", runId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ runId, matches: matches ?? [] });
}
