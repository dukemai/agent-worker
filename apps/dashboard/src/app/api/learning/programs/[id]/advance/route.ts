import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { advanceProgram } from "@/lib/learning-programs";
type Params = { params: Promise<{ id: string }> };
export async function POST(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;
  const { id } = await params;
  const payload = await request.json().catch(() => null);
  const { data: program, error } = await auth.supabase.from("learning_programs").select("*").eq("id", id).maybeSingle();
  if (error) return errorResponse(error.message, 500);
  if (!program) return errorResponse("Program not found", 404);
  if (program.status !== "active") return errorResponse("Only active programs can advance", 409);
  if (payload?.current_day !== undefined && payload.current_day !== program.current_day) return errorResponse("Progress changed. Refresh and try again.", 409);
  const { data, error: updateError } = await auth.supabase.from("learning_programs").update(advanceProgram(program)).eq("id", id).eq("status", "active").eq("current_day", program.current_day).eq("updated_at", program.updated_at).select("*").maybeSingle();
  if (updateError) return errorResponse(updateError.message, 500);
  if (!data) return errorResponse("Progress changed. Refresh and try again.", 409);
  return NextResponse.json({ program: data });
}
