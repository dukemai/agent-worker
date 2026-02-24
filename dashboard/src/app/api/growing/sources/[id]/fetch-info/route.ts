import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { extractYouTubeVideoId, fetchYouTubeVideoInfo } from "@/lib/youtube";

type Params = { params: Promise<{ id: string }> };

/** Fetch video metadata (title, channel, description) from YouTube and update the source. */
export async function POST(_request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { id } = await params;
  if (!id) {
    return errorResponse("Source id is required");
  }

  const { data: source, error: fetchError } = await auth.supabase
    .from("growing_sources")
    .select("id, url")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return errorResponse(fetchError.message, 500);
  }
  if (!source) {
    return errorResponse("Source not found", 404);
  }

  const url = (source as { url: string }).url;
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    return errorResponse("Source URL is not a valid YouTube video URL");
  }

  let info: { title: string | null; channel: string | null; description: string | null };
  try {
    const result = await fetchYouTubeVideoInfo(url);
    info = {
      title: result.title,
      channel: result.channel,
      description: result.description,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }

  const { error: updateError } = await auth.supabase
    .from("growing_sources")
    .update({
      title: info.title,
      channel: info.channel,
      description: info.description,
    })
    .eq("id", id);

  if (updateError) {
    return errorResponse(updateError.message, 500);
  }

  return NextResponse.json({
    success: true,
    title: info.title,
    channel: info.channel,
    description: info.description,
  });
}
