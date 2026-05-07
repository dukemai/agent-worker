import { createAnonSupabase } from "@/lib/supabase/anon";
import type { PublicRecipeSharePayload } from "./types";

export type PublicRecipeShareResult =
  | { ok: true; payload: PublicRecipeSharePayload }
  | { ok: false; kind: "not_found" }
  | { ok: false; kind: "error"; message: string };

export async function getRecipeShareBySlug(slug: string): Promise<PublicRecipeShareResult> {
  const trimmed = slug.trim();
  if (!trimmed) {
    return { ok: false, kind: "not_found" };
  }

  try {
    const supabase = createAnonSupabase();
    const { data, error } = await supabase.rpc("get_recipe_share_by_slug", {
      p_slug: trimmed,
    });

    if (error) {
      return { ok: false, kind: "error", message: error.message };
    }
    if (data == null) {
      return { ok: false, kind: "not_found" };
    }

    const raw = data as PublicRecipeSharePayload;
    if (!raw.share || !Array.isArray(raw.recipes)) {
      return { ok: false, kind: "error", message: "Invalid share payload" };
    }

    return { ok: true, payload: raw };
  } catch (e) {
    return {
      ok: false,
      kind: "error",
      message: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
