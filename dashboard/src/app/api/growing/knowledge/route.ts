import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import type { GrowingKnowledgeCategory } from "@/types/database";

const CATEGORIES: GrowingKnowledgeCategory[] = [
  "technique",
  "plant-profile",
  "soil",
  "pest-control",
  "companion-planting",
  "preservation",
  "general",
];

const SEASONS = ["spring", "summer", "autumn", "winter"] as const;

function parseCsv(input: string | null): string[] {
  if (!input) {
    return [];
  }
  return input
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export async function GET(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const tags = parseCsv(url.searchParams.get("tags"));
  const seasons = parseCsv(url.searchParams.get("season_relevance")).filter((item): item is (typeof SEASONS)[number] =>
    SEASONS.includes(item as (typeof SEASONS)[number])
  );

  if (category && !CATEGORIES.includes(category as GrowingKnowledgeCategory)) {
    return errorResponse("Invalid category");
  }

  let query = auth.supabase
    .from("growing_knowledge")
    .select(
      "id, source_id, title, content, category, tags, season_relevance, stockholm_relevant, created_at, source:growing_sources(url, title, channel)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (category) {
    query = query.eq("category", category);
  }

  for (const season of seasons) {
    query = query.contains("season_relevance", [season]);
  }

  for (const tag of tags) {
    query = query.contains("tags", [tag]);
  }

  const { data, error } = await query;
  if (error) {
    return errorResponse(error.message, 500);
  }

  const knowledge = (data ?? []).map((row) => {
    const sourceValue = (row as { source?: unknown }).source;
    const source = Array.isArray(sourceValue)
      ? (sourceValue[0] as { url?: string | null; title?: string | null; channel?: string | null } | undefined) ?? null
      : ((sourceValue as { url?: string | null; title?: string | null; channel?: string | null } | null) ?? null);

    return {
      ...row,
      source: source
        ? {
            url: source.url ?? null,
            title: source.title ?? null,
            channel: source.channel ?? null,
          }
        : null,
    };
  });

  return NextResponse.json({
    knowledge,
    filters: {
      category: category ?? null,
      tags,
      season_relevance: seasons,
    },
  });
}
