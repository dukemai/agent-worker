import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { PUBLIC_COOKBOOK_RECIPE_COLUMNS } from "@/lib/cookbook-public";
import { getFoodTypeLabelSv, isValidFoodTypeId } from "@/lib/recipe-food-types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type CreateShareBody = {
  scopeType?: unknown;
  recipeId?: unknown;
  foodTypeId?: unknown;
  title?: unknown;
};

const SHARE_COLUMNS =
  "id, public_slug, scope_type, recipe_id, food_type_id, title, disabled_at, created_at, updated_at";

function cleanTitle(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().slice(0, 200) : "";
}

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const readSupabase = createServiceRoleClient() ?? auth.supabase;

  const { data: links, error } = await readSupabase
    .from("recipe_share_links")
    .select(SHARE_COLUMNS)
    .eq("user_id", auth.user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return errorResponse(error.message, 500);
  }

  const { data: recipes, error: recipesError } = await auth.supabase
    .from("saved_recipes")
    .select(PUBLIC_COOKBOOK_RECIPE_COLUMNS)
    .order("title", { ascending: true });

  if (recipesError) {
    return errorResponse(recipesError.message, 500);
  }

  return NextResponse.json({ links: links ?? [], recipes: recipes ?? [] });
}

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }
  const writeSupabase = createServiceRoleClient() ?? auth.supabase;

  let body: CreateShareBody;
  try {
    body = (await request.json()) as CreateShareBody;
  } catch {
    return errorResponse("Expected JSON body", 400);
  }

  const scopeType = typeof body.scopeType === "string" ? body.scopeType.trim() : "";
  const recipeId = typeof body.recipeId === "string" ? body.recipeId.trim() : "";
  const foodTypeId = typeof body.foodTypeId === "string" ? body.foodTypeId.trim() : "";
  const title = cleanTitle(body.title);

  if (scopeType !== "recipe" && scopeType !== "food_style") {
    return errorResponse("scopeType must be recipe or food_style", 400);
  }

  if (scopeType === "recipe") {
    if (!recipeId || foodTypeId) {
      return errorResponse("recipeId is required for recipe shares", 400);
    }

    const { data: recipe, error: recipeError } = await auth.supabase
      .from("saved_recipes")
      .select("id, title")
      .eq("id", recipeId)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (recipeError) {
      return errorResponse(recipeError.message, 500);
    }
    if (!recipe) {
      return errorResponse("Recipe not found", 404);
    }

    const { data: existing, error: existingError } = await writeSupabase
      .from("recipe_share_links")
      .select(SHARE_COLUMNS)
      .eq("user_id", auth.user.id)
      .eq("scope_type", "recipe")
      .eq("recipe_id", recipeId)
      .is("disabled_at", null)
      .maybeSingle();

    if (existingError) {
      return errorResponse(existingError.message, 500);
    }
    if (existing) {
      return NextResponse.json({ link: existing, reused: true });
    }

    const { data: link, error } = await writeSupabase
      .from("recipe_share_links")
      .insert({
        user_id: auth.user.id,
        scope_type: "recipe",
        recipe_id: recipeId,
        food_type_id: null,
        title: title || recipe.title || "Shared recipe",
      })
      .select(SHARE_COLUMNS)
      .single();

    if (error || !link) {
      return errorResponse(error?.message ?? "Failed to create share link", 500);
    }

    return NextResponse.json({ link, reused: false });
  }

  if (!foodTypeId || recipeId) {
    return errorResponse("foodTypeId is required for food style shares", 400);
  }
  if (!isValidFoodTypeId(foodTypeId)) {
    return errorResponse("foodTypeId is invalid", 400);
  }

  const { data: existing, error: existingError } = await writeSupabase
    .from("recipe_share_links")
    .select(SHARE_COLUMNS)
    .eq("user_id", auth.user.id)
    .eq("scope_type", "food_style")
    .eq("food_type_id", foodTypeId)
    .is("disabled_at", null)
    .maybeSingle();

  if (existingError) {
    return errorResponse(existingError.message, 500);
  }
  if (existing) {
    return NextResponse.json({ link: existing, reused: true });
  }

  const { data: link, error } = await writeSupabase
    .from("recipe_share_links")
    .insert({
      user_id: auth.user.id,
      scope_type: "food_style",
      recipe_id: null,
      food_type_id: foodTypeId,
      title: title || getFoodTypeLabelSv(foodTypeId) || "Shared recipes",
    })
    .select(SHARE_COLUMNS)
    .single();

  if (error || !link) {
    return errorResponse(error?.message ?? "Failed to create share link", 500);
  }

  return NextResponse.json({ link, reused: false });
}
