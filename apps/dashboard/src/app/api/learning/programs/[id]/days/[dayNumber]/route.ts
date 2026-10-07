import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

type Params = { params: Promise<{ id: string; dayNumber: string }> };

export async function GET(_: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;
  const { id, dayNumber: rawDayNumber } = await params;
  const dayNumber = Number(rawDayNumber);
  if (!Number.isInteger(dayNumber) || dayNumber < 1) return errorResponse("Invalid day number", 400);

  const [programResult, dayResult] = await Promise.all([
    auth.supabase.from("learning_programs").select("*").eq("id", id).maybeSingle(),
    auth.supabase.from("learning_program_days").select("*").eq("program_id", id).eq("day_number", dayNumber).maybeSingle(),
  ]);
  if (programResult.error) return errorResponse(programResult.error.message, 500);
  if (dayResult.error) return errorResponse(dayResult.error.message, 500);
  if (!programResult.data) return errorResponse("Program not found", 404);
  if (!dayResult.data) return errorResponse("Lesson not found", 404);
  return NextResponse.json({ program: programResult.data, day: dayResult.data });
}
