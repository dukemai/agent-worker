import { getISOWeekNumber } from "@agent/shared";
import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { makeWeeklyPromotionMergeKey } from "@/lib/weekly-promotions-import";

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

type PromotionRunReference = {
  id: string;
  created_at: string;
  store_key: string;
};

type PromotionRelation =
  | WeeklyPromotionMatchRow["promotion"]
  | NonNullable<WeeklyPromotionMatchRow["promotion"]>[];

type RawWeeklyPromotionMatchRow = Omit<WeeklyPromotionMatchRow, "promotion"> & {
  promotion: PromotionRelation;
};

function normalizePromotionRelation(
  promotion: PromotionRelation,
): WeeklyPromotionMatchRow["promotion"] {
  if (Array.isArray(promotion)) {
    return promotion[0] ?? null;
  }
  return promotion;
}

function normalizeMatchRow(row: RawWeeklyPromotionMatchRow): WeeklyPromotionMatchRow {
  return {
    ...row,
    promotion: normalizePromotionRelation(row.promotion),
  };
}

function mergeDuplicateMatches(
  matches: WeeklyPromotionMatchRow[],
  runOrder: Map<string, number>,
): WeeklyPromotionMatchRow[] {
  const sorted = [...matches].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const runSort = (runOrder.get(a.run_id) ?? 0) - (runOrder.get(b.run_id) ?? 0);
    if (runSort !== 0) {
      return runSort;
    }
    return a.interest.localeCompare(b.interest, "sv");
  });

  const seen = new Set<string>();
  return sorted.filter((match) => {
    const promotion = match.promotion;
    if (!promotion) {
      return true;
    }
    const promotionKey = makeWeeklyPromotionMergeKey({
      storeKey: promotion.store_key,
      title: promotion.title,
    });
    const key = `${promotionKey}|${match.interest.toLocaleLowerCase("sv-SE").trim()}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export async function GET(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const url = new URL(request.url);
  let runId = url.searchParams.get("runId");
  const storeKey = url.searchParams.get("storeKey")?.trim() ?? "";
  const scope = url.searchParams.get("scope")?.trim() ?? "";

  if (scope === "current-week") {
    const now = new Date();
    let runsQuery = auth.supabase
      .from("promotion_import_runs")
      .select("id, created_at, store_key")
      .eq("iso_year", now.getUTCFullYear())
      .eq("week_number", getISOWeekNumber(now))
      .order("store_key", { ascending: true })
      .order("created_at", { ascending: false });

    if (storeKey) {
      runsQuery = runsQuery.eq("store_key", storeKey);
    }

    const { data: runs, error: runsError } = await runsQuery;

    if (runsError) {
      return errorResponse(runsError.message, 500);
    }

    const runRows = (runs ?? []) as PromotionRunReference[];
    const runIds = runRows.map((run) => run.id);
    if (runIds.length === 0) {
      return NextResponse.json({
        runId: null,
        runIds: [] as string[],
        matches: [] satisfies WeeklyPromotionMatchRow[],
      });
    }

    const { data: matches, error } = await auth.supabase
      .from("weekly_promotion_matches")
      .select(
        "id, run_id, promotion_id, interest, score, match_kind, match_reason, promotion:weekly_promotions(id, sort_order, store_key, title, card_text, price_hint, image_url, source_url, category_key, category_name)",
      )
      .in("run_id", runIds)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      return errorResponse(error.message, 500);
    }

    const runOrder = new Map(runRows.map((run, index) => [run.id, index]));
    const normalizedMatches = ((matches ?? []) as unknown as RawWeeklyPromotionMatchRow[]).map(
      normalizeMatchRow,
    );
    const mergedMatches = mergeDuplicateMatches(
      normalizedMatches,
      runOrder,
    );
    return NextResponse.json({ runId: null, runIds, matches: mergedMatches });
  }

  if (!runId) {
    let runQuery = auth.supabase
      .from("promotion_import_runs")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1);
    if (storeKey) {
      runQuery = runQuery.eq("store_key", storeKey);
    }
    const { data: run, error: runError } = await runQuery.maybeSingle();
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

  return NextResponse.json({
    runId,
    matches: ((matches ?? []) as unknown as RawWeeklyPromotionMatchRow[]).map(normalizeMatchRow),
  });
}
