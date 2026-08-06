import { GoogleGenerativeAI } from "@google/generative-ai";

export type ExtractedReusableActivity = {
  activity_key: string; title: string; description: string | null; activity_type: string;
  age_min: number | null; age_max: number | null; age_notes: string | null; address: string | null; area: string | null;
  location_url: string | null; cost_level: string; price_text: string | null; cost_notes: string | null;
  booking_required: boolean; booking_notes: string | null; weather_fit: string; energy_level: string;
  usual_duration_minutes: number | null; tags: string[];
};

export type ExtractedSeasonalActivityInstance = {
  instance_key: string; reusable_activity_key: string | null; season: string; title: string; description: string | null;
  valid_from: string | null; valid_until: string | null; occurrence_dates: string[]; time_text: string | null;
  address: string | null; area: string | null; cost_level: string; price_text: string | null; cost_notes: string | null;
  booking_required: boolean; booking_deadline: string | null; booking_url: string | null; weather_fit: string;
  energy_level: string; age_min: number | null; age_max: number | null; age_notes: string | null; tags: string[];
  extraction_confidence: string;
};

export type ActivityExtractionResult = {
  reusable_activities: ExtractedReusableActivity[];
  seasonal_instances: ExtractedSeasonalActivityInstance[];
};

const TYPES = new Set(["museum", "library", "playground", "sport", "nature", "swimming", "workshop", "event", "food", "other"]);
const COSTS = new Set(["free", "low", "medium", "high", "unknown"]);
const WEATHER = new Set(["indoor", "outdoor", "mixed"]);
const ENERGY = new Set(["low", "medium", "high"]);
const CONFIDENCE = new Set(["low", "medium", "high"]);

function text(value: unknown, max = 1000): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim().slice(0, max);
}
function strings(value: unknown, max = 12): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, max) : [];
}
function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}
function date(value: unknown): string | null {
  const result = text(value, 10);
  return result && /^\d{4}-\d{2}-\d{2}$/.test(result) ? result : null;
}
function key(title: string) {
  return title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "activity";
}
function choice(value: unknown, allowed: Set<string>, fallback: string) {
  return typeof value === "string" && allowed.has(value) ? value : fallback;
}
function reusable(value: unknown): ExtractedReusableActivity | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>; const title = text(row.title, 180); if (!title) return null;
  return {
    activity_key: text(row.activity_key, 100) ?? key(title), title, description: text(row.description, 2000),
    activity_type: choice(row.activity_type, TYPES, "other"), age_min: number(row.age_min), age_max: number(row.age_max),
    age_notes: text(row.age_notes, 300), address: text(row.address, 500), area: text(row.area, 200),
    location_url: text(row.location_url, 1000), cost_level: choice(row.cost_level, COSTS, "unknown"),
    price_text: text(row.price_text, 200), cost_notes: text(row.cost_notes, 500), booking_required: row.booking_required === true,
    booking_notes: text(row.booking_notes, 500), weather_fit: choice(row.weather_fit, WEATHER, "mixed"),
    energy_level: choice(row.energy_level, ENERGY, "medium"), usual_duration_minutes: number(row.usual_duration_minutes), tags: strings(row.tags),
  };
}
function seasonal(value: unknown): ExtractedSeasonalActivityInstance | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>; const title = text(row.title, 180); if (!title) return null;
  return {
    instance_key: text(row.instance_key, 100) ?? key(title), reusable_activity_key: text(row.reusable_activity_key, 100),
    season: text(row.season, 80) ?? "summer_2026", title, description: text(row.description, 2000),
    valid_from: date(row.valid_from), valid_until: date(row.valid_until),
    occurrence_dates: strings(row.occurrence_dates, 20).map(date).filter((item): item is string => Boolean(item)),
    time_text: text(row.time_text, 300), address: text(row.address, 500), area: text(row.area, 200),
    cost_level: choice(row.cost_level, COSTS, "unknown"), price_text: text(row.price_text, 200), cost_notes: text(row.cost_notes, 500),
    booking_required: row.booking_required === true, booking_deadline: date(row.booking_deadline), booking_url: text(row.booking_url, 1000),
    weather_fit: choice(row.weather_fit, WEATHER, "mixed"), energy_level: choice(row.energy_level, ENERGY, "medium"),
    age_min: number(row.age_min), age_max: number(row.age_max), age_notes: text(row.age_notes, 300), tags: strings(row.tags),
    extraction_confidence: choice(row.extraction_confidence, CONFIDENCE, "medium"),
  };
}

export async function extractActivitiesFromMarkdown(apiKey: string, input: { title: string; sourceUrl: string | null; rawMarkdown: string }): Promise<ActivityExtractionResult> {
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
  const today = new Date().toISOString().slice(0, 10);
  const prompt = [
    "Return JSON only. Extract kids/family activities around Stockholm from this Markdown.",
    "Separate evergreen reusable places/ideas from date-bound seasonal opportunities. Never invent missing facts; use null.",
    `Use YYYY-MM-DD dates. Current date: ${today}. Default season: summer_2026.`,
    'Shape: {"reusable_activities":[{"activity_key":"snake_case","title":"","description":null,"activity_type":"museum|library|playground|sport|nature|swimming|workshop|event|food|other","age_min":null,"age_max":null,"age_notes":null,"address":null,"area":null,"location_url":null,"cost_level":"free|low|medium|high|unknown","price_text":null,"cost_notes":null,"booking_required":false,"booking_notes":null,"weather_fit":"indoor|outdoor|mixed","energy_level":"low|medium|high","usual_duration_minutes":null,"tags":[]}],"seasonal_instances":[{"instance_key":"snake_case","reusable_activity_key":null,"season":"summer_2026","title":"","description":null,"valid_from":null,"valid_until":null,"occurrence_dates":[],"time_text":null,"address":null,"area":null,"cost_level":"unknown","price_text":null,"cost_notes":null,"booking_required":false,"booking_deadline":null,"booking_url":null,"weather_fit":"mixed","energy_level":"medium","age_min":null,"age_max":null,"age_notes":null,"tags":[],"extraction_confidence":"low|medium|high"}]}',
    "Return at most 20 reusable activities and 30 seasonal instances. Preserve Swedish names, exact prices, addresses, dates, booking URLs and source facts.",
    `Source title: ${input.title}`, `Source URL: ${input.sourceUrl ?? "none"}`, "Markdown:", input.rawMarkdown.slice(0, 120_000),
  ].join("\n");
  const response = await model.generateContent(prompt); const raw = response.response.text();
  if (!raw?.trim()) throw new Error("Gemini returned empty activity extraction");
  let parsed: unknown; try { parsed = JSON.parse(raw); } catch (error) { throw new Error(`Gemini returned invalid JSON: ${String(error)}`); }
  const object = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  return {
    reusable_activities: Array.isArray(object.reusable_activities) ? object.reusable_activities.map(reusable).filter((item): item is ExtractedReusableActivity => Boolean(item)) : [],
    seasonal_instances: Array.isArray(object.seasonal_instances) ? object.seasonal_instances.map(seasonal).filter((item): item is ExtractedSeasonalActivityInstance => Boolean(item)) : [],
  };
}
