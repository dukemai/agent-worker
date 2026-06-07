import { GoogleGenerativeAI } from "@google/generative-ai";

export const tripStoryContentStyles = [
  "concise_trip_guide",
  "family_kid_friendly",
  "historical_deep_dive",
  "place_profile",
  "walking_tour_narration",
  "content_hub_article",
] as const;

export type TripStoryContentStyle = (typeof tripStoryContentStyles)[number];

export type TripStoryContentMaterial = {
  title: string;
  story_type: string | null;
  area: string | null;
  related_place: string | null;
  summary: string | null;
  story: string | null;
  why_it_matters: string | null;
  what_to_notice: string[];
  good_for: string[];
  source_titles: string[];
  source_links: { title: string; url: string }[];
  source_research_leads: TripStoryContentLead[];
};

export type TripStoryContentLead = {
  key: string;
  title: string;
  lead_type: string;
  area: string | null;
  related_place: string | null;
  source_reason: string | null;
  why_interesting: string | null;
  research_questions: string[];
  suggested_search_terms: string[];
  potential_content_types: string[];
  priority: string;
  source_titles: string[];
  source_links: { title: string; url: string }[];
};

export type TripStoryContentScaffold = {
  suggested_title: string;
  subject: string;
  style: TripStoryContentStyle;
  short_version: string;
  long_outline: { heading: string; points: string[] }[];
  key_angles: string[];
  kid_hook: string | null;
  what_to_notice: string[];
  source_notes: string[];
  open_questions: string[];
};

export function buildTripStoryContentPrompt(input: {
  tripTitle: string;
  destination: string;
  subject: string | null;
  area: string | null;
  style: TripStoryContentStyle;
  selectedMaterials: TripStoryContentMaterial[];
  selectedResearchLeads: TripStoryContentLead[];
}): string {
  return [
    "Return JSON only.",
    "Create a destination content scaffold for Dad-Ops from the selected bundle of story materials and research leads.",
    "Shape: {\"suggested_title\":\"...\",\"subject\":\"...\",\"style\":\"concise_trip_guide\",\"short_version\":\"...\",\"long_outline\":[{\"heading\":\"...\",\"points\":[]}],\"key_angles\":[],\"kid_hook\":null,\"what_to_notice\":[],\"source_notes\":[],\"open_questions\":[]}",
    "Derive subject and suggested_title from the selected bundle. If a subject hint is provided, use it only when it matches the bundle.",
    "Use selected story materials as the grounded content basis. Research leads are framing, search intent, useful questions, and gap signals; do not present a research lead as factual content unless the selected story materials support it.",
    "Use only the selected materials below for facts. Do not invent facts, dates, comparisons, names, or source links beyond the materials.",
    "Copyright hygiene: write in original wording. Do not copy, quote, or closely paraphrase source text or material text. If the selected material is thin, prefer open_questions instead of pretending certainty.",
    "The short_version should be concise and useful during a visit. The long_outline should be a scaffold, not a finished article.",
    "Style guide:",
    "- concise_trip_guide: practical, compact, visit-ready.",
    "- family_kid_friendly: simple language, curiosity hooks, not childish.",
    "- historical_deep_dive: timeline, context, uncertainties, research gaps.",
    "- place_profile: identity, why it matters, what to notice, how it connects to the destination.",
    "- walking_tour_narration: ordered talking points for being on location.",
    "- content_hub_article: structured web article outline with intro angle and sections.",
    "",
    `Trip: ${input.tripTitle}`,
    `Destination: ${input.destination || "unknown"}`,
    `Subject hint: ${input.subject ?? "derive from selected bundle"}`,
    `Area: ${input.area ?? "unknown"}`,
    `Style: ${input.style}`,
    "",
    "Selected research leads JSON:",
    JSON.stringify(input.selectedResearchLeads, null, 2),
    "",
    "Selected story materials JSON:",
    JSON.stringify(input.selectedMaterials, null, 2),
  ].join("\n");
}

