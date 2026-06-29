import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  ActivityCostLevel,
  ActivityEnergyLevel,
  ActivityType,
  ActivityWeatherFit,
  ActivityConfidence,
} from "@/types/database";

export type ExtractedReusableActivity = {
  activity_key: string;
  title: string;
  description: string | null;
  activity_type: ActivityType;
  age_min: number | null;
  age_max: number | null;
  age_notes: string | null;
  address: string | null;
  area: string | null;
  location_url: string | null;
  cost_level: ActivityCostLevel;
  price_text: string | null;
  cost_notes: string | null;
  booking_required: boolean;
  booking_notes: string | null;
  weather_fit: ActivityWeatherFit;
  energy_level: ActivityEnergyLevel;
  usual_duration_minutes: number | null;
  tags: string[];
};

export type ExtractedSeasonalActivityInstance = {
  instance_key: string;
  reusable_activity_key: string | null;
  season: string;
  title: string;
  description: string | null;
  valid_from: string | null;
  valid_until: string | null;
  occurrence_dates: string[];
  time_text: string | null;
  address: string | null;
  area: string | null;
  cost_level: ActivityCostLevel;
  price_text: string | null;
  cost_notes: string | null;
  booking_required: boolean;
  booking_deadline: string | null;
  booking_url: string | null;
  weather_fit: ActivityWeatherFit;
  energy_level: ActivityEnergyLevel;
  age_min: number | null;
  age_max: number | null;
  age_notes: string | null;
  tags: string[];
  extraction_confidence: ActivityConfidence;
};

export type ActivityExtractionResult = {
  reusable_activities: ExtractedReusableActivity[];
  seasonal_instances: ExtractedSeasonalActivityInstance[];
};

const ACTIVITY_TYPES = new Set<ActivityType>([
  "museum",
  "library",
  "playground",
  "sport",
  "nature",
  "swimming",
  "workshop",
  "event",
  "food",
  "other",
]);
const COST_LEVELS = new Set<ActivityCostLevel>(["free", "low", "medium", "high", "unknown"]);
const WEATHER_FITS = new Set<ActivityWeatherFit>(["indoor", "outdoor", "mixed"]);
const ENERGY_LEVELS = new Set<ActivityEnergyLevel>(["low", "medium", "high"]);
const CONFIDENCE_LEVELS = new Set<ActivityConfidence>(["low", "medium", "high"]);

function stringOrNull(value: unknown, max = 1000): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, max) : null;
}

function stringArray(value: unknown, maxItems = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

function dateStringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

function keyFromTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "activity";
}

function enumValue<T extends string>(value: unknown, allowed: Set<T>, fallback: T): T {
  return typeof value === "string" && allowed.has(value as T) ? (value as T) : fallback;
}

function sanitizeReusable(value: unknown): ExtractedReusableActivity | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const title = stringOrNull(row.title, 180);
  if (!title) return null;
  return {
    activity_key: stringOrNull(row.activity_key, 100) ?? keyFromTitle(title),
    title,
    description: stringOrNull(row.description, 2000),
    activity_type: enumValue(row.activity_type, ACTIVITY_TYPES, "other"),
    age_min: numberOrNull(row.age_min),
    age_max: numberOrNull(row.age_max),
    age_notes: stringOrNull(row.age_notes, 300),
    address: stringOrNull(row.address, 500),
    area: stringOrNull(row.area, 200),
    location_url: stringOrNull(row.location_url, 1000),
    cost_level: enumValue(row.cost_level, COST_LEVELS, "unknown"),
    price_text: stringOrNull(row.price_text, 200),
    cost_notes: stringOrNull(row.cost_notes, 500),
    booking_required: row.booking_required === true,
    booking_notes: stringOrNull(row.booking_notes, 500),
    weather_fit: enumValue(row.weather_fit, WEATHER_FITS, "mixed"),
    energy_level: enumValue(row.energy_level, ENERGY_LEVELS, "medium"),
    usual_duration_minutes: numberOrNull(row.usual_duration_minutes),
    tags: stringArray(row.tags),
  };
}

function sanitizeSeasonal(value: unknown): ExtractedSeasonalActivityInstance | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const title = stringOrNull(row.title, 180);
  if (!title) return null;
  const occurrenceDates = stringArray(row.occurrence_dates, 20)
    .map((date) => dateStringOrNull(date))
    .filter((date): date is string => Boolean(date));
  return {
    instance_key: stringOrNull(row.instance_key, 100) ?? keyFromTitle(title),
    reusable_activity_key: stringOrNull(row.reusable_activity_key, 100),
    season: stringOrNull(row.season, 80) ?? "summer_2026",
    title,
    description: stringOrNull(row.description, 2000),
    valid_from: dateStringOrNull(row.valid_from),
    valid_until: dateStringOrNull(row.valid_until),
    occurrence_dates: occurrenceDates,
    time_text: stringOrNull(row.time_text, 300),
    address: stringOrNull(row.address, 500),
    area: stringOrNull(row.area, 200),
    cost_level: enumValue(row.cost_level, COST_LEVELS, "unknown"),
    price_text: stringOrNull(row.price_text, 200),
    cost_notes: stringOrNull(row.cost_notes, 500),
    booking_required: row.booking_required === true,
    booking_deadline: dateStringOrNull(row.booking_deadline),
    booking_url: stringOrNull(row.booking_url, 1000),
    weather_fit: enumValue(row.weather_fit, WEATHER_FITS, "mixed"),
    energy_level: enumValue(row.energy_level, ENERGY_LEVELS, "medium"),
    age_min: numberOrNull(row.age_min),
    age_max: numberOrNull(row.age_max),
    age_notes: stringOrNull(row.age_notes, 300),
    tags: stringArray(row.tags),
    extraction_confidence: enumValue(row.extraction_confidence, CONFIDENCE_LEVELS, "medium"),
  };
}

