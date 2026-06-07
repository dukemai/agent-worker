import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { cleanText, isOneOf } from "@/lib/trip-ops";

type Params = { params: Promise<{ id: string }> };

const leadTypes = ["place", "person", "event", "concept", "building", "nature", "food", "tradition", "other"] as const;

export async function POST(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) return auth.error;

  const { id } = await params;
  const payload = await request.json();
  const title = cleanText(payload.title, 180);
  const leadType = isOneOf(payload.lead_type, leadTypes) ? payload.lead_type : "other";
  const area = cleanText(payload.area, 80);
  const relatedPlace = cleanText(payload.related_place, 160);
  const sourceReason = cleanText(payload.source_reason, 500);
  const whyInteresting = cleanText(payload.why_interesting, 500);
  const sourceUrl = cleanText(payload.source_url, 1000);

  if (!title) return errorResponse("title is required");

  const { data: trip, error: tripError } = await auth.supabase
    .from("trips")
    .select("id, destination")
    .eq("id", id)
    .maybeSingle();
  if (tripError) return errorResponse(tripError.message, 500);
  if (!trip) return errorResponse("Trip not found", 404);

  const searchTerms = cleanStringArray(payload.suggested_search_terms, 14, 180);
  const contentTypes = cleanStringArray(payload.potential_content_types, 8, 80);
  const now = new Date().toISOString();
  const extraction = {
    planning: {
      summary: "",
      places: [],
      activities: [],
      food_spots: [],
      rainy_day_ideas: [],
      kid_relevance: null,
      season_or_weather_notes: null,
      booking_or_logistics_notes: null,
      avoid_if: null,
      candidate_option_titles: [],
      tags: [],
    },
    stories: {
      summary: `Manual research lead: ${title}`,
      stories: [],
      research_leads: [
        {
          title,
          lead_type: leadType,
          area: area ?? null,
          related_place: relatedPlace ?? null,
          source_reason: sourceReason ?? "Added manually from current trip knowledge.",
          why_interesting: whyInteresting ?? null,
          research_questions: [
            `What is important or interesting about ${title}?`,
            `What should we notice when visiting or explaining ${title}?`,
          ],
          suggested_search_terms: searchTerms.length > 0
            ? searchTerms
            : buildDefaultSearchTerms(title, area, relatedPlace, trip.destination),
          potential_content_types: contentTypes.length > 0 ? contentTypes : ["story", "kid explanation"],
          priority: "medium",
        },
      ],
      concepts: [],
      people: [],
      places_mentioned: relatedPlace ? [relatedPlace] : [],
      timeline: [],
      kid_explanations: [],
      tags: ["manual", "research"],
    },
  };

  const { data: knowledge, error } = await auth.supabase
    .from("trip_knowledge_items")
    .insert({
      trip_id: id,
      title: `Research: ${title}`,
      source_url: sourceUrl ?? null,
      raw_markdown: `Manual research lead created from current trip knowledge: ${title}`,
      extraction_focus: "stories",
      extraction,
      tags: ["manual", "research"],
      status: "processed",
      error_message: null,
      extracted_at: now,
    })
    .select("*")
    .single();

  if (error || !knowledge) {
    return errorResponse(error?.message ?? "Failed to create research lead", 500);
  }

  return NextResponse.json({ knowledge }, { status: 201 });
}

function buildDefaultSearchTerms(title: string, area: string | null | undefined, relatedPlace: string | null | undefined, destination: string | null | undefined): string[] {
  const base = Array.from(new Set([title, relatedPlace, [title, area].filter(Boolean).join(" "), [title, destination].filter(Boolean).join(" ")]
    .filter((term): term is string => typeof term === "string")
    .map((term) => term.trim())
    .filter(Boolean)));
  if (!shouldAddSwedishSearchTerms(title, area, destination)) return base.slice(0, 14);

  return Array.from(new Set([
    ...base,
    `${title} Gotland`,
    `${title} Visby`,
    `${title} historia`,
    `${title} kulturhistoria`,
    `${title} sevärdhet`,
  ])).slice(0, 14);
}

function shouldAddSwedishSearchTerms(title: string, area: string | null | undefined, destination: string | null | undefined) {
  const text = [title, area, destination].filter(Boolean).join(" ").toLocaleLowerCase("sv-SE");
  return /[åäöé]/i.test(text) || text.includes("gotland") || text.includes("visby") || text.includes("fårö") || text.includes("faro") || text.includes("sweden") || text.includes("sverige");
}

function cleanStringArray(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}
