import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import type { LocalActivity } from "@/types/database";

const TYPES = new Set(["museum", "library", "playground", "sport", "nature", "swimming", "workshop", "event", "food", "other"]);
const COSTS = new Set(["free", "low", "medium", "high", "unknown"]);
const WEATHER = new Set(["indoor", "outdoor", "mixed"]);
const ENERGY = new Set(["low", "medium", "high"]);
const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;

function validUrl(value: string | null) {
  if (!value) return true;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}

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

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;
  const body = await request.json() as Record<string, unknown>;
  const title = text(body.title);
  if (!title) return errorResponse("title is required");
  const activityType = text(body.activity_type) ?? "other";
  const costLevel = text(body.cost_level) ?? "unknown";
  const weatherFit = text(body.weather_fit) ?? "mixed";
  const energyLevel = text(body.energy_level) ?? "medium";
  if (!TYPES.has(activityType)) return errorResponse("activity_type is invalid");
  if (!COSTS.has(costLevel)) return errorResponse("cost_level is invalid");
  if (!WEATHER.has(weatherFit)) return errorResponse("weather_fit is invalid");
  if (!ENERGY.has(energyLevel)) return errorResponse("energy_level is invalid");
  const locationUrl = text(body.location_url);
  if (!validUrl(locationUrl)) return errorResponse("location_url must use http or https");
  const tags = Array.isArray(body.tags) ? body.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean).slice(0, 20) : [];
  const key = `${title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "manual"}_${crypto.randomUUID().slice(0, 8)}`;
  const { data, error } = await auth.supabase.from("local_activities").insert({
    source_id: null, activity_key: key, title, description: text(body.description), activity_type: activityType,
    age_min: number(body.age_min), age_max: number(body.age_max), age_notes: text(body.age_notes), address: text(body.address),
    area: text(body.area), location_url: locationUrl, cost_level: costLevel, price_text: text(body.price_text),
    cost_notes: text(body.cost_notes), booking_required: body.booking_required === true, booking_notes: text(body.booking_notes),
    weather_fit: weatherFit, energy_level: energyLevel, usual_duration_minutes: number(body.usual_duration_minutes),
    tags, status: "active", is_evergreen: true, favorite: false,
  }).select("*").single();
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ activity: data as LocalActivity }, { status: 201 });
}