function sanitizeExtraction(value: unknown): ActivityExtractionResult {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    reusable_activities: Array.isArray(input.reusable_activities)
      ? input.reusable_activities.map(sanitizeReusable).filter((item): item is ExtractedReusableActivity => Boolean(item))
      : [],
    seasonal_instances: Array.isArray(input.seasonal_instances)
      ? input.seasonal_instances.map(sanitizeSeasonal).filter((item): item is ExtractedSeasonalActivityInstance => Boolean(item))
      : [],
  };
}

export async function extractActivitiesFromMarkdown(
  apiKey: string,
  input: {
    title: string;
    sourceUrl: string | null;
    rawMarkdown: string;
  }
): Promise<ActivityExtractionResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = [
    "Return JSON only.",
    "Extract kids/family local activities from the Markdown source for Dad-Ops in Stockholm, Sweden.",
    "Separate reusable local activities from seasonal activity instances.",
    "Reusable local activities are evergreen things that can be done any year: a museum, library, playground, swimming place, nature walk, sport venue, workshop venue, or repeatable local outing.",
    "Seasonal activity instances are time-bound opportunities: current-summer programs, fixed events, temporary workshops, campaigns, opening windows, registration windows, or date-specific activities.",
    "If an item has fixed dates, a validity period, registration deadline, or phrases like this summer/2026/week 27, put that in seasonal_instances. If it also describes an evergreen place, add a reusable activity and link the seasonal instance with reusable_activity_key.",
    "Do not invent missing dates, times, costs, or addresses. Use null when unclear. Preserve Swedish names and addresses exactly when present.",
    "Use YYYY-MM-DD for dates. Current date: 2026-06-12. Default season: summer_2026.",
    "Shape:",
    "{\"reusable_activities\":[{\"activity_key\":\"short_stable_snake_case\",\"title\":\"...\",\"description\":null,\"activity_type\":\"museum|library|playground|sport|nature|swimming|workshop|event|food|other\",\"age_min\":null,\"age_max\":null,\"age_notes\":null,\"address\":null,\"area\":null,\"location_url\":null,\"cost_level\":\"free|low|medium|high|unknown\",\"price_text\":null,\"cost_notes\":null,\"booking_required\":false,\"booking_notes\":null,\"weather_fit\":\"indoor|outdoor|mixed\",\"energy_level\":\"low|medium|high\",\"usual_duration_minutes\":null,\"tags\":[]}],\"seasonal_instances\":[{\"instance_key\":\"short_stable_snake_case\",\"reusable_activity_key\":null,\"season\":\"summer_2026\",\"title\":\"...\",\"description\":null,\"valid_from\":null,\"valid_until\":null,\"occurrence_dates\":[],\"time_text\":null,\"address\":null,\"area\":null,\"cost_level\":\"free|low|medium|high|unknown\",\"price_text\":null,\"cost_notes\":null,\"booking_required\":false,\"booking_deadline\":null,\"booking_url\":null,\"weather_fit\":\"indoor|outdoor|mixed\",\"energy_level\":\"low|medium|high\",\"age_min\":null,\"age_max\":null,\"age_notes\":null,\"tags\":[],\"extraction_confidence\":\"low|medium|high\"}]}",
    "Rules:",
    "1. Return at most 20 reusable activities and 30 seasonal instances.",
    "2. Keep descriptions concise and operational.",
    "3. Use tags for filtering, such as rainy-day, free, booking, library, museum, swimming, toddler, school-age, teen, outdoor.",
    "4. For cost_level: free means no cost, low means modest fee, medium/high mean meaningful paid outing, unknown when not stated.",
    "4b. If the source states an exact price or price range, put it in price_text exactly and concisely, for example '120 kr', '50 kr/person', 'Free', or 'Adults 160 kr, children free'. Use null when no exact price is stated.",
    "5. For weather_fit: indoor, outdoor, or mixed.",
    "6. For energy_level: low for calm/short, medium for normal outing, high for physically demanding or long.",
    "",
    `Source title: ${input.title}`,
    `Source URL: ${input.sourceUrl ?? "none"}`,
    "",
    "Markdown:",
    input.rawMarkdown.slice(0, 120_000),
  ].join("\n");

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("Gemini returned empty activity extraction");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Gemini returned invalid JSON: ${message}. First 200 chars: ${text.slice(0, 200)}`);
  }

  return sanitizeExtraction(parsed);
}
