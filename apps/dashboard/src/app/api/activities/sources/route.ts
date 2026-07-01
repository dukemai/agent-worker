import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { classifyActivitySourceFromDatabase } from "@/lib/activity-source-classifier";
import type { ActivitySource } from "@/types/database";

const SOURCE_LIST_SELECT =
  "id, title, source_url, status, error_message, activities_extracted, source_domain, source_name, source_category, source_scope, source_trust, source_language, processed_at, created_at, updated_at";
const SOURCE_DETAIL_SELECT =
  "id, title, source_url, raw_markdown, status, error_message, activities_extracted, source_domain, source_name, source_category, source_scope, source_trust, source_language, capture_html, capture_metadata, capture_template_id, capture_template_version, processed_at, created_at, updated_at";

function sanitizeCapturedHtml(value: string) {
  return value
    .replace(/<(script|style|noscript|iframe|object|embed|form)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(srcdoc)\s*=\s*("[^"]*"|'[^']*')/gi, "");
}

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
    capture_html?: unknown;
    capture_metadata?: unknown;
    capture_template_id?: unknown;
    capture_template_version?: unknown;
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
  if (payload.raw_markdown.length > 500_000) return errorResponse("raw_markdown exceeds the 500 KB limit");
  if (payload.capture_html !== undefined && payload.capture_html !== null && typeof payload.capture_html !== "string") {
    return errorResponse("capture_html must be a string or null");
  }
  if (typeof payload.capture_html === "string" && payload.capture_html.length > 500_000) {
    return errorResponse("capture_html exceeds the 500 KB limit");
  }
  if (payload.capture_metadata !== undefined && payload.capture_metadata !== null && (typeof payload.capture_metadata !== "object" || Array.isArray(payload.capture_metadata))) {
    return errorResponse("capture_metadata must be an object or null");
  }

  const { data, error } = await auth.supabase
    .from("activity_sources")
    .insert({
      title: payload.title.trim(),
      source_url: typeof payload.source_url === "string" ? payload.source_url.trim() : null,
      raw_markdown: payload.raw_markdown.trim(),
      capture_html: typeof payload.capture_html === "string" ? sanitizeCapturedHtml(payload.capture_html) : null,
      capture_metadata: payload.capture_metadata && typeof payload.capture_metadata === "object" ? payload.capture_metadata : null,
      capture_template_id: typeof payload.capture_template_id === "string" ? payload.capture_template_id : null,
      capture_template_version: typeof payload.capture_template_version === "number" ? payload.capture_template_version : null,
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
