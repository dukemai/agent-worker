import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { cleanText } from "@/lib/trip-ops";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) return auth.error;

  const { id } = await params;
  const payload = await request.json();
  const title = cleanText(payload.title, 180);
  const rawMarkdown = cleanText(payload.raw_markdown, 30000);
  const sourceUrl = cleanText(payload.source_url, 1000);
  const extractionFocus = parseExtractionFocus(payload.extraction_focus);
  const sourceResearchLeads = cleanResearchLeadReferences(payload.source_research_leads);

  if (!title) return errorResponse("title is required");
  if (!rawMarkdown) return errorResponse("raw_markdown is required");
  if (!extractionFocus) return errorResponse("extraction_focus must be planning, stories, or both");

  const { data: trip, error: tripError } = await auth.supabase
    .from("trips")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (tripError) return errorResponse(tripError.message, 500);
  if (!trip) return errorResponse("Trip not found", 404);

  const { data: knowledge, error } = await auth.supabase
    .from("trip_knowledge_items")
    .insert({
      trip_id: id,
      title,
      source_url: sourceUrl,
      raw_markdown: rawMarkdown,
      extraction_focus: extractionFocus,
      source_research_leads: sourceResearchLeads,
      status: "queued",
      extraction: {},
      tags: [],
      error_message: null,
      extracted_at: null,
    })
    .select("*")
    .single();

  if (error || !knowledge) {
    return errorResponse(error?.message ?? "Failed to create trip knowledge", 500);
  }

  return NextResponse.json({ knowledge }, { status: 201 });
}

function parseExtractionFocus(value: unknown) {
  if (value === undefined || value === null || value === "") return "both";
  return value === "planning" || value === "stories" || value === "both" ? value : null;
}

function cleanResearchLeadReferences(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const title = cleanText(record.title, 180);
      if (!title) return null;
      return {
        key: cleanText(record.key, 260) ?? buildResearchLeadKey(record),
        title,
        lead_type: cleanText(record.lead_type, 80) ?? "other",
        area: cleanText(record.area, 80),
        related_place: cleanText(record.related_place, 160),
        source_reason: cleanText(record.source_reason, 700),
        why_interesting: cleanText(record.why_interesting, 700),
        research_questions: cleanStringArray(record.research_questions, 12, 220),
        suggested_search_terms: cleanStringArray(record.suggested_search_terms, 14, 180),
        potential_content_types: cleanStringArray(record.potential_content_types, 10, 100),
        priority: cleanText(record.priority, 40) ?? "medium",
        source_titles: cleanStringArray(record.source_titles, 8, 160),
        source_links: cleanSourceLinks(record.source_links),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .slice(0, 10);
}

function buildResearchLeadKey(record: Record<string, unknown>) {
  return [record.area, record.lead_type, record.related_place, record.title]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim().toLocaleLowerCase("sv-SE"))
    .join("::");
}

function cleanStringArray(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function cleanSourceLinks(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const url = cleanText(record.url, 1000);
      if (!url) return null;
      return {
        title: cleanText(record.title, 160) ?? url,
        url,
      };
    })
    .filter((item): item is { title: string; url: string } => item !== null)
    .slice(0, 8);
}
