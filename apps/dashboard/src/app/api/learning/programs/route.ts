import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;
  const { data, error } = await auth.supabase.from("learning_programs").select("*").order("created_at", { ascending: false });
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ programs: data });
}
