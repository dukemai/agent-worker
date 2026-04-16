import type { SupabaseClient } from "@supabase/supabase-js";

export type CookPlanRow = {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export async function ensureCookPlan(
  supabase: SupabaseClient,
  userId: string,
): Promise<CookPlanRow> {
  const { data: existing } = await supabase
    .from("cook_plans")
    .select("id, user_id, title, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    return existing as CookPlanRow;
  }

  const { data: created, error } = await supabase
    .from("cook_plans")
    .insert({ user_id: userId })
    .select("id, user_id, title, created_at, updated_at")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Failed to create cook plan");
  }
  return created as CookPlanRow;
}
