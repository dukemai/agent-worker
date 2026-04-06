import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

export type PromoMatchItemRow = {
  id: string;
  sort_order: number;
  week_number: number;
  interest: string;
  score: number;
  promotion_index: number | null;
  title: string;
  card_text: string | null;
  price_hint: string | null;
  image_url: string | null;
  source_url: string;
  store_key: string;
};

export type PromoMatchRunRow = {
  id: string;
  created_at: string;
  store_key: string;
  interests: unknown;
};

/** Latest imported weekly promo match run + items (by created_at). */
export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { data: run, error: runErr } = await auth.supabase
    .from("promo_match_runs")
    .select("id, created_at, store_key, interests")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (runErr) {
    return errorResponse(runErr.message, 500);
  }

  if (!run) {
    return NextResponse.json({ run: null, items: [] satisfies PromoMatchItemRow[] });
  }

  const { data: items, error: itemsErr } = await auth.supabase
    .from("promo_match_items")
    .select(
      "id, sort_order, week_number, interest, score, promotion_index, title, card_text, price_hint, image_url, source_url, store_key",
    )
    .eq("run_id", run.id)
    .order("sort_order", { ascending: true });

  if (itemsErr) {
    return errorResponse(itemsErr.message, 500);
  }

  return NextResponse.json({
    run,
    items: items ?? [],
  });
}
