import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { data, error } = await auth.supabase
    .from("family_context")
    .select("key, value, last_updated")
    .order("key", { ascending: true });

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ context: data ?? [] });
}
