import { parseNewDishFromMarkdown, type ParsedNewDishFromMarkdown } from "@agent/shared";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { getUserHousehold } from "@/lib/household";
import type { RecipeI18nColumn } from "@/lib/recipe-locale";
import { SAVED_RECIPE_COLUMNS } from "@/lib/saved-recipe-columns";

type Params = { params: Promise<{ id: string }> };

type FoodTypesJson = {
  options: { id: string; label: string }[];
};

type RecipeCandidateRow = {
  id: string;
  household_id: string;
  title: string;
  source_url: string | null;
  notes: string;
  raw_text: string;
  image_urls: string[];
  status: string;
  converted_recipe_id: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function loadFoodTypeOptions(): { id: string; label: string }[] {
  const path = join(process.cwd(), "public", "data", "recipe-food-types.json");
  const raw = JSON.parse(readFileSync(path, "utf8")) as FoodTypesJson;
  return raw.options ?? [];
}

function recipeNotesMarkdown(candidate: RecipeCandidateRow): string {
  const sections = [
    `# ${candidate.title}`,
    candidate.source_url ? `Source URL: ${candidate.source_url}` : "",
    candidate.image_urls.length > 0
      ? `## Uploaded recipe images\n${candidate.image_urls.join("\n")}`
      : "",
    candidate.notes.trim() ? `## Manual notes\n${candidate.notes.trim()}` : "",
    candidate.raw_text.trim() ? `## Pasted text or transcript\n${candidate.raw_text.trim()}` : "",
  ].filter(Boolean);
  return sections.join("\n\n").slice(0, 120_000);
}

function i18nFromParsedNewDish(draft: ParsedNewDishFromMarkdown): RecipeI18nColumn | null {
  if (draft.source_language !== "en" && draft.source_language !== "vi") {
    return null;
  }
  if (
    !draft.source_language_summary.trim() ||
    draft.source_language_ingredients.length === 0 ||
    draft.source_language_steps.length === 0
  ) {
    return null;
  }
  const title =
    draft.source_language === "en"
      ? draft.title_en.trim() || draft.title
      : draft.title_vi.trim() || draft.title;
  const bundle = {
    title,
    summary: draft.source_language_summary,
    ingredients: draft.source_language_ingredients,
    steps: draft.source_language_steps,
    updated_at: new Date().toISOString(),
  };
  return draft.source_language === "en" ? { en: bundle } : { vi: bundle };
}

export async function POST(_: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const { id } = await params;
  if (!id || !UUID_RE.test(id)) {
    return errorResponse("Invalid candidate id", 400);
  }

  const household = await getUserHousehold(auth.supabase, auth.user.id);
  if (household.error) {
    return errorResponse(household.error.message, 500);
  }
  if (!household.household) {
    return errorResponse("No household found", 404);
  }

  const { data: candidate, error: candidateError } = await auth.supabase
    .from("recipe_candidates")
    .select("id, household_id, title, source_url, notes, raw_text, image_urls, status, converted_recipe_id")
    .eq("id", id)
    .eq("household_id", household.household.id)
    .maybeSingle();

  if (candidateError) {
    return errorResponse(candidateError.message, 500);
  }
  if (!candidate) {
    return errorResponse("Recipe candidate not found", 404);
  }

  const candidateRow = candidate as RecipeCandidateRow;
  if (candidateRow.converted_recipe_id) {
    return errorResponse("Recipe candidate is already completed", 409);
  }
  if (!candidateRow.notes.trim() && !candidateRow.raw_text.trim()) {
    return errorResponse("Add ingredient or cooking notes before completing with AI", 400);
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

  let parsed: ParsedNewDishFromMarkdown;
  const sourceMarkdown = recipeNotesMarkdown(candidateRow);
  try {
    parsed = await parseNewDishFromMarkdown(apiKey, {
      markdown: sourceMarkdown,
      foodTypeOptions,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return errorResponse(`Recipe completion failed: ${msg}`, 502);
  }

  const { data: recipe, error: recipeError } = await auth.supabase
    .from("saved_recipes")
    .insert({
      user_id: auth.user.id,
      household_id: household.household.id,
      title: parsed.title,
      title_en: parsed.title_en,
      title_vi: parsed.title_vi,
      summary: parsed.summary,
      meal_kind: parsed.meal_kind,
      ingredients: parsed.ingredients,
      steps: parsed.steps,
      food_type_id: parsed.food_type_id,
      vegetarian: parsed.vegetarian,
      ingredient_picks: parsed.ingredient_picks,
      tested: false,
      want_to_try: true,
      estimated_cook_time: parsed.estimated_cook_time,
      difficulty: parsed.difficulty,
      source: "Manual notes completed by AI",
      source_markdown: sourceMarkdown,
      similar_recipe_url: candidateRow.source_url ?? "",
      i18n: i18nFromParsedNewDish(parsed) ?? {},
    })
    .select(SAVED_RECIPE_COLUMNS)
    .single();

  if (recipeError || !recipe) {
    return errorResponse(recipeError?.message ?? "Failed to save completed recipe", 500);
  }

  const { error: deleteError } = await auth.supabase
    .from("recipe_candidates")
    .delete()
    .eq("id", candidateRow.id)
    .eq("household_id", household.household.id);

  if (deleteError) {
    return errorResponse(deleteError.message, 500);
  }

  return NextResponse.json({
    recipe,
    deletedCandidateId: candidateRow.id,
  });
}
