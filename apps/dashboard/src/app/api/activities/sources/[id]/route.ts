import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { classifyActivitySourceFromDatabase } from "@/lib/activity-source-classifier";
import type { ActivitySource } from "@/types/database";

type Params = { params: Promise<{ id: string }> };

const SOURCE_SELECT =
  "id, title, source_url, raw_markdown, status, error_message, activities_extracted, source_domain, source_name, source_category, source_scope, source_trust, source_language, processed_at, created_at, updated_at";

export async function GET(_request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;

  const { id } = await params;
  if (!id) return errorResponse("Source id is required");

  const { data, error } = await auth.supabase
    .from("activity_sources")
    .select(SOURCE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) return errorResponse(error.message, 500);
  if (!data) return errorResponse("Source not found", 404);

  return NextResponse.json({ source: data as ActivitySource });
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;

  const { id } = await params;
  if (!id) return errorResponse("Source id is required");

  const payload = (await request.json()) as {
    title?: unknown;
    source_url?: unknown;
    raw_markdown?: unknown;
  };

  const updates: Record<string, unknown> = {};
  if (payload.title !== undefined) {
    if (typeof payload.title !== "string" || payload.title.trim().length === 0) {
      return errorResponse("title must be a non-empty string");
    }
    updates.title = payload.title.trim();
  }
  if (payload.source_url !== undefined) {
    if (payload.source_url === null || payload.source_url === "") {
      updates.source_url = null;
      Object.assign(updates, await classifyActivitySourceFromDatabase(auth.supabase, null));
    } else if (typeof payload.source_url === "string" && payload.source_url.trim().length > 0) {
      const sourceUrl = payload.source_url.trim();
      updates.source_url = sourceUrl;
      Object.assign(updates, await classifyActivitySourceFromDatabase(auth.supabase, sourceUrl));
    } else {
      return errorResponse("source_url must be a non-empty string or null");
    }
  }
  if (payload.raw_markdown !== undefined) {
    if (typeof payload.raw_markdown !== "string" || payload.raw_markdown.trim().length === 0) {
      return errorResponse("raw_markdown must be a non-empty string");
    }
    updates.raw_markdown = payload.raw_markdown.trim();
    updates.status = "queued";
    updates.error_message = null;
    updates.processed_at = null;
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse("At least one field is required");
  }

  const { data, error } = await auth.supabase
    .from("activity_sources")
    .update(updates)
    .eq("id", id)
    .select(SOURCE_SELECT)
    .maybeSingle();

  if (error) return errorResponse(error.message, 500);
  if (!data) return errorResponse("Source not found", 404);

  return NextResponse.json({ source: data as ActivitySource });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;

  const { id } = await params;
  if (!id) return errorResponse("Source id is required");

  const { error } = await auth.supabase.from("activity_sources").delete().eq("id", id);
  if (error) return errorResponse(error.message, 500);

  return NextResponse.json({ success: true });
}