export async function generateTripStoryContentScaffold(
  apiKey: string,
  input: {
    tripTitle: string;
    destination: string;
    subject: string | null;
    area: string | null;
    style: TripStoryContentStyle;
    selectedMaterials: TripStoryContentMaterial[];
    selectedResearchLeads: TripStoryContentLead[];
  }
): Promise<TripStoryContentScaffold> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = buildTripStoryContentPrompt(input);
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text?.trim()) throw new Error("Gemini returned empty trip story content");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Gemini returned invalid JSON: ${message}. First 200 chars: ${text.slice(0, 200)}`);
  }

  return sanitizeScaffold(parsed, input.subject, input.style);
}

export function sanitizeStoryContentMaterials(value: unknown): TripStoryContentMaterial[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): TripStoryContentMaterial | null => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const title = cleanString(record.title, 180);
      if (!title) return null;
      return {
        title,
        story_type: cleanString(record.story_type, 80),
        area: cleanString(record.area, 80),
        related_place: cleanString(record.related_place, 160),
        summary: cleanString(record.summary, 700),
        story: cleanString(record.story, 1200),
        why_it_matters: cleanString(record.why_it_matters, 700),
        what_to_notice: cleanStringArray(record.what_to_notice, 12, 180),
        good_for: cleanStringArray(record.good_for, 8, 80),
        source_titles: cleanStringArray(record.source_titles, 8, 160),
        source_links: cleanSourceLinks(record.source_links),
        source_research_leads: sanitizeStoryContentLeads(record.source_research_leads),
      };
    })
    .filter((item): item is TripStoryContentMaterial => item !== null)
    .slice(0, 30);
}

export function sanitizeStoryContentLeads(value: unknown): TripStoryContentLead[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): TripStoryContentLead | null => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const title = cleanString(record.title, 180);
      if (!title) return null;
      return {
        key: cleanString(record.key, 260) ?? title,
        title,
        lead_type: cleanString(record.lead_type, 80) ?? "other",
        area: cleanString(record.area, 80),
        related_place: cleanString(record.related_place, 160),
        source_reason: cleanString(record.source_reason, 700),
        why_interesting: cleanString(record.why_interesting, 700),
        research_questions: cleanStringArray(record.research_questions, 12, 220),
        suggested_search_terms: cleanStringArray(record.suggested_search_terms, 14, 180),
        potential_content_types: cleanStringArray(record.potential_content_types, 10, 100),
        priority: cleanString(record.priority, 40) ?? "medium",
        source_titles: cleanStringArray(record.source_titles, 8, 160),
        source_links: cleanSourceLinks(record.source_links),
      };
    })
    .filter((item): item is TripStoryContentLead => item !== null)
    .slice(0, 30);
}

function sanitizeScaffold(parsed: unknown, subject: string | null, style: TripStoryContentStyle): TripStoryContentScaffold {
  const value = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  const fallbackSubject = subject ?? "Selected destination story";
  return {
    suggested_title: cleanString(value.suggested_title, 180) ?? fallbackSubject,
    subject: cleanString(value.subject, 180) ?? fallbackSubject,
    style,
    short_version: cleanString(value.short_version, 1200) ?? "No short version generated.",
    long_outline: cleanOutline(value.long_outline),
    key_angles: cleanStringArray(value.key_angles, 10, 180),
    kid_hook: cleanString(value.kid_hook, 500),
    what_to_notice: cleanStringArray(value.what_to_notice, 12, 180),
    source_notes: cleanStringArray(value.source_notes, 12, 220),
    open_questions: cleanStringArray(value.open_questions, 12, 220),
  };
}

function cleanOutline(value: unknown): { heading: string; points: string[] }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): { heading: string; points: string[] } | null => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const heading = cleanString(record.heading, 160);
      if (!heading) return null;
      return {
        heading,
        points: cleanStringArray(record.points, 8, 220),
      };
    })
    .filter((item): item is { heading: string; points: string[] } => item !== null)
    .slice(0, 10);
}

function cleanSourceLinks(value: unknown): { title: string; url: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): { title: string; url: string } | null => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const url = cleanString(record.url, 1000);
      if (!url) return null;
      return {
        title: cleanString(record.title, 160) ?? url,
        url,
      };
    })
    .filter((item): item is { title: string; url: string } => item !== null)
    .slice(0, 8);
}

function cleanStringArray(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function cleanString(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim().slice(0, maxLength) : null;
}
