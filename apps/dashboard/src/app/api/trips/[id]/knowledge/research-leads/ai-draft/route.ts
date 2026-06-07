import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { generateTripResearchLeadAiDraft, type TripKnowledgeResearchLead } from "@/lib/trip-knowledge-extraction";
import { cleanText, isOneOf } from "@/lib/trip-ops";

type Params = { params: Promise<{ id: string }> };

const leadTypes = ["place", "person", "event", "concept", "building", "nature", "food", "tradition", "other"] as const;
const leadPriorities = ["low", "medium", "high"] as const;

export async function POST(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) return auth.error;

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return errorResponse("GEMINI_API_KEY is not configured on the server.", 503);
  }

  const { id } = await params;
  const payload = await request.json();
  const lead = cleanLead(payload.lead);
  if (!lead) return errorResponse("lead.title is required");

  const { data: trip, error: tripError } = await auth.supabase
    .from("trips")
    .select("id, title, destination")
    .eq("id", id)
    .maybeSingle();
  if (tripError) return errorResponse(tripError.message, 500);
  if (!trip) return errorResponse("Trip not found", 404);

  try {
    const draft = await generateTripResearchLeadAiDraft(apiKey, {
      tripTitle: trip.title,
      destination: trip.destination,
      lead,
    });
    return NextResponse.json({ draft });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Failed to generate AI research draft", 500);
  }
}

function cleanLead(value: unknown): TripKnowledgeResearchLead | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const title = cleanText(record.title, 180);
  if (!title) return null;
  return {
    title,
    lead_type: isOneOf(record.lead_type, leadTypes) ? record.lead_type : "other",
    area: cleanText(record.area, 80) ?? null,
    related_place: cleanText(record.related_place, 160) ?? null,
    source_reason: cleanText(record.source_reason, 700) ?? null,
    why_interesting: cleanText(record.why_interesting, 700) ?? null,
    research_questions: cleanStringArray(record.research_questions, 12, 220),
    suggested_search_terms: cleanStringArray(record.suggested_search_terms, 14, 180),
    potential_content_types: cleanStringArray(record.potential_content_types, 10, 100),
    priority: isOneOf(record.priority, leadPriorities) ? record.priority : "medium",
  };
}

function cleanStringArray(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}
