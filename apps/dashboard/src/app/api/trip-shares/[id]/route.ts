import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const { id } = await params;
  if (!id) {
    return errorResponse("Missing id", 400);
  }

  const writeSupabase = createServiceRoleClient() ?? auth.supabase;

  const { data: link, error: fetchError } = await writeSupabase
    .from("trip_share_links")
    .select("id")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (fetchError) {
    return errorResponse(fetchError.message, 500);
  }
  if (!link) {
    return errorResponse("Share link not found", 404);
  }

  const { error } = await writeSupabase
    .from("trip_share_links")
    .update({ disabled_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ ok: true });
}
