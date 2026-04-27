import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { ensureUserHousehold } from "@/lib/household";
import { isValidFoodTypeId } from "@/lib/recipe-food-types";
import { SAVED_RECIPE_COLUMNS } from "@/lib/saved-recipe-columns";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type SavedRecipeAccessRow = {
  id: string;
  user_id: string;
  household_id: string | null;
};

function parseFlagFilter(value: string | null): boolean | null {
  if (value === "yes") {
    return true;
  }
  if (value === "no") {
    return false;
  }
  return null;
}

export async function GET(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const { searchParams } = new URL(request.url);
  const styleId = searchParams.get("styleId")?.trim() ?? "";
  if (!styleId || !isValidFoodTypeId(styleId)) {
    return errorResponse("styleId is invalid", 400);
  }

  const tested = parseFlagFilter(searchParams.get("tested"));
  const wantToTry = parseFlagFilter(searchParams.get("wantToTry"));

  const householdResult = await ensureUserHousehold(auth.supabase, auth.user);
  if (householdResult.error) {
    return errorResponse(householdResult.error.message, 500);
  }

  const serviceSupabase = createServiceRoleClient();
  if (!serviceSupabase) {
    let query = auth.supabase
      .from("saved_recipes")
      .select(SAVED_RECIPE_COLUMNS)
      .eq("household_id", householdResult.household.id)
      .eq("food_type_id", styleId);
    if (tested !== null) {
      query = query.eq("tested", tested);
    }
    if (wantToTry !== null) {
      query = query.eq("want_to_try", wantToTry);
    }
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) {
      return errorResponse(error.message, 500);
    }
    return NextResponse.json({ recipes: data ?? [], totalInStyle: data?.length ?? 0 });
  }

  const { data: members, error: membersError } = await serviceSupabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", householdResult.household.id);

  if (membersError) {
    return errorResponse(membersError.message, 500);
  }

  const memberIds = (members ?? [])
    .map((member) => (typeof member.user_id === "string" ? member.user_id : ""))
    .filter(Boolean);

  const { data: accessRows, error: accessError } = await serviceSupabase
    .from("saved_recipes")
    .select("id, user_id, household_id")
    .eq("food_type_id", styleId);

  if (accessError) {
    return errorResponse(accessError.message, 500);
  }

  const allowedIds = ((accessRows ?? []) as SavedRecipeAccessRow[])
    .filter(
      (row) =>
        row.household_id === householdResult.household.id || memberIds.includes(row.user_id),
    )
    .map((row) => row.id);

  if (allowedIds.length === 0) {
    return NextResponse.json({ recipes: [], totalInStyle: 0 });
  }

  let recipeQuery = serviceSupabase
    .from("saved_recipes")
    .select(SAVED_RECIPE_COLUMNS)
    .in("id", allowedIds);
  if (tested !== null) {
    recipeQuery = recipeQuery.eq("tested", tested);
  }
  if (wantToTry !== null) {
    recipeQuery = recipeQuery.eq("want_to_try", wantToTry);
  }

  const { data, error } = await recipeQuery.order("created_at", { ascending: false });
  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ recipes: data ?? [], totalInStyle: allowedIds.length });
}
