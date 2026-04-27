import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { ensureUserHousehold } from "@/lib/household";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RecipeStyleCount = {
  food_type_id: string;
  count: number;
};

type SavedRecipeCountRow = {
  id: string;
  food_type_id: string;
};

function addRowsToCounts(rows: SavedRecipeCountRow[], seen: Set<string>, counts: Map<string, number>) {
  for (const row of rows) {
    if (seen.has(row.id)) {
      continue;
    }
    seen.add(row.id);
    counts.set(row.food_type_id, (counts.get(row.food_type_id) ?? 0) + 1);
  }
}

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const householdResult = await ensureUserHousehold(auth.supabase, auth.user);
  if (householdResult.error) {
    return errorResponse(householdResult.error.message, 500);
  }

  const serviceSupabase = createServiceRoleClient();
  if (!serviceSupabase) {
    const { data, error } = await auth.supabase
      .from("saved_recipes")
      .select("id, food_type_id")
      .eq("household_id", householdResult.household.id);

    if (error) {
      return errorResponse(error.message, 500);
    }

    const counts = new Map<string, number>();
    addRowsToCounts((data ?? []) as SavedRecipeCountRow[], new Set(), counts);
    const styleCounts: RecipeStyleCount[] = Array.from(counts.entries())
      .map(([food_type_id, count]) => ({ food_type_id, count }))
      .sort((a, b) => b.count - a.count || a.food_type_id.localeCompare(b.food_type_id));

    return NextResponse.json({ styleCounts });
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

  const counts = new Map<string, number>();
  const seen = new Set<string>();

  const { data: householdRows, error: householdRowsError } = await serviceSupabase
    .from("saved_recipes")
    .select("id, food_type_id")
    .eq("household_id", householdResult.household.id);

  if (householdRowsError) {
    return errorResponse(householdRowsError.message, 500);
  }
  addRowsToCounts((householdRows ?? []) as SavedRecipeCountRow[], seen, counts);

  if (memberIds.length > 0) {
    const { data: memberRows, error: memberRowsError } = await serviceSupabase
      .from("saved_recipes")
      .select("id, food_type_id")
      .in("user_id", memberIds);

    if (memberRowsError) {
      return errorResponse(memberRowsError.message, 500);
    }
    addRowsToCounts((memberRows ?? []) as SavedRecipeCountRow[], seen, counts);
  }

  const styleCounts: RecipeStyleCount[] = Array.from(counts.entries())
    .map(([food_type_id, count]) => ({ food_type_id, count }))
    .sort((a, b) => b.count - a.count || a.food_type_id.localeCompare(b.food_type_id));

  return NextResponse.json({ styleCounts });
}
