import {
  RECIPE_GENERATOR_SOURCE_LABEL,
  RECIPE_SOURCE_MANUAL_MARKDOWN,
} from "@agent/shared";

/** Friendly label for `saved_recipes.source` (legacy `ai_generator` + newer full labels). */
export function formatSavedRecipeSourceLabel(source: string): string {
  const s = source?.trim() ?? "";
  if (!s || s === "ai_generator") {
    return "AI recipe generator";
  }
  if (s === RECIPE_SOURCE_MANUAL_MARKDOWN) {
    return "Markdown from trusted source";
  }
  if (s === RECIPE_GENERATOR_SOURCE_LABEL) {
    return "AI recipe suggestions";
  }
  return s;
}

/** Normalize PATCH body: http(s) URL or empty to clear. */
export function parseSimilarRecipeUrl(raw: unknown): string | { error: string } {
  if (typeof raw !== "string") {
    return { error: "similar_recipe_url must be a string" };
  }
  const t = raw.trim();
  if (!t) {
    return "";
  }
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return { error: "similar_recipe_url must be a valid http(s) URL" };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { error: "similar_recipe_url must use http or https" };
  }
  return u.toString().slice(0, 2000);
}
