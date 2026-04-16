import { parseRecipeMarkdownForImport } from "@agent/shared";
import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_BODY_MARKDOWN = 120_000;

export async function POST(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const { id } = await params;
  if (!id || !UUID_RE.test(id)) {
    return errorResponse("Invalid id", 400);
  }

  const { data: recipe, error: recipeError } = await auth.supabase
    .from("saved_recipes")
    .select("id, title, summary")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (recipeError) {
    return errorResponse(recipeError.message, 500);
  }
  if (!recipe) {
    return errorResponse("Recipe not found", 404);
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
  const markdown =
    typeof (body as Record<string, unknown>).markdown === "string"
      ? (body as Record<string, unknown>).markdown as string
      : "";
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

  try {
    const parsed = await parseRecipeMarkdownForImport(apiKey, {
      markdown: trimmed,
      contextTitle: recipe.title,
      contextSummary: recipe.summary ?? "",
    });
    return NextResponse.json({ parsed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return errorResponse(`Import parse failed: ${msg}`, 502);
  }
}
