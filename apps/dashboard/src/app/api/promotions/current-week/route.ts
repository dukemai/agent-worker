import { getISOWeekNumber } from "@agent/shared";
import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

export type PromotionImportRunRow = {
  id: string;
  created_at: string;
  store_key: string;
  iso_year: number;
  week_number: number;
  source: string;
  imported_count: number;
};

export async function GET(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const url = new URL(request.url);
  const storeKey = url.searchParams.get("storeKey")?.trim() ?? "";
  let query = auth.supabase
    .from("promotion_import_runs")
    .select("id, created_at, store_key, iso_year, week_number, source, imported_count")
    .order("created_at", { ascending: false })
    .limit(1);

  if (storeKey) {
    query = query.eq("store_key", storeKey);
  }

  const { data: run, error } = await query.maybeSingle();

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ run: run ?? null });
}

export async function DELETE(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const url = new URL(request.url);
  const storeKey = url.searchParams.get("storeKey")?.trim() ?? "";
  const now = new Date();

  let runsQuery = auth.supabase
    .from("promotion_import_runs")
    .select("id")
    .eq("iso_year", now.getUTCFullYear())
    .eq("week_number", getISOWeekNumber(now));

  if (storeKey) {
    runsQuery = runsQuery.eq("store_key", storeKey);
  }

  const { data: runs, error: runsError } = await runsQuery;
  if (runsError) {
    return errorResponse(runsError.message, 500);
  }

  const runIds = (runs ?? []).map((run) => run.id);
  if (runIds.length === 0) {
    return NextResponse.json({
      deleted: true,
      deletedRunCount: 0,
      storeKey: storeKey || null,
    });
  }

  const { error: deleteError } = await auth.supabase
    .from("promotion_import_runs")
    .delete()
    .in("id", runIds);

  if (deleteError) {
    return errorResponse(deleteError.message, 500);
  }

  return NextResponse.json({
    deleted: true,
    deletedRunCount: runIds.length,
    storeKey: storeKey || null,
  });
}
