import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { linesFromRecipeIngredients } from "@/lib/cook-plan-ingredients";
import { ensureCookPlan } from "@/lib/cook-plan-server";

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
      sort_order,
      recipe_id,
      saved_recipes (
        id,
        title,
        ingredients
      )
    `,
    )
    .eq("plan_id", plan.id)
    .order("sort_order", { ascending: true });

  if (itemsError) {
    return errorResponse(itemsError.message, 500);
  }

  const lines: ReturnType<typeof linesFromRecipeIngredients> = [];

  for (const row of items ?? []) {
    const raw = row.saved_recipes as
      | { id: string; title: string; ingredients: unknown }
      | { id: string; title: string; ingredients: unknown }[]
      | null;
    const sr = Array.isArray(raw) ? raw[0] : raw;
    if (!sr) {
      continue;
    }
    lines.push(...linesFromRecipeIngredients(sr.id, sr.title, sr.ingredients));
  }

  return NextResponse.json({
    planId: plan.id,
    lines,
  });
}
