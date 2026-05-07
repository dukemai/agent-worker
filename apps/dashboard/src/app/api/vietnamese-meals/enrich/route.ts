import { enrichVietnameseMealNames, RECIPE_GENERATOR_MODEL_ID } from "@agent/shared";
import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { normalizeVietnameseMealNames } from "@/lib/vietnamese-meals";

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Expected JSON body", 400);
  }
  if (!body || typeof body !== "object") {
    return errorResponse("Invalid body", 400);
  }
  const names = normalizeVietnameseMealNames((body as Record<string, unknown>).names);
  if (names.length === 0) {
    return errorResponse("names must contain at least one meal name", 400);
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return errorResponse(
      "GEMINI_API_KEY is not configured on the server. Add it to the dashboard environment.",
      503,
    );
  }

  try {
    const result = await enrichVietnameseMealNames(apiKey, { names });
    return NextResponse.json({
      drafts: result.meals,
      meta: {
        input_count: names.length,
        output_count: result.meals.length,
        recipe_model: RECIPE_GENERATOR_MODEL_ID,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return errorResponse(`Vietnamese meal enrichment failed: ${msg}`, 502);
  }
}
