import { translateSavedRecipeBody } from "@agent/shared";
import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import {
  isRecipeTranslationComplete,
  type RecipeI18nColumn,
  type RecipeTranslationBundle,
} from "@/lib/recipe-locale";
import type { RecipeIngredient } from "@agent/shared";
import { SAVED_RECIPE_COLUMNS } from "@/lib/saved-recipe-columns";

type Params = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RECIPE_SELECT = SAVED_RECIPE_COLUMNS;

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

export async function POST(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const { id } = await params;
  if (!id || !UUID_RE.test(id)) {
    return errorResponse("Invalid id", 400);
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
  const locale = (body as Record<string, unknown>).locale;
  if (locale !== "en" && locale !== "vi") {
    return errorResponse('Body "locale" must be "en" or "vi"', 400);
  }

  const { data: row, error: fetchError } = await auth.supabase
    .from("saved_recipes")
    .select(RECIPE_SELECT)
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (fetchError) {
    return errorResponse(fetchError.message, 500);
  }
  if (!row) {
    return errorResponse("Recipe not found", 404);
  }

  const i18n = (row.i18n as RecipeI18nColumn | null) ?? {};
  const existingBucket = locale === "en" ? i18n.en : i18n.vi;
  if (isRecipeTranslationComplete(existingBucket)) {
    return NextResponse.json({ recipe: row, cached: true });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return errorResponse(
      "GEMINI_API_KEY is not configured on the server. Add it to the dashboard environment.",
      503,
    );
  }

  const ingredients = asIngredients(row.ingredients);
  const steps = asSteps(row.steps);
  if (ingredients.length === 0 || steps.length === 0) {
    return errorResponse("Recipe has no ingredients or steps to translate", 400);
  }

  const titleSv = typeof row.title === "string" ? row.title : "";
  const summarySv = typeof row.summary === "string" ? row.summary : "";
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
        existingTitleEn: typeof row.title_en === "string" ? row.title_en : "",
        existingTitleVi: typeof row.title_vi === "string" ? row.title_vi : "",
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

    const { data: updated, error: updateError } = await auth.supabase
      .from("saved_recipes")
      .update({ i18n: nextI18n, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .select(RECIPE_SELECT)
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
