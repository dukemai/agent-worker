import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };
const text = (value: unknown, max = 500) => typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

export async function GET(_request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;
  const { id } = await params;
  const { data: session, error } = await auth.supabase.from("book_inspiration_sessions").select("*").eq("id", id).maybeSingle();
  if (error) return errorResponse(error.message, 500);
  if (!session) return errorResponse("Session not found", 404);
  const [{ data: candidates, error: candidateError }, { data: shortlist, error: shortlistError }] = await Promise.all([
    auth.supabase.from("book_inspiration_candidates").select("*").eq("session_id", id).order("created_at"),
    auth.supabase.from("book_inspiration_shortlist_entries").select("*").eq("session_id", id).order("rank"),
  ]);
  if (candidateError || shortlistError) return errorResponse(candidateError?.message ?? shortlistError?.message ?? "Failed to load session", 500);
  return NextResponse.json({ session, candidates: candidates ?? [], shortlist: shortlist ?? [] });
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;
  const { id } = await params;
  const body = await request.json() as Record<string, unknown>;
  const intention = text(body.intention, 1000);
  if (!intention) return errorResponse("intention is required");
  const brief = body.brief && typeof body.brief === "object" && !Array.isArray(body.brief) ? body.brief : {};
  const { data, error } = await auth.supabase.from("book_inspiration_sessions").update({ intention, brief }).eq("id", id).select("*").single();
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ session: data });
}
