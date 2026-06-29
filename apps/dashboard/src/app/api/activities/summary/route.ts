import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import type { LocalActivity, SeasonalActivityInstance } from "@/types/database";

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isSeasonalRelevant(item: SeasonalActivityInstance, start: string, end: string): boolean {
  if (item.occurrence_dates.some((date) => date >= start && date <= end)) return true;
  const validFrom = item.valid_from ?? start;
  const validUntil = item.valid_until ?? end;
  return validFrom <= end && validUntil >= start;
}

function isSeasonalStillActionable(item: SeasonalActivityInstance, today: string): boolean {
  if (item.occurrence_dates.length > 0) {
    return item.occurrence_dates.some((date) => date >= today);
  }
  if (item.valid_until) {
    return item.valid_until >= today;
  }
  if (item.valid_from) {
    return item.valid_from >= today;
  }
  return true;
}

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;

  const today = ymd(new Date());
  const weekEnd = ymd(addDays(new Date(), 6));

  const [seasonalResult, evergreenResult] = await Promise.all([
    auth.supabase
      .from("seasonal_activity_instances")
      .select(
        "id, source_id, activity_id, instance_key, season, title, description, valid_from, valid_until, occurrence_dates, time_text, address, area, cost_level, price_text, cost_notes, booking_required, booking_deadline, booking_url, weather_fit, energy_level, age_min, age_max, age_notes, tags, status, favorite, extraction_confidence, created_at, updated_at, activity:local_activities(id, title, activity_type, is_evergreen)"
      )
      .eq("status", "active")
      .order("valid_from", { ascending: true, nullsFirst: false })
      .limit(80),
    auth.supabase
      .from("local_activities")
      .select(
        "id, source_id, activity_key, title, description, activity_type, age_min, age_max, age_notes, address, area, location_url, cost_level, price_text, cost_notes, booking_required, booking_notes, weather_fit, energy_level, usual_duration_minutes, tags, status, is_evergreen, favorite, created_at, updated_at"
      )
      .eq("status", "active")
      .eq("is_evergreen", true)
      .order("updated_at", { ascending: false })
      .limit(40),
  ]);

  if (seasonalResult.error) return errorResponse(seasonalResult.error.message, 500);
  if (evergreenResult.error) return errorResponse(evergreenResult.error.message, 500);

  const seasonal = (seasonalResult.data ?? []) as unknown as SeasonalActivityInstance[];
  const evergreen = (evergreenResult.data ?? []) as LocalActivity[];
  const thisWeek = seasonal.filter((item) => isSeasonalRelevant(item, today, weekEnd)).slice(0, 12);

  return NextResponse.json({
    today,
    week_end: weekEnd,
    today_items: seasonal.filter((item) => isSeasonalRelevant(item, today, today)).slice(0, 8),
    this_week: thisWeek,
    rainy_day: [
      ...thisWeek.filter((item) => item.weather_fit === "indoor" || item.weather_fit === "mixed"),
      ...evergreen.filter((item) => item.weather_fit === "indoor" || item.weather_fit === "mixed"),
    ].slice(0, 8),
    needs_booking: seasonal
      .filter((item) => item.booking_required)
      .filter((item) => !item.booking_deadline || item.booking_deadline >= today)
      .filter((item) => isSeasonalStillActionable(item, today))
      .sort((a, b) => (a.booking_deadline ?? "9999-12-31").localeCompare(b.booking_deadline ?? "9999-12-31"))
      .slice(0, 8),
    evergreen: evergreen.slice(0, 8),
  });
}
