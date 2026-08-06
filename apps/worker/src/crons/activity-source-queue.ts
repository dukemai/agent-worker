import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { extractActivitiesFromMarkdown } from "@agent/shared";
import type { Database } from "../types/database";
import type { Env } from "../types/env";

const DEFAULT_LIMIT = 3;
const MAX_LIMIT = 8;
const MAX_ATTEMPTS = 3;
type SourceRow = Database["public"]["Tables"]["activity_sources"]["Row"];

export type ActivitySourceQueueSummary = {
  processed: number; completed: number; failed: number; skipped: number;
  items: Array<{ id: string; status: "completed" | "failed" | "skipped"; extracted?: number; error?: string }>;
};

function limit(value?: number) {
  return Number.isFinite(value ?? NaN) ? Math.max(1, Math.min(MAX_LIMIT, Math.trunc(value!))) : DEFAULT_LIMIT;
}

async function recoverStaleClaims(supabase: SupabaseClient<Database>) {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { error } = await supabase.from("activity_sources").update({
    status: "queued", processing_started_at: null, run_after: new Date().toISOString(),
    error_message: "Recovered stale processing claim",
  } as never).eq("status", "processing").lt("processing_started_at", cutoff);
  if (error) throw new Error(`Failed to recover stale activity sources: ${error.message}`);
}

async function loadSources(supabase: SupabaseClient<Database>, options: { limit?: number; sourceId?: string }) {
  let query = supabase.from("activity_sources").select("*").in("status", ["queued", "failed"]).lt("attempts", MAX_ATTEMPTS);
  if (options.sourceId?.trim()) query = query.eq("id", options.sourceId.trim());
  else query = query.lte("run_after", new Date().toISOString()).order("created_at", { ascending: true });
  const { data, error } = await query.limit(options.sourceId ? 1 : limit(options.limit));
  if (error) throw new Error(`Failed to load activity source queue: ${error.message}`);
  return (data ?? []) as SourceRow[];
}

async function claim(supabase: SupabaseClient<Database>, item: SourceRow) {
  const { data, error } = await supabase.from("activity_sources").update({
    status: "processing", processing_started_at: new Date().toISOString(), error_message: null, attempts: item.attempts + 1,
  } as never).eq("id", item.id).eq("status", item.status).select("*").maybeSingle();
  if (error) throw new Error(`Failed to claim activity source ${item.id}: ${error.message}`);
  return data as SourceRow | null;
}

async function persistExtraction(supabase: SupabaseClient<Database>, source: SourceRow, apiKey: string) {
  const extracted = await extractActivitiesFromMarkdown(apiKey, {
    title: source.title, sourceUrl: source.source_url, rawMarkdown: source.raw_markdown,
  });
  const locals = extracted.reusable_activities.map((item) => ({
    source_id: source.id, ...item, status: "active", is_evergreen: true,
  }));
  if (locals.length > 0) {
    const { error } = await supabase.from("local_activities").upsert(locals as never, { onConflict: "activity_key" });
    if (error) throw new Error(`Failed to save reusable activities: ${error.message}`);
  }

  const reusableKeys = extracted.seasonal_instances.map((item) => item.reusable_activity_key).filter((item): item is string => Boolean(item));
  const { data: linked, error: linkedError } = reusableKeys.length > 0
    ? await supabase.from("local_activities").select("id, activity_key").in("activity_key", reusableKeys)
    : { data: [], error: null };
  if (linkedError) throw new Error(`Failed to link reusable activities: ${linkedError.message}`);
  const ids = new Map(((linked ?? []) as Array<{ id: string; activity_key: string }>).map((item) => [item.activity_key, item.id]));
  const seasonal = extracted.seasonal_instances.map((item) => ({
    source_id: source.id, activity_id: item.reusable_activity_key ? ids.get(item.reusable_activity_key) ?? null : null,
    instance_key: item.instance_key, season: item.season, title: item.title, description: item.description,
    valid_from: item.valid_from, valid_until: item.valid_until, occurrence_dates: item.occurrence_dates,
    time_text: item.time_text, address: item.address, area: item.area, cost_level: item.cost_level,
    price_text: item.price_text, cost_notes: item.cost_notes, booking_required: item.booking_required,
    booking_deadline: item.booking_deadline, booking_url: item.booking_url, weather_fit: item.weather_fit,
    energy_level: item.energy_level, age_min: item.age_min, age_max: item.age_max, age_notes: item.age_notes,
    tags: item.tags, status: "active", extraction_confidence: item.extraction_confidence,
  }));
  if (seasonal.length > 0) {
    const { error } = await supabase.from("seasonal_activity_instances").upsert(seasonal as never, { onConflict: "source_id,instance_key" });
    if (error) throw new Error(`Failed to save seasonal activities: ${error.message}`);
  }
  return locals.length + seasonal.length;
}

async function processSource(env: Env, supabase: SupabaseClient<Database>, item: SourceRow) {
  const source = await claim(supabase, item);
  if (!source) return { id: item.id, status: "skipped" as const, error: "Source was already claimed" };
  try {
    const extracted = await persistExtraction(supabase, source, env.GEMINI_API_KEY!);
    const { error } = await supabase.from("activity_sources").update({
      status: "processed", activities_extracted: extracted, error_message: null,
      processed_at: new Date().toISOString(), processing_started_at: null,
    } as never).eq("id", source.id);
    if (error) throw new Error(`Failed to complete activity source: ${error.message}`);
    return { id: source.id, status: "completed" as const, extracted };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const finalFailure = source.attempts >= MAX_ATTEMPTS;
    const retryAt = new Date(Date.now() + Math.min(source.attempts, MAX_ATTEMPTS) * 60 * 60 * 1000).toISOString();
    const { error: updateError } = await supabase.from("activity_sources").update({
      status: finalFailure ? "failed" : "queued", error_message: message.slice(0, 800),
      processing_started_at: null, processed_at: finalFailure ? new Date().toISOString() : null, run_after: retryAt,
    } as never).eq("id", source.id);
    if (updateError) console.error(`Failed to record activity source failure ${source.id}:`, updateError.message);
    console.warn(`Activity source queue item failed (${source.id}):`, message);
    return { id: source.id, status: "failed" as const, error: message };
  }
}

export async function runActivitySourceQueue(env: Env, options: { limit?: number; sourceId?: string } = {}): Promise<ActivitySourceQueueSummary> {
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");
  const supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
  await recoverStaleClaims(supabase);
  const sources = await loadSources(supabase, options);
  const items = [];
  for (const source of sources) items.push(await processSource(env, supabase, source));
  return {
    processed: items.length,
    completed: items.filter((item) => item.status === "completed").length,
    failed: items.filter((item) => item.status === "failed").length,
    skipped: items.filter((item) => item.status === "skipped").length,
    items,
  };
}
