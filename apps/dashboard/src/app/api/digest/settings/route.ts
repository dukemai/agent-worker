import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

const text = (value: unknown, max = 200) => typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
const integer = (value: unknown, min: number, max: number) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
};
const monthDay = (value: unknown) => typeof value === "string" && /^\d{2}-\d{2}$/.test(value) ? value : null;

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;
  const [preferencesResult, daysResult] = await Promise.all([
    auth.supabase.from("digest_preferences").select("*").eq("singleton", true).maybeSingle(),
    auth.supabase.from("planning_days").select("*").order("starts_on", { ascending: true }),
  ]);
  if (preferencesResult.error) return errorResponse(preferencesResult.error.message, 500);
  if (daysResult.error) return errorResponse(daysResult.error.message, 500);
  return NextResponse.json({ preferences: preferencesResult.data, planning_days: daysResult.data ?? [] });
}

export async function PUT(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;
  const body = await request.json() as Record<string, unknown>;
  const payload = {
    singleton: true,
    red_day_lead_days: integer(body.red_day_lead_days, 1, 90),
    high_growth_start: monthDay(body.high_growth_start),
    high_growth_end: monthDay(body.high_growth_end),
    harvest_start: monthDay(body.harvest_start),
    harvest_end: monthDay(body.harvest_end),
  };
  if (Object.values(payload).some((value) => value === null)) return errorResponse("Invalid digest preferences");
  const { data, error } = await auth.supabase.from("digest_preferences").upsert(payload).select("*").single();
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ preferences: data });
}

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;
  const body = await request.json() as Record<string, unknown>;
  const title = text(body.title);
  const category = ["red_day", "school", "family", "closure", "other"].includes(String(body.category)) ? String(body.category) : null;
  const startsOn = typeof body.starts_on === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.starts_on) ? body.starts_on : null;
  const endsOn = body.ends_on === null || body.ends_on === "" ? null : typeof body.ends_on === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.ends_on) ? body.ends_on : undefined;
  if (!title || !category || !startsOn || endsOn === undefined) return errorResponse("Invalid planning day");
  const { data, error } = await auth.supabase.from("planning_days").insert({ title, category, starts_on: startsOn, ends_on: category === "red_day" ? null : endsOn, enabled: body.enabled !== false, notes: text(body.notes, 1000) }).select("*").single();
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ planning_day: data }, { status: 201 });
}
