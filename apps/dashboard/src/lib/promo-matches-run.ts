import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Delete a promo match run and its items (CASCADE). Returns false if no row was deleted.
 */
export async function deletePromoMatchRun(
  supabase: SupabaseClient,
  runId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("promo_match_runs")
    .delete()
    .eq("id", runId)
    .select("id");

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Run not found" };
  }
  return { ok: true };
}
