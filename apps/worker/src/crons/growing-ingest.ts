import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import { extractGrowingKnowledge } from "../lib/gemini";
import { extractYouTubeVideoId } from "../lib/youtube";
import { GROWING_KNOWLEDGE_EXTRACTION } from "../prompts/growing-knowledge";

type GrowingSourceRow = {
  id: string;
  url: string;
  title: string | null;
  channel: string | null;
  description: string | null;
  source_type: string | null;
  status: "queued" | "processing" | "done" | "failed";
  transcript: string | null;
  source_language: string | null;
};

function toItemKey(videoId: string, rawKey: string): string {
  const safe = rawKey
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return `yt_${videoId}_${safe || "tip"}`;
}

export async function runGrowingIngest(env: Env): Promise<void> {
  if (!env.GEMINI_API_KEY) {
    console.log("Skipping growing ingest: GEMINI_API_KEY not configured");
    return;
  }

  const supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
  const { data, error } = await supabase
    .from("growing_sources")
    .select("id, url, title, channel, description, status, transcript")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(5);

  if (error) {
    throw new Error(`Failed to load queued growing sources: ${error.message}`);
  }

  const sources = (data ?? []) as GrowingSourceRow[];
  const withTranscript = sources.filter((s) => (s.transcript?.trim() ?? "").length > 0);
  if (withTranscript.length === 0) {
    return;
  }

  for (const source of withTranscript) {
    try {
      await processOneSource(env, supabase, source);
    } catch (err) {
      console.warn(`Skipping source ${source.id} after error:`, err);
    }
  }
}

export async function processSingleGrowingSource(env: Env, sourceId: string): Promise<{ success: boolean; tips_extracted?: number; error?: string }> {
  if (!env.GEMINI_API_KEY) {
    return { success: false, error: "GEMINI_API_KEY not configured" };
  }

  const supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
  const { data: row, error: fetchError } = await supabase
    .from("growing_sources")
    .select("id, url, title, channel, description, status, transcript")
    .eq("id", sourceId.trim())
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }
  if (!row) {
    return { success: false, error: "Source not found" };
  }

  const source = row as GrowingSourceRow;
  if (source.status !== "queued" && source.status !== "failed") {
    return { success: false, error: "Source is not queued or failed (cannot extract)" };
  }

  const transcriptText = source.transcript?.trim();
  if (!transcriptText) {
    return {
      success: false,
      error:
        "Transcript or article content is missing. Add it for this source in the dashboard (for example, paste a YouTube transcript from https://notegpt.io/ or Markdown from https://give-me-markdown.com/), then try Extract now again.",
    };
  }

  try {
    const tipsExtracted = await processOneSource(env, supabase, source);
    return { success: true, tips_extracted: tipsExtracted };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

async function processOneSource(
  env: Env,
  supabase: SupabaseClient<Database>,
  source: GrowingSourceRow
): Promise<number> {
  const transcriptText = source.transcript?.trim();
  if (!transcriptText) {
    throw new Error(
      "Transcript or article content is missing. Add it in the dashboard (for example, paste a YouTube transcript from https://notegpt.io/ or Markdown from https://give-me-markdown.com/)."
    );
  }

  try {
    await supabase.from("growing_sources").update({ status: "processing", error_message: null } as never).eq("id", source.id);

    const videoId = extractYouTubeVideoId(source.url) ?? source.id.slice(0, 11);
    const sourceLanguage = (source.source_language ?? "").trim().toLowerCase() || "en";
    const prompt = GROWING_KNOWLEDGE_EXTRACTION
      .replace("{{currentDate}}", new Date().toISOString())
      .replace("{{videoTitle}}", source.title ?? "Unknown title")
      .replace("{{channelName}}", source.channel ?? "Unknown channel")
      .replace("{{description}}", (source.description ?? "").trim() || "(No description)")
      .replace("{{transcript}}", transcriptText.slice(0, 100_000))
      .replace("{{sourceLanguage}}", sourceLanguage);

  const extracted = await extractGrowingKnowledge(env.GEMINI_API_KEY, prompt);

  const windowsPayload = extracted.actionable_tips.map((tip) => ({
    source_id: source.id,
    item_key: toItemKey(videoId, tip.item_key),
    item_name: tip.item_name.slice(0, 180),
    suggestion_kind: "action" as const,
    action_type: tip.action_type,
    start_month: tip.start_month,
    end_month: tip.end_month,
    priority: tip.priority,
    suggested_bucket: tip.suggested_bucket,
    stockholm_note: tip.stockholm_note.slice(0, 600),
    tags: tip.tags,
  }));

  if (windowsPayload.length > 0) {
    const { error: windowsError } = await supabase
      .from("growing_windows")
      .upsert(windowsPayload as never, { onConflict: "item_key" });

    if (windowsError) {
      throw new Error(`Failed to insert growing windows: ${windowsError.message}`);
    }
  }

  const knowledgePayload = extracted.knowledge_nuggets.map((nugget) => ({
    source_id: source.id,
    title: nugget.title.slice(0, 220),
    content: nugget.content.slice(0, 4000),
    category: nugget.category,
    tags: nugget.tags,
    season_relevance: nugget.season_relevance,
    stockholm_relevant: nugget.stockholm_relevant,
    location_note: nugget.location_note ?? null,
    language: sourceLanguage,
  }));

  if (knowledgePayload.length > 0) {
    const { error: knowledgeError } = await supabase.from("growing_knowledge").insert(knowledgePayload as never);
    if (knowledgeError) {
      throw new Error(`Failed to insert growing knowledge: ${knowledgeError.message}`);
    }
  }

  const tipsExtracted = windowsPayload.length + knowledgePayload.length;
  const { error: doneError } = await supabase
    .from("growing_sources")
    .update({
      status: "done",
      tips_extracted: tipsExtracted,
      processed_at: new Date().toISOString(),
      error_message: null,
    } as never)
    .eq("id", source.id);

  if (doneError) {
    throw new Error(`Failed to finalize source: ${doneError.message}`);
  }

  return tipsExtracted;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown processing error";
    console.warn(`Growing source processing failed (${source.id}):`, message);
    await supabase
      .from("growing_sources")
      .update({ status: "failed", error_message: message.slice(0, 800), processed_at: new Date().toISOString() } as never)
      .eq("id", source.id);
    throw error;
  }
}
