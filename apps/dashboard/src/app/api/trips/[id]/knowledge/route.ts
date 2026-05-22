import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { cleanText } from "@/lib/trip-ops";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) return auth.error;

  const { id } = await params;
  const payload = await request.json();
  const title = cleanText(payload.title, 180);
  const rawMarkdown = cleanText(payload.raw_markdown, 30000);
  const sourceUrl = cleanText(payload.source_url, 1000);

  if (!title) return errorResponse("title is required");
  if (!rawMarkdown) return errorResponse("raw_markdown is required");

  const { data: trip, error: tripError } = await auth.supabase
    .from("trips")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (tripError) return errorResponse(tripError.message, 500);
  if (!trip) return errorResponse("Trip not found", 404);

  const { data: knowledge, error } = await auth.supabase
    .from("trip_knowledge_items")
    .insert({
      trip_id: id,
      title,
      source_url: sourceUrl,
      raw_markdown: rawMarkdown,
      status: "queued",
      extraction: {},
      tags: [],
      error_message: null,
      extracted_at: null,
    })
    .select("*")
    .single();

  if (error || !knowledge) {
    return errorResponse(error?.message ?? "Failed to create trip knowledge", 500);
  }

  return NextResponse.json({ knowledge }, { status: 201 });
}
