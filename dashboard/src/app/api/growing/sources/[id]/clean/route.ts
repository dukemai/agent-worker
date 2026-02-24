import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

/** Delete all knowledge and windows for a source, reset source to queued for re-extraction. */
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
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return errorResponse(fetchError.message, 500);
  }
  if (!source) {
    return errorResponse("Source not found", 404);
  }

  const { error: knowledgeError } = await auth.supabase
    .from("growing_knowledge")
    .delete()
    .eq("source_id", id);

  if (knowledgeError) {
    return errorResponse(`Failed to delete knowledge: ${knowledgeError.message}`, 500);
  }

  const { error: windowsError } = await auth.supabase
    .from("growing_windows")
    .delete()
    .eq("source_id", id);

  if (windowsError) {
    return errorResponse(`Failed to delete windows: ${windowsError.message}`, 500);
  }

  const { error: updateError } = await auth.supabase
    .from("growing_sources")
    .update({
      status: "queued",
      tips_extracted: 0,
      error_message: null,
      processed_at: null,
    })
    .eq("id", id);

  if (updateError) {
    return errorResponse(`Failed to reset source: ${updateError.message}`, 500);
  }

  return NextResponse.json({ success: true });
}
