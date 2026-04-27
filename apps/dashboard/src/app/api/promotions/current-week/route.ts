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

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { data: run, error } = await auth.supabase
    .from("promotion_import_runs")
    .select("id, created_at, store_key, iso_year, week_number, source, imported_count")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ run: run ?? null });
}
