import { getISOWeekNumber } from "@agent/shared";
import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { makeWeeklyPromotionMergeKey } from "@/lib/weekly-promotions-import";
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

function mergeDuplicatePromotions(
  items: WeeklyPromotionRow[],
  runOrder: Map<string, number>,
): WeeklyPromotionRow[] {
  const sorted = [...items].sort((a, b) => {
    const storeSort = a.store_key.localeCompare(b.store_key, "sv");
    if (storeSort !== 0) {
      return storeSort;
    }
    const runSort = (runOrder.get(a.run_id) ?? 0) - (runOrder.get(b.run_id) ?? 0);
    if (runSort !== 0) {
      return runSort;
    }
    return a.sort_order - b.sort_order;
  });
  const seen = new Set<string>();
  return sorted.filter((item) => {
    const key = makeWeeklyPromotionMergeKey({
      storeKey: item.store_key,
      title: item.title,
    });
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function getCurrentWeekRuns(
  supabase: NonNullable<Awaited<ReturnType<typeof getAuthedSupabase>>["supabase"]>,
  storeKey: string | null,
) {
  const now = new Date();
  let query = supabase
    .from("promotion_import_runs")
    .select("id, created_at, store_key, iso_year, week_number, source, imported_count")
    .eq("iso_year", now.getUTCFullYear())
    .eq("week_number", getISOWeekNumber(now))
    .order("store_key", { ascending: true })
    .order("created_at", { ascending: false });

  if (storeKey) {
    query = query.eq("store_key", storeKey);
  }

  return query;
}

async function getRun(
  supabase: NonNullable<Awaited<ReturnType<typeof getAuthedSupabase>>["supabase"]>,
  runId: string | null,
  storeKey: string | null,
) {
  let query = supabase
    .from("promotion_import_runs")
    .select("id, created_at, store_key, iso_year, week_number, source, imported_count");

  if (runId) {
    query = query.eq("id", runId);
  } else if (storeKey) {
    query = query.eq("store_key", storeKey).order("created_at", { ascending: false }).limit(1);
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
  const storeKey = url.searchParams.get("storeKey")?.trim() || null;
  const scope = url.searchParams.get("scope")?.trim() ?? "";

  if (scope === "current-week") {
    const { data: runs, error: runsError } = await getCurrentWeekRuns(auth.supabase, storeKey);
    if (runsError) {
      return errorResponse(runsError.message, 500);
    }
    const runRows = (runs ?? []) as PromotionImportRunRow[];
    const runIds = runRows.map((run) => run.id);
    if (runIds.length === 0) {
      return NextResponse.json({
        run: null,
        runs: [] satisfies PromotionImportRunRow[],
        items: [] satisfies WeeklyPromotionRow[],
      });
    }

    const { data: items, error: itemsError } = await auth.supabase
      .from("weekly_promotions")
      .select(
        "id, run_id, sort_order, store_key, promotion_index, title, card_text, price_hint, image_url, source_url, category_key, category_name",
      )
      .in("run_id", runIds)
      .order("store_key", { ascending: true })
      .order("sort_order", { ascending: true });

    if (itemsError) {
      return errorResponse(itemsError.message, 500);
    }

    const runOrder = new Map(runRows.map((run, index) => [run.id, index]));
    const mergedItems = mergeDuplicatePromotions((items ?? []) as WeeklyPromotionRow[], runOrder);
    return NextResponse.json({ run: null, runs: runRows, items: mergedItems });
  }

  const { data: run, error: runError } = await getRun(auth.supabase, runId, storeKey);

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
