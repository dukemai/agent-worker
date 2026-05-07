import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import {
  isUuid,
  parseRecipeLinkBody,
  VIETNAMESE_MEAL_LINK_COLUMNS,
} from "@/lib/vietnamese-meals";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const { id } = await params;
  if (!isUuid(id)) {
    return errorResponse("Invalid id", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Expected JSON body", 400);
  }
  const parsed = parseRecipeLinkBody(body);
  if ("error" in parsed) {
    return errorResponse(parsed.error, 400);
  }

  const { data: meal, error: mealError } = await auth.supabase
    .from("vietnamese_meals")
    .select("id")
    .eq("id", id)
    .eq("created_by", auth.user.id)
    .maybeSingle();
  if (mealError) {
    return errorResponse(mealError.message, 500);
  }
  if (!meal) {
    return errorResponse("Vietnamese meal not found", 404);
  }

  const { data: recipe, error: recipeError } = await auth.supabase
    .from("saved_recipes")
    .select("id")
    .eq("id", parsed.recipe_id)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (recipeError) {
    return errorResponse(recipeError.message, 500);
  }
  if (!recipe) {
    return errorResponse("Recipe not found", 404);
  }

  const { data, error } = await auth.supabase
    .from("vietnamese_meal_recipe_links")
    .upsert(
      {
        meal_id: id,
        recipe_id: parsed.recipe_id,
        link_type: parsed.link_type,
        notes: parsed.notes,
        created_by: auth.user.id,
      },
      { onConflict: "meal_id,recipe_id" },
    )
    .select(VIETNAMESE_MEAL_LINK_COLUMNS)
    .single();

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ link: data });
}
