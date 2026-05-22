import type {
  Bucket,
  TripDecisionStatus,
  TripEffort,
  TripItineraryBlock,
  TripKidFit,
  TripOptionStatus,
  TripOptionType,
  TripPreferenceCategory,
  TripStatus,
  TripWeatherFit,
} from "@/types/database";

export const TRIP_STATUSES = ["ideas", "planning", "upcoming", "archived"] as const satisfies readonly TripStatus[];
export const TRIP_OPTION_TYPES = [
  "activity",
  "food",
  "rainy_day",
  "scenic_stop",
  "logistics",
  "other",
] as const satisfies readonly TripOptionType[];
export const TRIP_OPTION_STATUSES = ["maybe", "shortlisted", "planned", "rejected"] as const satisfies readonly TripOptionStatus[];
export const TRIP_DECISION_STATUSES = ["open", "waiting", "decided"] as const satisfies readonly TripDecisionStatus[];
export const TRIP_ITINERARY_BLOCKS = [
  "morning",
  "lunch",
  "afternoon",
  "backup",
  "drop_first",
] as const satisfies readonly TripItineraryBlock[];
export const TRIP_EFFORTS = ["low", "medium", "high"] as const satisfies readonly TripEffort[];
export const TRIP_WEATHER_FITS = ["sun", "rain", "any"] as const satisfies readonly TripWeatherFit[];
export const TRIP_KID_FITS = ["low", "medium", "high"] as const satisfies readonly TripKidFit[];
export const TRIP_TASK_CATEGORIES = ["booking", "packing", "research", "message", "logistics", "other"] as const;
export const TRIP_PREFERENCE_CATEGORIES = [
  "pace",
  "kids",
  "weather",
  "food",
  "nature",
  "culture",
  "logistics",
  "budget",
  "planning",
] as const satisfies readonly TripPreferenceCategory[];

export type TripTaskCategory = (typeof TRIP_TASK_CATEGORIES)[number];

export function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

export function cleanText(value: unknown, maxLength = 2000): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, maxLength) : null;
}

export function parseDateOnly(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === "") {
    return null;
  }
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return undefined;
  }
  return value;
}

export function coerceBoolean(value: unknown): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value;
  }
  return undefined;
}

export function parseCount(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return 0;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 50) return undefined;
  return number;
}

export function parseKidAges(value: unknown): number[] | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return [];
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,\s]+/).filter(Boolean)
      : null;
  if (!raw) return undefined;
  const ages = raw.map((item) => Number(item));
  if (ages.some((age) => !Number.isInteger(age) || age < 0 || age > 18)) return undefined;
  return ages;
}

export function parseStringArray(value: unknown, maxItems = 40): string[] | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return [];
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split("\n")
      : null;
  if (!raw) return undefined;
  return raw
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

export function isBucket(value: unknown): value is Bucket {
  return value === "today" || value === "this_week" || value === "later";
}

export const gotlandStarterOptions = [
  {
    title: "Ekstakusten coastal road",
    option_type: "scenic_stop",
    status: "shortlisted",
    location: "Western Gotland",
    best_for: "Arrival-light scenery, picnic stops, low planning friction",
    effort: "low",
    weather_fit: "sun",
    kid_fit: "high",
    booking_needed: false,
    why: "A flexible coast-drive option that works well when you want Gotland texture without committing the whole day.",
    sort_order: 10,
  },
  {
    title: "Hoburgen and southern rauk fields",
    option_type: "activity",
    status: "maybe",
    location: "Southern Gotland",
    best_for: "A proper south-island anchor day with nature and open space",
    effort: "medium",
    weather_fit: "any",
    kid_fit: "medium",
    booking_needed: false,
    why: "Good candidate if previous Gotland trips leaned north or Visby-heavy.",
    sort_order: 20,
  },
  {
    title: "Närsholmen lighthouse and peninsula",
    option_type: "scenic_stop",
    status: "maybe",
    location: "Eastern Gotland",
    best_for: "Birds, open landscapes, short walks, quiet photos",
    effort: "medium",
    weather_fit: "sun",
    kid_fit: "medium",
    booking_needed: false,
    why: "A calmer landscape stop that can pair with east-side food or beach time.",
    sort_order: 30,
  },
  {
    title: "Bungenäs",
    option_type: "activity",
    status: "maybe",
    location: "Northern Gotland",
    best_for: "Industrial landscape, food stop, wandering without a strict program",
    effort: "medium",
    weather_fit: "any",
    kid_fit: "medium",
    booking_needed: false,
    why: "A distinct Gotland mood if the family has already done the obvious north-island stops.",
    sort_order: 40,
  },
  {
    title: "Roma Kungsgård",
    option_type: "rainy_day",
    status: "maybe",
    location: "Central Gotland",
    best_for: "Culture, fika, history, rainy-day fallback",
    effort: "low",
    weather_fit: "rain",
    kid_fit: "medium",
    booking_needed: false,
    why: "Useful as a central backup when beach or coast plans get weathered out.",
    sort_order: 50,
  },
  {
    title: "Farm shop and fika loop",
    option_type: "food",
    status: "maybe",
    location: "Near daily route",
    best_for: "Low-stakes food stops between anchors",
    effort: "low",
    weather_fit: "any",
    kid_fit: "high",
    booking_needed: false,
    why: "Keeps the plan family-proof: one good stop can save a tired afternoon.",
    sort_order: 60,
  },
] as const;

