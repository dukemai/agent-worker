import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { organizeBookCandidates } from "@/lib/book-inspiration-organizer";

type Params = { params: Promise<{ id: string }> };
export async function POST(_request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return errorResponse("GEMINI_API_KEY is not configured on the server.", 503);
  const { id } = await params;
  const [{ data: session, error: sessionError }, { data: candidates, error: candidateError }] = await Promise.all([
    auth.supabase.from("book_inspiration_sessions").select("*").eq("id", id).maybeSingle(),
    auth.supabase.from("book_inspiration_candidates").select("*").eq("session_id", id).order("created_at"),
  ]);
  if (sessionError || candidateError) return errorResponse(sessionError?.message ?? candidateError?.message ?? "Failed to load candidates", 500);
  if (!session) return errorResponse("Session not found", 404);
  if (!candidates || candidates.length < 2) return errorResponse("Add at least two candidates before organizing", 400);
  try {
    const organized = await organizeBookCandidates(apiKey, session.intention, session.brief, candidates);
    if (!organized.length) return errorResponse("The organizer returned no usable shortlist entries", 502);
    const { error: deleteError } = await auth.supabase.from("book_inspiration_shortlist_entries").delete().eq("session_id", id);
    if (deleteError) return errorResponse(deleteError.message, 500);
    const { data, error } = await auth.supabase.from("book_inspiration_shortlist_entries").insert(organized.map((entry) => ({ ...entry, session_id: id }))).select("*").order("rank");
    if (error) return errorResponse(error.message, 500);
    return NextResponse.json({ shortlist: data ?? [] });
  } catch (error) {
    return errorResponse(`Could not organize candidates: ${error instanceof Error ? error.message : String(error)}`, 502);
  }
}
