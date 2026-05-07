import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  parseNewDishFromMarkdown,
  RECIPE_FOOD_TYPE_OPTIONS,
  RECIPE_SOURCE_MANUAL_MARKDOWN,
  type ParsedNewDishFromMarkdown,
} from "@agent/shared";
import type { Database } from "../types/database";
import type { Env } from "../types/env";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;
const MAX_ATTEMPTS = 3;

type RecipeImportQueueRow = Database["public"]["Tables"]["recipe_import_queue"]["Row"];
type SavedRecipeInsert = Database["public"]["Tables"]["saved_recipes"]["Insert"];

export type RecipeImportQueueRunOptions = {
  limit?: number;
  queueItemId?: string;
};

export type RecipeImportQueueRunItem = {
  id: string;
  status: "completed" | "failed" | "skipped";
  recipe_id?: string;
  error?: string;
};

export type RecipeImportQueueRunSummary = {
  processed: number;
  completed: number;
  failed: number;
  skipped: number;
  items: RecipeImportQueueRunItem[];
};

function clampLimit(value: number | undefined): number {
  if (!Number.isFinite(value ?? NaN)) {
    return DEFAULT_LIMIT;
  }
  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(value!)));
}

function i18nFromParsedNewDish(parsed: ParsedNewDishFromMarkdown): Record<string, unknown> {
  if (parsed.source_language !== "en" && parsed.source_language !== "vi") {
    return {};
  }
  if (
    !parsed.source_language_summary.trim() ||
    parsed.source_language_ingredients.length === 0 ||
    parsed.source_language_steps.length === 0
  ) {
    return {};
  }

  const title =
    parsed.source_language === "en"
      ? parsed.title_en.trim() || parsed.title
      : parsed.title_vi.trim() || parsed.title;
  const bundle = {
    title,
    summary: parsed.source_language_summary,
    ingredients: parsed.source_language_ingredients,
    steps: parsed.source_language_steps,
    updated_at: new Date().toISOString(),
  };
  return parsed.source_language === "en" ? { en: bundle } : { vi: bundle };
}

async function loadPendingQueueItems(
  supabase: SupabaseClient<Database>,
  options: RecipeImportQueueRunOptions,
): Promise<RecipeImportQueueRow[]> {
  const limit = clampLimit(options.limit);
  if (options.queueItemId?.trim()) {
    const { data, error } = await supabase
      .from("recipe_import_queue")
      .select("*")
      .eq("id", options.queueItemId.trim())
      .in("status", ["pending", "failed"])
      .lt("attempts", MAX_ATTEMPTS)
      .limit(1);
    if (error) {
      throw new Error(`Failed to load recipe import queue item: ${error.message}`);
    }
    return data ?? [];
  }

  const query = supabase
    .from("recipe_import_queue")
    .select("*")
    .in("status", ["pending", "failed"])
    .lt("attempts", MAX_ATTEMPTS)
    .lte("run_after", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(limit);

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load recipe import queue: ${error.message}`);
  }
  return data ?? [];
}

async function claimQueueItem(
  supabase: SupabaseClient<Database>,
  item: RecipeImportQueueRow,
): Promise<RecipeImportQueueRow | null> {
  const { data, error } = await supabase
    .from("recipe_import_queue")
    .update({
      status: "processing",
      processing_started_at: new Date().toISOString(),
      last_error: null,
      attempts: item.attempts + 1,
    } as never)
    .eq("id", item.id)
    .in("status", ["pending", "failed"])
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to claim queue item ${item.id}: ${error.message}`);
  }
  return data;
}

async function completeQueueItem(
  supabase: SupabaseClient<Database>,
  itemId: string,
  recipeId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("recipe_import_queue")
    .update({
      status: "completed",
      created_recipe_id: recipeId,
      processed_at: now,
      processing_started_at: null,
      last_error: null,
    } as never)
    .eq("id", itemId);

  if (error) {
    throw new Error(`Failed to finalize queue item ${itemId}: ${error.message}`);
  }
}

