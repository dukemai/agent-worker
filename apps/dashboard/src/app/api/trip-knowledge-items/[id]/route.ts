import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { cleanText } from "@/lib/trip-ops";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) return auth.error;

  const { id } = await params;
  const payload = await request.json();
  const updates: Record<string, unknown> = {};

  if (payload.title !== undefined) {
    const title = cleanText(payload.title, 180);
    if (!title) return errorResponse("title must be a non-empty string");
    updates.title = title;
  }
  if (payload.source_url !== undefined) {
    const sourceUrl = cleanText(payload.source_url, 1000);
    if (sourceUrl === undefined) return errorResponse("source_url must be a string or null");
    updates.source_url = sourceUrl;
  }
  if (payload.raw_markdown !== undefined) {
    const rawMarkdown = cleanText(payload.raw_markdown, 30000);
    if (!rawMarkdown) return errorResponse("raw_markdown must be a non-empty string");
    updates.raw_markdown = rawMarkdown;
    updates.status = "queued";
    updates.error_message = null;
  }
  if (payload.extraction_focus !== undefined) {
    const extractionFocus = parseExtractionFocus(payload.extraction_focus);
    if (!extractionFocus) return errorResponse("extraction_focus must be planning, stories, or both");
    updates.extraction_focus = extractionFocus;
    updates.status = "queued";
    updates.error_message = null;
  }

  if (Object.keys(updates).length === 0) return errorResponse("No valid fields to update");

  const { data: knowledge, error } = await auth.supabase
    .from("trip_knowledge_items")
    .update(updates)
    .eq("id", id)
    .select("*, trips!inner(id)")
    .maybeSingle();

  if (error) return errorResponse(error.message, 500);
  if (!knowledge) return errorResponse("Trip knowledge not found", 404);

  return NextResponse.json({ knowledge });
}

function parseExtractionFocus(value: unknown) {
  return value === "planning" || value === "stories" || value === "both" ? value : null;
}

export async function DELETE(_: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) return auth.error;

  const { id } = await params;
  const { data: existing, error: existingError } = await auth.supabase
    .from("trip_knowledge_items")
    .select("id, trips!inner(id)")
    .eq("id", id)
    .maybeSingle();
  if (existingError) return errorResponse(existingError.message, 500);
  if (!existing) return errorResponse("Trip knowledge not found", 404);

  const { error } = await auth.supabase.from("trip_knowledge_items").delete().eq("id", id);
  if (error) return errorResponse(error.message, 500);

  return new NextResponse(null, { status: 204 });
}
