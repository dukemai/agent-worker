import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import type { LocalActivity } from "@/types/database";

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;

  const { data, error } = await auth.supabase
    .from("local_activities")
    .select(
      "id, source_id, activity_key, title, description, activity_type, age_min, age_max, age_notes, address, area, location_url, cost_level, price_text, cost_notes, booking_required, booking_notes, weather_fit, energy_level, usual_duration_minutes, tags, status, is_evergreen, favorite, created_at, updated_at"
    )
    .order("updated_at", { ascending: false });

  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ activities: (data ?? []) as LocalActivity[] });
}
