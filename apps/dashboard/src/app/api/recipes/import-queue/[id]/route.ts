import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(_: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const { id } = await params;
  if (!id || !UUID_RE.test(id)) {
    return errorResponse("Invalid id", 400);
  }

  const { data: item, error: fetchError } = await auth.supabase
    .from("recipe_import_queue")
    .select("id, status")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (fetchError) {
    return errorResponse(fetchError.message, 500);
  }
  if (!item) {
    return errorResponse("Queue item not found", 404);
  }
  if (item.status === "processing") {
    return errorResponse("Processing queue items cannot be deleted", 409);
  }

  const { error } = await auth.supabase
    .from("recipe_import_queue")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ deleted: true, id });
}
