import { GoogleGenerativeAI } from "@google/generative-ai";

export type TripOptionSuggestion = {
  title: string;
  option_type: "activity" | "food" | "rainy_day" | "scenic_stop" | "logistics" | "other";
  location: string | null;
  best_for: string | null;
  effort: "low" | "medium" | "high" | null;
  weather_fit: "sun" | "rain" | "any" | null;
  kid_fit: "low" | "medium" | "high" | null;
  booking_needed: boolean;
  why: string;
  notes: string | null;
};

export type TripOptionSuggestionInput = {
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
  knowledge_context: unknown[];
  favorite_knowledge: unknown[];
  existing_options: string[];
};

export function buildTripOptionSuggestionPrompt(input: TripOptionSuggestionInput): string {
  return [
    "Return JSON only: {\"options\":[...]}",
    "Suggest 6-10 practical family trip option cards for Dad-Ops.",
    "Each option must contain: title, option_type, location, best_for, effort, weather_fit, kid_fit, booking_needed, why, notes.",
    "Allowed option_type: activity, food, rainy_day, scenic_stop, logistics, other.",
    "Allowed effort/kid_fit: low, medium, high, or null. Allowed weather_fit: sun, rain, any, or null.",
    "Use known logistics as hard context. Avoid existing options and avoid repeating already-done places or patterns.",
    "Prioritize favorite knowledge as anchors, but combine nearby places and activities into useful option blocks instead of making one option per favorite.",
    "Use extracted trip knowledge as grounded inspiration. Use only source links present in the JSON context, and do not invent details beyond that context.",
    "",
    `Trip title: ${input.title}`,
    `Destination: ${input.destination}`,
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
    "Favorite knowledge JSON:",
    JSON.stringify(input.favorite_knowledge ?? [], null, 2),
    "",
    "Extracted trip knowledge JSON:",
    JSON.stringify(input.knowledge_context ?? [], null, 2),
    "",
    "Existing options:",
    input.existing_options.map((option) => `- ${option}`).join("\n") || "- none",
  ].join("\n");
}

export async function suggestTripOptions(
  apiKey: string,
  input: TripOptionSuggestionInput,
  promptOverride?: string
): Promise<{ options: TripOptionSuggestion[] }> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = promptOverride?.trim() || buildTripOptionSuggestionPrompt(input);

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text?.trim()) throw new Error("Gemini returned empty trip option suggestions");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Gemini returned invalid JSON: ${message}. First 200 chars: ${text.slice(0, 200)}`);
  }

  return { options: sanitizeOptions(parsed, input.existing_options) };
}

function sanitizeOptions(parsed: unknown, existingTitles: string[]): TripOptionSuggestion[] {
  const rawOptions =
    parsed && typeof parsed === "object" && Array.isArray((parsed as { options?: unknown }).options)
      ? (parsed as { options: unknown[] }).options
      : [];
  const optionTypes = new Set(["activity", "food", "rainy_day", "scenic_stop", "logistics", "other"]);
  const efforts = new Set(["low", "medium", "high"]);
  const weatherFits = new Set(["sun", "rain", "any"]);
  const kidFits = new Set(["low", "medium", "high"]);
  const seen = new Set(existingTitles.map((option) => option.trim().toLocaleLowerCase("sv-SE")));

  return rawOptions
    .map((raw): TripOptionSuggestion | null => {
      if (!raw || typeof raw !== "object") return null;
      const option = raw as Record<string, unknown>;
      const title = cleanString(option.title, 120);
      if (!title) return null;
      const key = title.toLocaleLowerCase("sv-SE");
      if (seen.has(key)) return null;
      seen.add(key);
      return {
        title,
        option_type: typeof option.option_type === "string" && optionTypes.has(option.option_type) ? option.option_type as TripOptionSuggestion["option_type"] : "other",
        location: cleanString(option.location, 180),
        best_for: cleanString(option.best_for, 240),
        effort: typeof option.effort === "string" && efforts.has(option.effort) ? option.effort as TripOptionSuggestion["effort"] : null,
        weather_fit: typeof option.weather_fit === "string" && weatherFits.has(option.weather_fit) ? option.weather_fit as TripOptionSuggestion["weather_fit"] : null,
        kid_fit: typeof option.kid_fit === "string" && kidFits.has(option.kid_fit) ? option.kid_fit as TripOptionSuggestion["kid_fit"] : null,
        booking_needed: option.booking_needed === true,
        why: cleanString(option.why, 500) ?? "Suggested from trip context.",
        notes: cleanString(option.notes, 500),
      };
    })
    .filter((option): option is TripOptionSuggestion => option !== null)
    .slice(0, 10);
}

function cleanString(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim().slice(0, maxLength) : null;
}
