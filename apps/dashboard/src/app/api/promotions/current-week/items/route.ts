import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import type { PromotionImportRunRow } from "../route";

export type WeeklyPromotionRow = {
  id: string;
  run_id: string;
  sort_order: number;
  store_key: string;
  promotion_index: number | null;
  title: string;
  card_text: string;
  price_hint: string | null;
  image_url: string | null;
  source_url: string;
  category_key: string | null;
  category_name: string | null;
};

async function getRun(supabase: NonNullable<Awaited<ReturnType<typeof getAuthedSupabase>>["supabase"]>, runId: string | null) {
  let query = supabase
    .from("promotion_import_runs")
    .select("id, created_at, store_key, iso_year, week_number, source, imported_count");

  if (runId) {
    query = query.eq("id", runId);
  } else {
    query = query.order("created_at", { ascending: false }).limit(1);
  }

  return query.maybeSingle();
}

export async function GET(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const url = new URL(request.url);
  const runId = url.searchParams.get("runId");
  const { data: run, error: runError } = await getRun(auth.supabase, runId);

  if (runError) {
    return errorResponse(runError.message, 500);
  }
  if (!run) {
    return NextResponse.json({ run: null, items: [] satisfies WeeklyPromotionRow[] });
  }

  const { data: items, error: itemsError } = await auth.supabase
    .from("weekly_promotions")
    .select(
      "id, run_id, sort_order, store_key, promotion_index, title, card_text, price_hint, image_url, source_url, category_key, category_name",
    )
    .eq("run_id", (run as PromotionImportRunRow).id)
    .order("sort_order", { ascending: true });

  if (itemsError) {
    return errorResponse(itemsError.message, 500);
  }

  return NextResponse.json({ run, items: items ?? [] });
}
