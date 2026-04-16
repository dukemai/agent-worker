import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { ensureCookPlan } from "@/lib/cook-plan-server";
import type { RecipeI18nColumn } from "@/lib/recipe-locale";

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  let plan;
  try {
    plan = await ensureCookPlan(auth.supabase, auth.user.id);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Cook plan error", 500);
  }

  const { data: items, error: itemsError } = await auth.supabase
    .from("cook_plan_items")
    .select(
      `
      id,
      sort_order,
      recipe_id,
      saved_recipes (
        id,
        title,
        title_en,
        title_vi,
        summary,
        meal_kind,
        ingredients,
        food_type_id,
        vegetarian,
        estimated_cook_time,
        i18n
      )
    `,
    )
    .eq("plan_id", plan.id)
    .order("sort_order", { ascending: true });

  if (itemsError) {
    return errorResponse(itemsError.message, 500);
  }

  const normalized =
    items?.map((row) => {
      const raw = row.saved_recipes as Record<string, unknown> | Record<string, unknown>[] | null;
      const r = Array.isArray(raw) ? raw[0] : raw;
      return {
        id: row.id,
        sort_order: row.sort_order,
        recipe_id: row.recipe_id,
        recipe: r
          ? {
              id: r.id as string,
              title: r.title as string,
              title_en: typeof r.title_en === "string" ? r.title_en : "",
              title_vi: typeof r.title_vi === "string" ? r.title_vi : "",
              summary: r.summary as string,
              meal_kind: r.meal_kind as string,
              ingredients: r.ingredients,
              food_type_id: r.food_type_id as string,
              vegetarian: r.vegetarian as boolean,
              estimated_cook_time: r.estimated_cook_time as string,
              i18n: (r.i18n as RecipeI18nColumn | null | undefined) ?? null,
            }
          : null,
      };
    }) ?? [];

  return NextResponse.json({ plan, items: normalized });
}

export async function PATCH(request: Request) {
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

  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const title = typeof o.title === "string" ? o.title.trim().slice(0, 200) : undefined;

  let plan;
  try {
    plan = await ensureCookPlan(auth.supabase, auth.user.id);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Cook plan error", 500);
  }

  if (title === undefined) {
    return errorResponse("title is required (string, may be empty)", 400);
  }

  const { data, error } = await auth.supabase
    .from("cook_plans")
    .update({ title: title.length > 0 ? title : null })
    .eq("id", plan.id)
    .select("id, user_id, title, created_at, updated_at")
    .single();

  if (error || !data) {
    return errorResponse(error?.message ?? "Update failed", 500);
  }

  return NextResponse.json({ plan: data });
}
