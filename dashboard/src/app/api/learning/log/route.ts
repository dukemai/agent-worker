import { NextRequest, NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

export async function GET(request: NextRequest) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const profileId = request.nextUrl.searchParams.get("profile_id");
  const limitParam = request.nextUrl.searchParams.get("limit");
  const offsetParam = request.nextUrl.searchParams.get("offset");

  const limit = limitParam ? Number(limitParam) : 10;
  const offset = offsetParam ? Number(offsetParam) : 0;

  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    return errorResponse("limit must be an integer between 1 and 50");
  }
  if (!Number.isInteger(offset) || offset < 0) {
    return errorResponse("offset must be an integer >= 0");
  }

  let query = auth.supabase
    .from("learning_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (profileId) {
    query = query.eq("profile_id", profileId);
  }

  const { data, count, error } = await query;
  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ entries: data ?? [], total: count ?? 0 });
}
