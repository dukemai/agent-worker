import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import type { SeasonalActivityInstance } from "@/types/database";

const COSTS = new Set(["free", "low", "medium", "high", "unknown"]);
const WEATHER = new Set(["indoor", "outdoor", "mixed"]);
const ENERGY = new Set(["low", "medium", "high"]);
const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
const date = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;

function validUrl(value: string | null) {
  if (!value) return true;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}

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

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;
  const body = await request.json() as Record<string, unknown>;
  const title = text(body.title);
  if (!title) return errorResponse("title is required");
  const costLevel = text(body.cost_level) ?? "unknown";
  const weatherFit = text(body.weather_fit) ?? "mixed";
  const energyLevel = text(body.energy_level) ?? "medium";
  if (!COSTS.has(costLevel)) return errorResponse("cost_level is invalid");
  if (!WEATHER.has(weatherFit)) return errorResponse("weather_fit is invalid");
  if (!ENERGY.has(energyLevel)) return errorResponse("energy_level is invalid");
  const bookingUrl = text(body.booking_url);
  if (!validUrl(bookingUrl)) return errorResponse("booking_url must use http or https");
  const validFrom = date(body.valid_from);
  const validUntil = date(body.valid_until);
  if (!validFrom && !validUntil) return errorResponse("At least one date is required");
  if (validFrom && validUntil && validFrom > validUntil) return errorResponse("valid_from must not be after valid_until");
  const tags = Array.isArray(body.tags) ? body.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean).slice(0, 20) : [];
  const key = `manual_${crypto.randomUUID()}`;
  const { data, error } = await auth.supabase.from("seasonal_activity_instances").insert({
    source_id: null, activity_id: null, instance_key: key, season: text(body.season) ?? "summer_2026", title,
    description: text(body.description), valid_from: validFrom, valid_until: validUntil,
    occurrence_dates: validFrom && validFrom === validUntil ? [validFrom] : [], time_text: text(body.time_text),
    address: text(body.address), area: text(body.area), cost_level: costLevel, price_text: text(body.price_text),
    cost_notes: text(body.cost_notes), booking_required: body.booking_required === true,
    booking_deadline: date(body.booking_deadline), booking_url: bookingUrl, weather_fit: weatherFit, energy_level: energyLevel,
    age_min: number(body.age_min), age_max: number(body.age_max), age_notes: text(body.age_notes), tags,
    status: "active", favorite: false, extraction_confidence: "high",
  }).select("*").single();
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ instance: data as SeasonalActivityInstance }, { status: 201 });
}
