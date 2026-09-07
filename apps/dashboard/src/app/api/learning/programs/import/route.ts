import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { parseLearningProgramImport } from "@/lib/learning-program-import";
export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;
  let payload: unknown;
  try { payload = await request.json(); } catch { return errorResponse("File must contain valid JSON"); }
  const parsed = parseLearningProgramImport(payload);
  if ("error" in parsed) return errorResponse(parsed.error);
  const { days, ...fields } = parsed.program;
  // Activate only after every day is persisted, so the digest never sees a partial import.
  const { data: program, error } = await auth.supabase.from("learning_programs").insert({ ...fields, current_day: 1, status: "paused" }).select("*").single();
  if (error) return errorResponse(error.message, 500);
  const { error: daysError } = await auth.supabase.from("learning_program_days").insert(days.map(day => ({ ...day, program_id: program.id })));
  if (daysError) {
    await auth.supabase.from("learning_programs").delete().eq("id", program.id);
    return errorResponse(daysError.message, 500);
  }
  const { data: active, error: activateError } = await auth.supabase.from("learning_programs").update({ status: "active" }).eq("id", program.id).select("*").single();
  if (activateError) {
    await auth.supabase.from("learning_programs").delete().eq("id", program.id);
    return errorResponse(activateError.message, 500);
  }
  return NextResponse.json({ program: active, days_imported: days.length }, { status: 201 });
}
