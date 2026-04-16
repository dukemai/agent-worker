import { parseNewDishFromMarkdown } from "@agent/shared";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

const MAX_BODY_MARKDOWN = 120_000;

type FoodTypesJson = {
  options: { id: string; label: string }[];
};

function loadFoodTypeOptions(): { id: string; label: string }[] {
  const path = join(process.cwd(), "public", "data", "recipe-food-types.json");
  const raw = JSON.parse(readFileSync(path, "utf8")) as FoodTypesJson;
  return raw.options ?? [];
}

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
  const bodyRec = body as Record<string, unknown>;
  const markdown = typeof bodyRec.markdown === "string" ? bodyRec.markdown : "";
  const trimmed = markdown.trim();
  if (!trimmed) {
    return errorResponse("markdown must be a non-empty string", 400);
  }
  if (trimmed.length > MAX_BODY_MARKDOWN) {
    return errorResponse(`markdown is too long (max ${MAX_BODY_MARKDOWN} characters)`, 400);
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return errorResponse(
      "GEMINI_API_KEY is not configured on the server. Add it to the dashboard environment.",
      503,
    );
  }

  const foodTypeOptions = loadFoodTypeOptions();
  if (foodTypeOptions.length === 0) {
    return errorResponse("Food types configuration is missing", 500);
  }

  try {
    const parsed = await parseNewDishFromMarkdown(apiKey, {
      markdown: trimmed,
      foodTypeOptions,
    });
    return NextResponse.json({ parsed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return errorResponse(`New dish parse failed: ${msg}`, 502);
  }
}
