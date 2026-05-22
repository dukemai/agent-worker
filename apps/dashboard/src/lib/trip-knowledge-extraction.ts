import { GoogleGenerativeAI } from "@google/generative-ai";

export type TripKnowledgeExtraction = {
  summary: string;
  places: TripKnowledgePlace[];
  activities: TripKnowledgeActivity[];
  food_spots: string[];
  rainy_day_ideas: string[];
  kid_relevance: string | null;
  season_or_weather_notes: string | null;
  booking_or_logistics_notes: string | null;
  avoid_if: string | null;
  candidate_option_titles: string[];
  tags: string[];
};

export type TripKnowledgePlace = {
  name: string;
  area: string | null;
  approx_location: string | null;
  why: string | null;
  best_for: string[];
  weather_fit: "sun" | "rain" | "any" | null;
  time_needed: string | null;
};

export type TripKnowledgeActivity = {
  name: string;
  happens_at: string | null;
  area: string | null;
  approx_location: string | null;
  effort: "low" | "medium" | "high" | null;
  kid_fit: "low" | "medium" | "high" | null;
  weather_fit: "sun" | "rain" | "any" | null;
  time_needed: string | null;
  pair_with: string[];
  why: string | null;
};

export async function extractTripKnowledge(
  apiKey: string,
  input: {
    tripTitle: string;
    destination: string;
    knowledgeTitle: string;
    sourceUrl: string | null;
    rawMarkdown: string;
  }
): Promise<TripKnowledgeExtraction> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = [
    "Return JSON only.",
    "Extract family trip planning knowledge from the markdown inspiration.",
    "Shape: {\"summary\":\"...\",\"places\":[{\"name\":\"...\",\"area\":null,\"approx_location\":null,\"why\":null,\"best_for\":[],\"weather_fit\":null,\"time_needed\":null}],\"activities\":[{\"name\":\"...\",\"happens_at\":null,\"area\":null,\"approx_location\":null,\"effort\":null,\"kid_fit\":null,\"weather_fit\":null,\"time_needed\":null,\"pair_with\":[],\"why\":null}],\"food_spots\":[],\"rainy_day_ideas\":[],\"kid_relevance\":null,\"season_or_weather_notes\":null,\"booking_or_logistics_notes\":null,\"avoid_if\":null,\"candidate_option_titles\":[],\"tags\":[]}",
    "For places and activities, include approximate area and location when the source implies it. Useful areas include Visby, North Gotland, Fårö, East coast, South Gotland, West coast, Central Gotland, near ferry, near accommodation, or unknown.",
    "Keep every field practical for deciding trip options. Do not invent facts not supported by the source.",
    "",
    `Trip: ${input.tripTitle}`,
    `Destination: ${input.destination || "unknown"}`,
    `Knowledge title: ${input.knowledgeTitle}`,
    `Source URL: ${input.sourceUrl ?? "none"}`,
    "",
    "Markdown:",
    input.rawMarkdown,
  ].join("\n");

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text?.trim()) throw new Error("Gemini returned empty trip knowledge extraction");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Gemini returned invalid JSON: ${message}. First 200 chars: ${text.slice(0, 200)}`);
  }

  return sanitizeExtraction(parsed);
}

export async function generateTripKnowledgeStarter(
  apiKey: string,
  input: {
    title: string;
    destination: string;
    start_date: string | null;
    end_date: string | null;
    logistics: string | null;
    logistics_details: unknown;
    adult_count: number;
    kid_count: number;
    kid_ages: number[];
    already_done: string | null;
    preferences: string | null;
    selected_preferences: string[];
    existing_knowledge_titles: string[];
  }
): Promise<TripKnowledgeExtraction> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = [
    "Return JSON only.",
    "Create starter trip knowledge for Dad-Ops: a practical first list of places and activities to research.",
    "Shape: {\"summary\":\"...\",\"places\":[{\"name\":\"...\",\"area\":null,\"approx_location\":null,\"why\":null,\"best_for\":[],\"weather_fit\":null,\"time_needed\":null}],\"activities\":[{\"name\":\"...\",\"happens_at\":null,\"area\":null,\"approx_location\":null,\"effort\":null,\"kid_fit\":null,\"weather_fit\":null,\"time_needed\":null,\"pair_with\":[],\"why\":null}],\"food_spots\":[],\"rainy_day_ideas\":[],\"kid_relevance\":null,\"season_or_weather_notes\":null,\"booking_or_logistics_notes\":null,\"avoid_if\":null,\"candidate_option_titles\":[],\"tags\":[]}",
    "Suggest approximately 8-14 places and 8-14 activities. Include approximate area and location for planning route clusters.",
    "Prefer family-practical ideas. Respect already-done / avoid-repeat notes and existing knowledge titles.",
    "Use areas such as Visby, North Gotland, Fårö, East coast, South Gotland, West coast, Central Gotland, near ferry, near accommodation, or unknown.",
    "",
    `Trip title: ${input.title}`,
    `Destination: ${input.destination || "unknown"}`,
    `Dates: ${input.start_date ?? "unknown"} to ${input.end_date ?? "unknown"}`,
    `Adults: ${input.adult_count}`,
    `Kids: ${input.kid_count}`,
    `Kid ages: ${input.kid_ages.join(", ") || "unknown"}`,
    "",
    "Logistics notes:",
    input.logistics ?? "",
    "",
    "Extracted logistics JSON:",
    JSON.stringify(input.logistics_details ?? {}, null, 2),
    "",
    "Already done / avoid repeating:",
    input.already_done ?? "",
    "",
    "Selected preferences:",
    input.selected_preferences.map((preference) => `- ${preference}`).join("\n") || "- none",
    "",
    "Preference notes:",
    input.preferences ?? "",
    "",
    "Existing knowledge titles:",
    input.existing_knowledge_titles.map((title) => `- ${title}`).join("\n") || "- none",
  ].join("\n");

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text?.trim()) throw new Error("Gemini returned empty trip knowledge starter");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Gemini returned invalid JSON: ${message}. First 200 chars: ${text.slice(0, 200)}`);
  }

  return sanitizeExtraction(parsed);
}

