import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { ensureCookPlan } from "@/lib/cook-plan-server";
import { canUserAccessRecipe } from "@/lib/recipe-collaboration-search";

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

  const recipeId =
    body && typeof body === "object" && typeof (body as Record<string, unknown>).recipeId === "string"
      ? ((body as Record<string, unknown>).recipeId as string).trim()
      : "";

  if (!recipeId) {
    return errorResponse("recipeId is required", 400);
  }

  let plan;
  try {
    plan = await ensureCookPlan(auth.supabase, auth.user.id);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Cook plan error", 500);
  }

  const access = await canUserAccessRecipe(auth.supabase, auth.user, recipeId);
  if (access.error) {
    return errorResponse(access.error.message, 500);
  }
  if (!access.canAccess) {
    return errorResponse("Recipe not found", 404);
  }

  const { data: maxRow } = await auth.supabase
    .from("cook_plan_items")
    .select("sort_order")
    .eq("plan_id", plan.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxRow?.sort_order ?? -1) + 1;

  const { data: item, error: insertError } = await auth.supabase
    .from("cook_plan_items")
    .insert({
      plan_id: plan.id,
      recipe_id: recipeId,
      sort_order: nextOrder,
    })
    .select("id, plan_id, sort_order, recipe_id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return errorResponse("Recipe is already on the plan", 409);
    }
    return errorResponse(insertError.message, 500);
  }

  return NextResponse.json({ item });
}

export async function DELETE(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const url = new URL(request.url);
  const recipeId = url.searchParams.get("recipeId")?.trim() ?? "";

  if (!recipeId) {
    return errorResponse("recipeId query parameter is required", 400);
  }

  let plan;
  try {
    plan = await ensureCookPlan(auth.supabase, auth.user.id);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Cook plan error", 500);
  }

  const { error } = await auth.supabase
    .from("cook_plan_items")
    .delete()
    .eq("plan_id", plan.id)
    .eq("recipe_id", recipeId);

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ ok: true });
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

  const ids = (body as Record<string, unknown>)?.recipeIds;
  if (!Array.isArray(ids) || !ids.every((x) => typeof x === "string")) {
    return errorResponse("recipeIds must be an array of recipe id strings", 400);
  }

  let plan;
  try {
    plan = await ensureCookPlan(auth.supabase, auth.user.id);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Cook plan error", 500);
  }

  const recipeIds = ids as string[];

  const { data: rows, error: fetchError } = await auth.supabase
    .from("cook_plan_items")
    .select("recipe_id")
    .eq("plan_id", plan.id);

  if (fetchError) {
    return errorResponse(fetchError.message, 500);
  }

  const existing = new Set((rows ?? []).map((r) => r.recipe_id));
  const ordered = new Set<string>();
  for (const id of recipeIds) {
    if (!existing.has(id)) {
      return errorResponse(`Unknown recipe id in order: ${id}`, 400);
    }
    if (ordered.has(id)) {
      return errorResponse("Duplicate recipe id in recipeIds", 400);
    }
    ordered.add(id);
  }
  if (ordered.size !== existing.size) {
    return errorResponse("recipeIds must include every recipe on the plan exactly once", 400);
  }

  let sortOrder = 0;
  for (const recipeId of recipeIds) {
    const { error: uErr } = await auth.supabase
      .from("cook_plan_items")
      .update({ sort_order: sortOrder })
      .eq("plan_id", plan.id)
      .eq("recipe_id", recipeId);
    if (uErr) {
      return errorResponse(uErr.message, 500);
    }
    sortOrder += 1;
  }

  return NextResponse.json({ ok: true });
}
