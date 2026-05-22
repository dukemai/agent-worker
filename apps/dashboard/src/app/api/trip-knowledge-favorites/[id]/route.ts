import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) return auth.error;

  const { id } = await params;
  const { data: existing, error: existingError } = await auth.supabase
    .from("trip_knowledge_favorites")
    .select("id, trips!inner(id)")
    .eq("id", id)
    .maybeSingle();
  if (existingError) return errorResponse(existingError.message, 500);
  if (!existing) return errorResponse("Knowledge favorite not found", 404);

  const { error } = await auth.supabase.from("trip_knowledge_favorites").delete().eq("id", id);
  if (error) return errorResponse(error.message, 500);

  return new NextResponse(null, { status: 204 });
}
