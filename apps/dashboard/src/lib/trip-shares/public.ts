import { createAnonSupabase } from "@/lib/supabase/anon";
import type { PublicTripSharePayload } from "./types";

export type PublicTripShareResult =
  | { ok: true; payload: PublicTripSharePayload }
  | { ok: false; kind: "not_found" }
  | { ok: false; kind: "error"; message: string };

export async function getTripShareBySlug(slug: string): Promise<PublicTripShareResult> {
  const trimmed = slug.trim();
  if (!trimmed) {
    return { ok: false, kind: "not_found" };
  }

  try {
    const supabase = createAnonSupabase();
    const { data, error } = await supabase.rpc("get_trip_share_by_slug", {
      p_slug: trimmed,
    });

    if (error) {
      return { ok: false, kind: "error", message: error.message };
    }
    if (data == null) {
      return { ok: false, kind: "not_found" };
    }

    const raw = data as PublicTripSharePayload;
    if (
      !raw.share ||
      !raw.trip ||
      !Array.isArray(raw.options) ||
      !Array.isArray(raw.decisions) ||
      !Array.isArray(raw.itinerary) ||
      !Array.isArray(raw.knowledge_favorites)
    ) {
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
