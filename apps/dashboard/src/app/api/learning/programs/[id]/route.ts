import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
type Params = { params: Promise<{ id: string }> };
export async function GET(_: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;
  const { id } = await params;
  const { data, error } = await auth.supabase.from("learning_programs").select("*, days:learning_program_days(*)").eq("id", id).maybeSingle();
  if (error) return errorResponse(error.message, 500);
  if (!data) return errorResponse("Program not found", 404);
  data.days.sort((a: { day_number: number }, b: { day_number: number }) => a.day_number - b.day_number);
  return NextResponse.json({ program: data });
}
export async function PATCH(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;
  const { id } = await params;
  const payload = await request.json().catch(() => null);
  if (!payload || !["active", "paused", "archived"].includes(payload.status)) return errorResponse("status must be active, paused, or archived");
  const { data, error } = await auth.supabase.from("learning_programs").update({ status: payload.status }).eq("id", id).select("*").maybeSingle();
  if (error) return errorResponse(error.message, 500);
  if (!data) return errorResponse("Program not found", 404);
  return NextResponse.json({ program: data });
}
export async function DELETE(_: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;
  const { id } = await params;
  const { data, error } = await auth.supabase.from("learning_programs").delete().eq("id", id).select("id").maybeSingle();
  if (error) return errorResponse(error.message, 500);
  if (!data) return errorResponse("Program not found", 404);
  return NextResponse.json({ success: true });
}
