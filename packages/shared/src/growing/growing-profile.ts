import { SupabaseClient } from "@supabase/supabase-js";
import { GrowingProfile } from "../types/growing";

/**
 * Fetches the most recent growing profile for the user.
 */
export async function fetchGrowingProfile(supabase: SupabaseClient): Promise<GrowingProfile | null> {
  const { data, error } = await supabase
    .from("growing_profiles")
    .select("id, city, country_code, space_type, experience_level, interests")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching growing profile:", error);
    return null;
  }
  return data as GrowingProfile | null;
}

/**
 * Fetches the most recent growing profile, or creates a default one if none exists.
 * Useful for background workers or first-time setup.
 */
export async function ensureGrowingProfile(supabase: SupabaseClient): Promise<GrowingProfile> {
  const profile = await fetchGrowingProfile(supabase);
  if (profile) return profile;

  const { data, error } = await supabase
    .from("growing_profiles")
    .insert({
      city: "Stockholm",
      country_code: "SE",
      space_type: "balcony",
      experience_level: "beginner",
      interests: ["herb", "tomato", "berry"],
    })
    .select("id, city, country_code, space_type, experience_level, interests")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create growing profile: ${error?.message}`);
  }
  return data as GrowingProfile;
}
