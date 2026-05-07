import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

export type PromotionStoreOption = {
  store_key: string;
  latest_import_at: string;
  latest_iso_year: number;
  latest_week_number: number;
  latest_imported_count: number;
};

type PromotionImportRunForStore = {
  store_key: string;
  created_at: string;
  iso_year: number;
  week_number: number;
  imported_count: number;
};

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { data, error } = await auth.supabase
    .from("promotion_import_runs")
    .select("store_key, created_at, iso_year, week_number, imported_count")
    .order("created_at", { ascending: false });

  if (error) {
    return errorResponse(error.message, 500);
  }

  const stores = new Map<string, PromotionStoreOption>();
  for (const row of (data ?? []) as PromotionImportRunForStore[]) {
    const key = row.store_key.trim();
    if (!key || stores.has(key)) {
      continue;
    }
    stores.set(key, {
      store_key: key,
      latest_import_at: row.created_at,
      latest_iso_year: row.iso_year,
      latest_week_number: row.week_number,
      latest_imported_count: row.imported_count,
    });
  }

  return NextResponse.json({ stores: [...stores.values()] });
}
