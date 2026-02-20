import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

const VALID_FEEDBACK = new Set([
  "1",
  "2",
  "3",
  "4",
  "5",
  "Too easy",
  "Too hard",
  "More like this",
  "Less like this",
]);

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const payload = (await request.json()) as { log_id?: unknown; feedback?: unknown };

  if (typeof payload.log_id !== "string" || payload.log_id.length === 0) {
    return errorResponse("log_id is required");
  }
  if (typeof payload.feedback !== "string" || !VALID_FEEDBACK.has(payload.feedback)) {
    return errorResponse("Invalid feedback value");
  }

  const { data, error } = await auth.supabase
    .from("learning_log")
    .update({ feedback: payload.feedback })
    .eq("id", payload.log_id)
    .select("*")
    .maybeSingle();

  if (error) {
    return errorResponse(error.message, 500);
  }
  if (!data) {
    return errorResponse("Log entry not found", 404);
  }

  return NextResponse.json({ success: true, entry: data });
}