async function failQueueItem(
  supabase: SupabaseClient<Database>,
  item: RecipeImportQueueRow,
  errorMessage: string,
): Promise<void> {
  const attempts = item.attempts;
  const finalFailure = attempts >= MAX_ATTEMPTS;
  const retryAt = new Date(Date.now() + Math.min(attempts, MAX_ATTEMPTS) * 60 * 60 * 1000);
  const { error } = await supabase
    .from("recipe_import_queue")
    .update({
      status: finalFailure ? "failed" : "pending",
      last_error: errorMessage.slice(0, 1000),
      processing_started_at: null,
      processed_at: finalFailure ? new Date().toISOString() : null,
      run_after: retryAt.toISOString(),
    } as never)
    .eq("id", item.id);

  if (error) {
    throw new Error(`Failed to mark queue item ${item.id} failed: ${error.message}`);
  }
}

async function insertSavedRecipeFromQueueItem(
  supabase: SupabaseClient<Database>,
  item: RecipeImportQueueRow,
  parsed: ParsedNewDishFromMarkdown,
): Promise<string> {
  const payload: SavedRecipeInsert = {
    user_id: item.user_id,
    household_id: item.household_id,
    title: parsed.title,
    title_en: parsed.title_en,
    title_vi: parsed.title_vi,
    summary: parsed.summary,
    meal_kind: parsed.meal_kind,
    ingredients: parsed.ingredients,
    steps: parsed.steps,
    food_type_id: parsed.food_type_id,
    vegetarian: parsed.vegetarian,
    ingredient_picks: parsed.ingredient_picks,
    tested: false,
    want_to_try: false,
    estimated_cook_time: parsed.estimated_cook_time,
    difficulty: parsed.difficulty,
    source: RECIPE_SOURCE_MANUAL_MARKDOWN,
    source_markdown: item.source_markdown,
    similar_recipe_url: item.source_url,
    i18n: i18nFromParsedNewDish(parsed),
  };

  const { data, error } = await supabase
    .from("saved_recipes")
    .insert(payload as never)
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to save imported recipe: ${error.message}`);
  }
  return (data as { id: string }).id;
}

async function processQueueItem(
  env: Env,
  supabase: SupabaseClient<Database>,
  item: RecipeImportQueueRow,
): Promise<RecipeImportQueueRunItem> {
  const claimed = await claimQueueItem(supabase, item);
  if (!claimed) {
    return { id: item.id, status: "skipped", error: "Item was already claimed" };
  }

  try {
    const parsed = await parseNewDishFromMarkdown(env.GEMINI_API_KEY!, {
      markdown: claimed.source_markdown,
      foodTypeOptions: RECIPE_FOOD_TYPE_OPTIONS,
    });
    const recipeId = await insertSavedRecipeFromQueueItem(supabase, claimed, parsed);
    await completeQueueItem(supabase, claimed.id, recipeId);
    return { id: claimed.id, status: "completed", recipe_id: recipeId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Recipe import queue item failed (${claimed.id}):`, message);
    await failQueueItem(supabase, claimed, message);
    return { id: claimed.id, status: "failed", error: message };
  }
}

export async function runRecipeImportQueue(
  env: Env,
  options: RecipeImportQueueRunOptions = {},
): Promise<RecipeImportQueueRunSummary> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
  const items = await loadPendingQueueItems(supabase, options);
  const results: RecipeImportQueueRunItem[] = [];

  for (const item of items) {
    results.push(await processQueueItem(env, supabase, item));
  }

  const completed = results.filter((item) => item.status === "completed").length;
  const failed = results.filter((item) => item.status === "failed").length;
  const skipped = results.filter((item) => item.status === "skipped").length;
  return {
    processed: results.length,
    completed,
    failed,
    skipped,
    items: results,
  };
}
