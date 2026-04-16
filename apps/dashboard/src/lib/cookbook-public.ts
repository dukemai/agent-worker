import { isServiceRoleKeySameAsAnonKey } from "@/lib/supabase/service-role";

/** Columns returned by the public cookbook API (no raw source markdown). */
export const PUBLIC_COOKBOOK_RECIPE_COLUMNS =
  "id, title, title_en, title_vi, summary, meal_kind, ingredients, steps, food_type_id, vegetarian, ingredient_picks, tested, want_to_try, estimated_cook_time, source, similar_recipe_url, created_at, i18n, forked_from_id";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Supabase `auth.users` id for the account whose recipes are shared at `/cookbook`.
 * Set in `.env` (server-only). Not required for local dev unless you enable the cookbook.
 */
export function getCookbookOwnerUserId(): string | null {
  const raw = process.env.COOKBOOK_PUBLIC_USER_ID?.trim();
  if (!raw || !UUID_RE.test(raw)) {
    return null;
  }
  return raw;
}

export function isCookbookPublicConfigured(): boolean {
  return (
    getCookbookOwnerUserId() !== null &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) &&
    !isServiceRoleKeySameAsAnonKey()
  );
}
