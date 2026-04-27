import { translateSavedRecipeBody, type RecipeIngredient } from "@agent/shared";
import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { ensureUserHousehold } from "@/lib/household";
import {
  isRecipeTranslationComplete,
  type RecipeI18nColumn,
  type RecipeTranslationBundle,
} from "@/lib/recipe-locale";
import { SAVED_RECIPE_COLUMNS } from "@/lib/saved-recipe-columns";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RECIPE_WITH_ACCESS_COLUMNS = `${SAVED_RECIPE_COLUMNS}, user_id, household_id`;

type RecipeAccessRow = {
  id: string;
  user_id: string;
  household_id: string | null;
};

function asIngredients(raw: unknown): RecipeIngredient[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: RecipeIngredient[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const o = row as Record<string, unknown>;
    const text = typeof o.text === "string" ? o.text : "";
    const ingredient_label = typeof o.ingredient_label === "string" ? o.ingredient_label : "";
    const amount = typeof o.amount === "string" ? o.amount : "";
    if (text.trim() && ingredient_label.trim() && amount.trim()) {
      out.push({ text, ingredient_label, amount });
    }
  }
  return out;
}

function asSteps(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((s): s is string => typeof s === "string" && s.trim().length > 0);
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
  const o = body as Record<string, unknown>;
  const id = typeof o.recipeId === "string" ? o.recipeId.trim() : "";
  if (!id || !UUID_RE.test(id)) {
    return errorResponse("Invalid recipeId", 400);
  }
  const locale = o.locale;
  if (locale !== "en" && locale !== "vi") {
    return errorResponse('Body "locale" must be "en" or "vi"', 400);
  }

  const householdResult = await ensureUserHousehold(auth.supabase, auth.user);
  if (householdResult.error) {
    return errorResponse(householdResult.error.message, 500);
  }

  const serviceSupabase = createServiceRoleClient();
  if (!serviceSupabase) {
    return errorResponse("Service role client is not configured", 503);
  }

  const { data: recipe, error: recipeError } = await serviceSupabase
    .from("saved_recipes")
    .select(RECIPE_WITH_ACCESS_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (recipeError) {
    return errorResponse(recipeError.message, 500);
  }
  if (!recipe) {
    return errorResponse("Recipe not found", 404);
  }

  const access = recipe as RecipeAccessRow;
  const { data: membership, error: membershipError } = await serviceSupabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", householdResult.household.id);

  if (membershipError) {
    return errorResponse(membershipError.message, 500);
  }

  const memberIds = (membership ?? [])
    .map((member) => (typeof member.user_id === "string" ? member.user_id : ""))
    .filter(Boolean);

  const canAccess =
    access.household_id === householdResult.household.id || memberIds.includes(access.user_id);
  if (!canAccess) {
    return errorResponse("Recipe not found", 404);
  }

  const i18n = (recipe.i18n as RecipeI18nColumn | null) ?? {};
  const existingBucket = locale === "en" ? i18n.en : i18n.vi;
  if (isRecipeTranslationComplete(existingBucket)) {
    return NextResponse.json({ recipe, cached: true });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return errorResponse(
      "GEMINI_API_KEY is not configured on the server. Add it to the dashboard environment.",
      503,
    );
  }

  const ingredients = asIngredients(recipe.ingredients);
  const steps = asSteps(recipe.steps);
  if (ingredients.length === 0 || steps.length === 0) {
    return errorResponse("Recipe has no ingredients or steps to translate", 400);
  }

  const titleSv = typeof recipe.title === "string" ? recipe.title : "";
  const summarySv = typeof recipe.summary === "string" ? recipe.summary : "";
  if (!titleSv.trim() || !summarySv.trim()) {
    return errorResponse("Recipe title or summary is empty", 400);
  }

  try {
    const translated = await translateSavedRecipeBody(
      apiKey,
      {
        sourceTitle: titleSv,
        sourceSummary: summarySv,
        ingredients,
        steps,
        existingTitleEn: typeof recipe.title_en === "string" ? recipe.title_en : "",
        existingTitleVi: typeof recipe.title_vi === "string" ? recipe.title_vi : "",
      },
      locale,
    );

    const bundle: RecipeTranslationBundle = {
      ...translated,
      updated_at: new Date().toISOString(),
    };

    const nextI18n: RecipeI18nColumn = {
      ...i18n,
      [locale]: bundle,
    };

    const { data: updated, error: updateError } = await serviceSupabase
      .from("saved_recipes")
      .update({ i18n: nextI18n, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(SAVED_RECIPE_COLUMNS)
      .maybeSingle();

    if (updateError) {
      return errorResponse(updateError.message, 500);
    }
    if (!updated) {
      return errorResponse("Recipe not found", 404);
    }

    return NextResponse.json({ recipe: updated, cached: false });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return errorResponse(`Translation failed: ${msg}`, 502);
  }
}