export const gotlandStarterDecisions = [
  {
    title: "Choose one north/east/south anchor day",
    status: "open",
    owner: "Dad",
    notes: "Pick after checking what the family already did on previous Gotland trips.",
  },
  {
    title: "Decide the rainy-day fallback",
    status: "open",
    owner: "Dad",
    notes: "Keep one indoor-ish option ready before departure.",
  },
] as const;

export const gotlandStarterItinerary = [
  { day_number: 1, block: "morning", title: "Ferry / arrival buffer", notes: "Keep the first block light.", sort_order: 10 },
  { day_number: 1, block: "afternoon", title: "Easy coast or food stop near base", notes: "Use this for a low-friction first win.", sort_order: 20 },
  { day_number: 2, block: "morning", title: "Main nature anchor", notes: "Pick from shortlisted options once repeats are removed.", sort_order: 10 },
  { day_number: 2, block: "backup", title: "Central rainy-day fallback", notes: "Use if the coast looks unpleasant.", sort_order: 20 },
  { day_number: 3, block: "morning", title: "Second region day", notes: "Choose the opposite side of the island from Day 2.", sort_order: 10 },
  { day_number: 3, block: "drop_first", title: "Extra scenic stop", notes: "Drop this first if kids are tired.", sort_order: 20 },
  { day_number: 4, block: "morning", title: "Departure-safe activity", notes: "Stay close enough to ferry timing.", sort_order: 10 },
] as const;

export const defaultTripPreferenceSuggestions = [
  {
    category: "pace",
    label: "One anchor per day",
    description: "Keep the plan realistic for family travel.",
    preference_text: "Plan one main anchor activity per day and keep the rest flexible.",
    tags: ["family", "low-stress"],
    sort_order: 10,
  },
  {
    category: "kids",
    label: "Short walks",
    description: "Good default when kid energy is uncertain.",
    preference_text: "Prefer short walks under 45 minutes unless there is a strong reason.",
    tags: ["kids", "walking"],
    sort_order: 20,
  },
  {
    category: "kids",
    label: "Predictable lunch",
    description: "Avoids the classic hungry-family cliff edge.",
    preference_text: "Include predictable lunch options near the daily route.",
    tags: ["kids", "food"],
    sort_order: 30,
  },
  {
    category: "weather",
    label: "Rain backup",
    description: "Every outdoor-heavy day needs a fallback.",
    preference_text: "Keep one rainy-day backup for each outdoor anchor day.",
    tags: ["rain", "backup"],
    sort_order: 40,
  },
  {
    category: "food",
    label: "Farm shops and fika",
    description: "Low-friction stops that make routes easier.",
    preference_text: "Prefer routes with farm shops, fika, or simple food stops nearby.",
    tags: ["gotland", "food"],
    sort_order: 50,
  },
  {
    category: "nature",
    label: "New beaches and coast",
    description: "Useful when returning to a place already visited.",
    preference_text: "Prioritize new beaches, coast roads, and scenic stops over repeat landmarks.",
    tags: ["beach", "coast"],
    sort_order: 60,
  },
  {
    category: "culture",
    label: "Limit ruins density",
    description: "Keeps culture from turning into homework.",
    preference_text: "Avoid stacking multiple ruins or history-heavy stops in the same day.",
    tags: ["culture", "kids"],
    sort_order: 70,
  },
  {
    category: "logistics",
    label: "Avoid backtracking",
    description: "Groups stops by region.",
    preference_text: "Group each day by island region and avoid unnecessary backtracking.",
    tags: ["driving", "route"],
    sort_order: 80,
  },
  {
    category: "budget",
    label: "Mostly free or moderate",
    description: "Allows one treat without making every stop paid.",
    preference_text: "Prefer free or moderate-cost activities, with at most one special paid treat.",
    tags: ["budget"],
    sort_order: 90,
  },
  {
    category: "planning",
    label: "Loose blocks",
    description: "Matches Dad-Ops itinerary style.",
    preference_text: "Use loose morning, lunch, afternoon, backup, and drop-first blocks instead of a tight schedule.",
    tags: ["itinerary"],
    sort_order: 100,
  },
] as const;
