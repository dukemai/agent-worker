import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };
const clean = (value: unknown, max = 1000) => typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

export async function POST(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;
  const { id } = await params;
  const body = await request.json() as Record<string, unknown>;
  const title = clean(body.title, 300);
  if (!title) return errorResponse("title is required");
  const { data, error } = await auth.supabase.from("book_inspiration_candidates").insert({
    session_id: id,
    title,
    author: clean(body.author, 300),
    source_url: clean(body.source_url, 2000),
    source_name: clean(body.source_name, 300),
    factual_summary: clean(body.factual_summary, 5000),
    facts: body.facts && typeof body.facts === "object" && !Array.isArray(body.facts) ? body.facts : {},
  }).select("*").single();
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ candidate: data }, { status: 201 });
}
