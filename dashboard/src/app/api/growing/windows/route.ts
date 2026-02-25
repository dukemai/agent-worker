import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { data, error } = await auth.supabase
    .from("growing_windows")
    .select(
      "id, source_id, item_key, item_name, suggestion_kind, action_type, start_month, end_month, priority, suggested_bucket, stockholm_note, tags, verified, created_at, source:growing_sources(id, url, title, channel)"
    )
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    return errorResponse(error.message, 500);
  }

  const windows = (data ?? []).map((row) => {
    const raw = row as Record<string, unknown> & { source?: unknown };
    const sourceValue = raw.source;
    const sourceObj =
      sourceValue && typeof sourceValue === "object" && !Array.isArray(sourceValue)
        ? (sourceValue as { id?: string; url?: string | null; title?: string | null; channel?: string | null })
        : Array.isArray(sourceValue) && sourceValue[0]
          ? (sourceValue[0] as { id?: string; url?: string | null; title?: string | null; channel?: string | null })
          : null;
    const { source: _s, ...rest } = raw;
    return {
      ...rest,
      source: sourceObj
        ? {
            id: sourceObj.id ?? "",
            url: sourceObj.url ?? null,
            title: sourceObj.title ?? null,
            channel: sourceObj.channel ?? null,
          }
        : null,
    };
  });

  return NextResponse.json({ windows });
}
