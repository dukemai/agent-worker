import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { id } = await params;
  if (!id) {
    return errorResponse("Knowledge id is required");
  }

  const { error } = await auth.supabase.from("growing_knowledge").delete().eq("id", id);

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ success: true });
}
