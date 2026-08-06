import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;
  const { id } = await context.params;
  const body = await request.json() as Record<string, unknown>;
  const allowed: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) allowed.title = body.title.trim().slice(0, 200);
  if (["red_day", "school", "family", "closure", "other"].includes(String(body.category))) allowed.category = body.category;
  if (typeof body.starts_on === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.starts_on)) allowed.starts_on = body.starts_on;
  if (body.ends_on === null || body.ends_on === "") allowed.ends_on = null;
  else if (typeof body.ends_on === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.ends_on)) allowed.ends_on = body.ends_on;
  if (typeof body.enabled === "boolean") allowed.enabled = body.enabled;
  if (typeof body.notes === "string" || body.notes === null) allowed.notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) || null : null;
  if (allowed.category === "red_day") allowed.ends_on = null;
  if (Object.keys(allowed).length === 0) return errorResponse("No valid fields");
  const { data, error } = await auth.supabase.from("planning_days").update(allowed).eq("id", id).select("*").single();
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ planning_day: data });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;
  const { id } = await context.params;
  const { error } = await auth.supabase.from("planning_days").delete().eq("id", id);
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ success: true });
}