function sanitizeExtraction(parsed: unknown): TripKnowledgeExtraction {
  const value = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  return {
    summary: cleanString(value.summary, 800) ?? "No summary extracted.",
    places: cleanPlaces(value.places),
    activities: cleanActivities(value.activities),
    food_spots: cleanStringArray(value.food_spots, 20, 160),
    rainy_day_ideas: cleanStringArray(value.rainy_day_ideas, 20, 160),
    kid_relevance: cleanString(value.kid_relevance, 500),
    season_or_weather_notes: cleanString(value.season_or_weather_notes, 500),
    booking_or_logistics_notes: cleanString(value.booking_or_logistics_notes, 500),
    avoid_if: cleanString(value.avoid_if, 500),
    candidate_option_titles: cleanStringArray(value.candidate_option_titles, 20, 140),
    tags: cleanStringArray(value.tags, 20, 60),
  };
}

function cleanPlaces(value: unknown): TripKnowledgePlace[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): TripKnowledgePlace | null => {
      if (typeof item === "string") {
        const name = cleanString(item, 120);
        return name ? { name, area: null, approx_location: null, why: null, best_for: [], weather_fit: null, time_needed: null } : null;
      }
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const name = cleanString(record.name, 120);
      if (!name) return null;
      return {
        name,
        area: cleanString(record.area, 80),
        approx_location: cleanString(record.approx_location, 160),
        why: cleanString(record.why, 300),
        best_for: cleanStringArray(record.best_for, 8, 60),
        weather_fit: cleanEnum(record.weather_fit, ["sun", "rain", "any"]),
        time_needed: cleanString(record.time_needed, 80),
      };
    })
    .filter((item): item is TripKnowledgePlace => item !== null)
    .slice(0, 30);
}

function cleanActivities(value: unknown): TripKnowledgeActivity[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): TripKnowledgeActivity | null => {
      if (typeof item === "string") {
        const name = cleanString(item, 160);
        return name
          ? {
              name,
              happens_at: null,
              area: null,
              approx_location: null,
              effort: null,
              kid_fit: null,
              weather_fit: null,
              time_needed: null,
              pair_with: [],
              why: null,
            }
          : null;
      }
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const name = cleanString(record.name, 160);
      if (!name) return null;
      return {
        name,
        happens_at: cleanString(record.happens_at, 160),
        area: cleanString(record.area, 80),
        approx_location: cleanString(record.approx_location, 160),
        effort: cleanEnum(record.effort, ["low", "medium", "high"]),
        kid_fit: cleanEnum(record.kid_fit, ["low", "medium", "high"]),
        weather_fit: cleanEnum(record.weather_fit, ["sun", "rain", "any"]),
        time_needed: cleanString(record.time_needed, 80),
        pair_with: cleanStringArray(record.pair_with, 8, 80),
        why: cleanString(record.why, 300),
      };
    })
    .filter((item): item is TripKnowledgeActivity => item !== null)
    .slice(0, 30);
}

function cleanStringArray(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function cleanEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? value as T : null;
}

function cleanString(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim().slice(0, maxLength) : null;
}
