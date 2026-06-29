import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import type { SeasonalActivityInstance } from "@/types/database";

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;

  const { data, error } = await auth.supabase
    .from("seasonal_activity_instances")
    .select(
      "id, source_id, activity_id, instance_key, season, title, description, valid_from, valid_until, occurrence_dates, time_text, address, area, cost_level, price_text, cost_notes, booking_required, booking_deadline, booking_url, weather_fit, energy_level, age_min, age_max, age_notes, tags, status, favorite, extraction_confidence, created_at, updated_at, activity:local_activities(id, title, activity_type, is_evergreen)"
    )
    .order("valid_from", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ instances: (data ?? []) as unknown as SeasonalActivityInstance[] });
}
