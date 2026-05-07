import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { getUserHousehold } from "@/lib/household";

const STATUS_VALUES = new Set([
  "new",
  "want_to_try",
  "looks_good",
  "needs_changes",
  "accepted",
  "rejected",
  "done",
]);

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";
}

function cleanLongText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanUrl(value: unknown): string | null {
  const raw = cleanText(value, 1200);
  if (!raw) {
    return null;
  }
  try {
    const url = new URL(raw);
    return url.toString();
  } catch {
    return null;
  }
}

function cleanImageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const urls = new Set<string>();
  for (const item of value) {
    const url = cleanUrl(item);
    if (url) {
      urls.add(url);
    }
    if (urls.size >= 6) {
      break;
    }
  }
  return Array.from(urls);
}

function buildNoteAppend(body: Record<string, unknown>): string {
  const ingredientNotes = cleanLongText(body.ingredientNotes, 2000);
  const cookingNotes = cleanLongText(body.cookingNotes, 3000);
  const recipeNotes = cleanLongText(body.notes, 6000);
  return [
    ingredientNotes ? `Ingredient notes:\n${ingredientNotes}` : "",
    cookingNotes ? `Cooking notes:\n${cookingNotes}` : "",
    recipeNotes ? `Recipe notes:\n${recipeNotes}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const household = await getUserHousehold(auth.supabase, auth.user.id);
  if (household.error) {
    return errorResponse(household.error.message, 500);
  }
  if (!household.household) {
    return errorResponse("No household found", 404);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse("Expected JSON body", 400);
  }

  const status = typeof body.status === "string" ? body.status.trim() : undefined;
  if (status !== undefined && !STATUS_VALUES.has(status)) {
    return errorResponse("Invalid candidate status", 400);
  }

  const { id } = await context.params;
  const noteAppend = buildNoteAppend(body);
  const imageUrls = cleanImageUrls(body.imageUrls);

  if (status === undefined && !noteAppend && imageUrls.length === 0) {
    return errorResponse("No candidate changes provided", 400);
  }

  const { data: current, error: currentError } = await auth.supabase
    .from("recipe_candidates")
    .select("notes, image_urls")
    .eq("id", id)
    .eq("household_id", household.household.id)
    .maybeSingle();

  if (currentError) {
    return errorResponse(currentError.message, 500);
  }
  if (!current) {
    return errorResponse("Recipe candidate not found", 404);
  }

  const existingImageUrls = Array.isArray(current.image_urls)
    ? current.image_urls.filter((url): url is string => typeof url === "string")
    : [];
  const mergedImageUrls = Array.from(new Set([...existingImageUrls, ...imageUrls])).slice(0, 6);
  const nextNotes = noteAppend
    ? [typeof current.notes === "string" ? current.notes.trim() : "", noteAppend]
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 12000)
    : undefined;
  const update: { status?: string; notes?: string; image_urls?: string[] } = {};
  if (status !== undefined) {
    update.status = status;
  }
  if (nextNotes !== undefined) {
    update.notes = nextNotes;
  }
  if (imageUrls.length > 0) {
    update.image_urls = mergedImageUrls;
  }

  const { data, error } = await auth.supabase
    .from("recipe_candidates")
    .update(update)
    .eq("id", id)
    .eq("household_id", household.household.id)
    .select(
      "id, household_id, submitted_by, title, source_url, notes, raw_text, image_urls, status, converted_recipe_id, created_at, updated_at",
    )
    .maybeSingle();

  if (error) {
    return errorResponse(error.message, 500);
  }
  if (!data) {
    return errorResponse("Recipe candidate not found", 404);
  }

  return NextResponse.json({ candidate: data });
}
