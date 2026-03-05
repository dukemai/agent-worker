import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import type { GrowingSource } from "@/types/database";
import { getSourceType } from "@/lib/url-type";

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { data, error } = await auth.supabase
    .from("growing_sources")
    .select(
      "id, url, title, channel, description, source_type, status, error_message, tips_extracted, created_at, processed_at, transcript"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return errorResponse(error.message, 500);
  }

  const PREVIEW_LENGTH = 300;
  const sources = (data ?? []).map((row) => {
    const s = row as GrowingSource;
    const t = s.transcript;
    return {
      ...s,
      transcript: t != null && t.length > PREVIEW_LENGTH ? t.slice(0, PREVIEW_LENGTH) + "…" : t,
    } as GrowingSource;
  });

  return NextResponse.json({ sources });
}

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const payload = (await request.json()) as { url?: unknown; transcript?: unknown };
  if (typeof payload.url !== "string" || payload.url.trim().length === 0) {
    return errorResponse("url is required");
  }

  const url = payload.url.trim();
  const transcript = typeof payload.transcript === "string" ? payload.transcript.trim() || null : null;
  const sourceType = getSourceType(url);
  if (sourceType === null) {
    return errorResponse("URL must be a valid YouTube video or blog link");
  }

  const { data, error } = await auth.supabase
    .from("growing_sources")
    .insert({
      url,
      transcript: transcript ?? null,
      source_type: sourceType,
      status: "queued",
      error_message: null,
      tips_extracted: 0,
      processed_at: null,
    })
    .select("id, url, title, channel, description, status, error_message, tips_extracted, created_at, processed_at, transcript")
    .single();

  if (error) {
    if (error.code === "23505") {
      return errorResponse("This source is already in your sources list");
    }
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ source: data as GrowingSource }, { status: 201 });
}
