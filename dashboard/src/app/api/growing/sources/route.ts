import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { extractYouTubeVideoId } from "@/lib/youtube";
import type { GrowingSource } from "@/types/database";

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { data, error } = await auth.supabase
    .from("growing_sources")
    .select("id, url, title, channel, status, error_message, tips_extracted, created_at, processed_at")
    .order("created_at", { ascending: false });

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ sources: (data ?? []) as GrowingSource[] });
}

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const payload = (await request.json()) as { url?: unknown };
  if (typeof payload.url !== "string" || payload.url.trim().length === 0) {
    return errorResponse("url is required");
  }

  const url = payload.url.trim();
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    return errorResponse("Only valid YouTube watch/short links are supported");
  }

  const { data, error } = await auth.supabase
    .from("growing_sources")
    .insert({
      url,
      status: "queued",
      error_message: null,
      tips_extracted: 0,
      processed_at: null,
    })
    .select("id, url, title, channel, status, error_message, tips_extracted, created_at, processed_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return errorResponse("This video is already in your sources list");
    }
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ source: data as GrowingSource }, { status: 201 });
}
