import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { id } = await context.params;
  const { error, count } = await auth.supabase
    .from("food_style_favorite_suggestions")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    return errorResponse(error.message, 500);
  }
  if (count === 0) {
    return errorResponse("Suggestion not found", 404);
  }

  return NextResponse.json({ deleted: true, id });
}
