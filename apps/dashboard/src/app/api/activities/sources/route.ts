import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { classifyActivitySourceFromDatabase } from "@/lib/activity-source-classifier";
import type { ActivitySource } from "@/types/database";

const SOURCE_LIST_SELECT =
  "id, title, source_url, status, error_message, activities_extracted, source_domain, source_name, source_category, source_scope, source_trust, source_language, processed_at, created_at, updated_at";
const SOURCE_DETAIL_SELECT =
  "id, title, source_url, raw_markdown, status, error_message, activities_extracted, source_domain, source_name, source_category, source_scope, source_trust, source_language, processed_at, created_at, updated_at";

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;

  const { data, error } = await auth.supabase
    .from("activity_sources")
    .select(SOURCE_LIST_SELECT)
    .order("created_at", { ascending: false });

  if (error) return errorResponse(error.message, 500);

  const sources = ((data ?? []) as Omit<ActivitySource, "raw_markdown">[]).map((source) => ({
    ...source,
    raw_markdown: "",
  }));

  return NextResponse.json({ sources });
}

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;

  const payload = (await request.json()) as {
    title?: unknown;
    source_url?: unknown;
    raw_markdown?: unknown;
  };

  if (typeof payload.title !== "string" || payload.title.trim().length === 0) {
    return errorResponse("title is required");
  }
  if (typeof payload.raw_markdown !== "string" || payload.raw_markdown.trim().length === 0) {
    return errorResponse("raw_markdown is required");
  }
  if (
    payload.source_url !== undefined &&
    payload.source_url !== null &&
    (typeof payload.source_url !== "string" || payload.source_url.trim().length === 0)
  ) {
    return errorResponse("source_url must be a non-empty string or null");
  }

  const { data, error } = await auth.supabase
    .from("activity_sources")
    .insert({
      title: payload.title.trim(),
      source_url: typeof payload.source_url === "string" ? payload.source_url.trim() : null,
      raw_markdown: payload.raw_markdown.trim(),
      ...(await classifyActivitySourceFromDatabase(
        auth.supabase,
        typeof payload.source_url === "string" ? payload.source_url.trim() : null
      )),
      status: "queued",
      error_message: null,
      activities_extracted: 0,
      processed_at: null,
    })
    .select(SOURCE_DETAIL_SELECT)
    .single();

  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ source: data as ActivitySource }, { status: 201 });
}
