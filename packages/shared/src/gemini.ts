import {
  GoogleGenerativeAI,
  SchemaType,
  type ObjectSchema,
  type Schema,
} from "@google/generative-ai";

export interface TaskExtractionResult {
  email_type: "task" | "promotion";
  title: string;
  due_date: string | null;
  target_bucket: "today" | "this_week" | "later";
  priority: number;
  promotion_relevant: boolean;
  store?: string;
  deal_summary?: string;
  store_link?: string;
}

export interface GrowingActionableTip {
  item_key: string;
  item_name: string;
  suggestion_kind: "action";
  action_type: "seed" | "transplant" | "prune" | "harvest" | "protect" | "plan" | "inspire";
  start_month: number;
  end_month: number;
  priority: number;
  suggested_bucket: "today" | "this_week" | "later";
  stockholm_note: string;
  tags: string[];
}

export interface GrowingKnowledgeNugget {
  title: string;
  content: string;
  category:
    | "technique"
    | "plant-profile"
    | "soil"
    | "pest-control"
    | "companion-planting"
    | "preservation"
    | "general";
  tags: string[];
  season_relevance: Array<"spring" | "summer" | "autumn" | "winter">;
  stockholm_relevant: boolean;
  location_note?: string | null;
}

export interface GrowingKnowledgeExtractionResult {
  actionable_tips: GrowingActionableTip[];
  knowledge_nuggets: GrowingKnowledgeNugget[];
}

export interface TripLogisticsExtractionResult {
  transport_mode: string | null;
  outbound_departure_location: string | null;
  outbound_departure_time: string | null;
  outbound_arrival_location: string | null;
  outbound_arrival_time: string | null;
  return_departure_location: string | null;
  return_departure_time: string | null;
  return_arrival_location: string | null;
  return_arrival_time: string | null;
  accommodation_name: string | null;
  accommodation_address: string | null;
  base_area: string | null;
  local_transport: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  accommodations: TripAccommodationLogistics[];
  booking_references: string[];
  important_links: string[];
  parking_notes: string | null;
  constraints: string[];
  confidence_notes: string[];
}

export interface TripAccommodationLogistics {
  name: string | null;
  address: string | null;
  area: string | null;
  check_in_date: string | null;
  check_in_time: string | null;
  check_out_date: string | null;
  check_out_time: string | null;
  booking_reference: string | null;
  notes: string | null;
}

export interface TripOptionSuggestion {
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
}

export interface TripOptionSuggestionsResult {
  options: TripOptionSuggestion[];
}

const TASK_EXTRACTION_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    email_type: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["task", "promotion"],
      description: "Type of email",
    } as Schema,
    title: { type: SchemaType.STRING, description: "Short task title" } as Schema,
    due_date: {
      type: SchemaType.STRING,
      format: "date-time",
      nullable: true,
      description: "ISO8601 date or null",
    } as Schema,
    target_bucket: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["today", "this_week", "later"],
      description: "Which bucket to place the task in",
    } as Schema,
    priority: {
      type: SchemaType.INTEGER,
      description: "Priority 1-5",
    } as Schema,
    promotion_relevant: {
      type: SchemaType.BOOLEAN,
      description: "For promotions: true if email matches user interests",
    } as Schema,
    store: {
      type: SchemaType.STRING,
      nullable: true,
      description: "Store name for promotion emails",
    } as Schema,
    deal_summary: {
      type: SchemaType.STRING,
      nullable: true,
      description: "Short summary of promotion highlights",
    } as Schema,
    store_link: {
      type: SchemaType.STRING,
      nullable: true,
      description: "Primary seller/deal link in the email",
    } as Schema,
  },
  required: ["email_type", "title", "target_bucket", "priority", "promotion_relevant"],
};

const GROWING_KNOWLEDGE_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    actionable_tips: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          item_key: { type: SchemaType.STRING } as Schema,
          item_name: { type: SchemaType.STRING } as Schema,
          suggestion_kind: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["action"],
          } as Schema,
          action_type: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["seed", "transplant", "prune", "harvest", "protect", "plan", "inspire"],
          } as Schema,
          start_month: { type: SchemaType.INTEGER } as Schema,
          end_month: { type: SchemaType.INTEGER } as Schema,
          priority: { type: SchemaType.INTEGER } as Schema,
          suggested_bucket: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["today", "this_week", "later"],
          } as Schema,
          stockholm_note: { type: SchemaType.STRING } as Schema,
          tags: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING } as Schema,
          } as Schema,
        },
        required: [
          "item_key",
          "item_name",
          "suggestion_kind",
          "action_type",
          "start_month",
          "end_month",
          "priority",
          "suggested_bucket",
          "stockholm_note",
          "tags",
        ],
      } as Schema,
    } as Schema,
    knowledge_nuggets: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING } as Schema,
          content: { type: SchemaType.STRING } as Schema,
          category: {
            type: SchemaType.STRING,
            format: "enum",
            enum: [
              "technique",
              "plant-profile",
              "soil",
              "pest-control",
              "companion-planting",
              "preservation",
              "general",
            ],
          } as Schema,
          tags: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING } as Schema,
          } as Schema,
          season_relevance: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.STRING,
              format: "enum",
              enum: ["spring", "summer", "autumn", "winter"],
            } as Schema,
          } as Schema,
          stockholm_relevant: { type: SchemaType.BOOLEAN } as Schema,
          location_note: {
            type: SchemaType.STRING,
            nullable: true,
            description:
              "Which location/climate this applies to (e.g. Stockholm, Nordic, temperate, Mediterranean, general)",
          } as Schema,
        },
        required: ["title", "content", "category", "tags", "season_relevance", "stockholm_relevant"],
      } as Schema,
    } as Schema,
  },
  required: ["actionable_tips", "knowledge_nuggets"],
};

const nullableString = (description: string): Schema =>
  ({
    type: SchemaType.STRING,
    nullable: true,
    description,
  }) as Schema;

const stringArray = (description: string): Schema =>
  ({
    type: SchemaType.ARRAY,
    description,
    items: { type: SchemaType.STRING } as Schema,
  }) as Schema;

const TRIP_ACCOMMODATION_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    name: nullableString("Accommodation name if present."),
    address: nullableString("Accommodation address if present."),
    area: nullableString("Town, neighborhood, or base area for this accommodation."),
    check_in_date: nullableString("Check-in date as YYYY-MM-DD when clear, otherwise as written, or null."),
    check_in_time: nullableString("Check-in time or time window as written."),
    check_out_date: nullableString("Check-out date as YYYY-MM-DD when clear, otherwise as written, or null."),
    check_out_time: nullableString("Check-out time or time window as written."),
    booking_reference: nullableString("Booking or reservation reference specific to this accommodation."),
    notes: nullableString("Short operational notes for this accommodation."),
  },
  required: [
    "name",
    "address",
    "area",
    "check_in_date",
    "check_in_time",
    "check_out_date",
    "check_out_time",
    "booking_reference",
    "notes",
  ],
};

const TRIP_LOGISTICS_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    transport_mode: nullableString("Main transport to destination, such as ferry, flight, train, car, or mixed."),
    outbound_departure_location: nullableString("Outbound departure port, station, airport, city, or address."),
    outbound_departure_time: nullableString("Outbound departure time as written or normalized, including date if present."),
    outbound_arrival_location: nullableString("Outbound arrival port, station, airport, city, or address."),
    outbound_arrival_time: nullableString("Outbound arrival time as written or normalized, including date if present."),
    return_departure_location: nullableString("Return departure port, station, airport, city, or address."),
    return_departure_time: nullableString("Return departure time as written or normalized, including date if present."),
    return_arrival_location: nullableString("Return arrival port, station, airport, city, or address."),
    return_arrival_time: nullableString("Return arrival time as written or normalized, including date if present."),
    accommodation_name: nullableString("Accommodation name if present."),
    accommodation_address: nullableString("Accommodation address if present."),
    base_area: nullableString("Area or town the family is based in."),
    local_transport: nullableString("Transport during the trip, such as own car, rental car, bike, bus, walking."),
    check_in_time: nullableString("Accommodation check-in time if present."),
    check_out_time: nullableString("Accommodation check-out time if present."),
    accommodations: {
      type: SchemaType.ARRAY,
      description:
        "Every accommodation/stay mentioned in the notes. Include multiple rows when the family changes hotels, cabins, rentals, or bases.",
      items: TRIP_ACCOMMODATION_SCHEMA as Schema,
    } as Schema,
    booking_references: stringArray("Booking numbers or reservation references."),
    important_links: stringArray("Important URLs found in the notes."),
    parking_notes: nullableString("Parking, loading, ferry queue, or car-related notes."),
    constraints: stringArray("Operational constraints, such as arrive early, nap windows, checkout limits, or fixed times."),
    confidence_notes: stringArray("Short notes about ambiguity, missing values, or assumptions."),
  },
  required: [
    "transport_mode",
    "outbound_departure_location",
    "outbound_departure_time",
    "outbound_arrival_location",
    "outbound_arrival_time",
    "return_departure_location",
    "return_departure_time",
    "return_arrival_location",
    "return_arrival_time",
    "accommodation_name",
    "accommodation_address",
    "base_area",
    "local_transport",
    "check_in_time",
    "check_out_time",
    "accommodations",
    "booking_references",
    "important_links",
    "parking_notes",
    "constraints",
    "confidence_notes",
  ],
};

const TRIP_OPTION_SUGGESTIONS_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    options: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING } as Schema,
          option_type: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["activity", "food", "rainy_day", "scenic_stop", "logistics", "other"],
          } as Schema,
          location: nullableString("Place, area, or route context."),
          best_for: nullableString("Short reason this fits the family or day shape."),
          effort: {
            type: SchemaType.STRING,
            nullable: true,
            format: "enum",
            enum: ["low", "medium", "high"],
          } as Schema,
          weather_fit: {
            type: SchemaType.STRING,
            nullable: true,
            format: "enum",
            enum: ["sun", "rain", "any"],
          } as Schema,
          kid_fit: {
            type: SchemaType.STRING,
            nullable: true,
            format: "enum",
            enum: ["low", "medium", "high"],
          } as Schema,
          booking_needed: { type: SchemaType.BOOLEAN } as Schema,
          why: { type: SchemaType.STRING } as Schema,
          notes: nullableString("Operational notes, cautions, or pairing ideas."),
        },
        required: [
          "title",
          "option_type",
          "location",
          "best_for",
          "effort",
          "weather_fit",
          "kid_fit",
          "booking_needed",
          "why",
          "notes",
        ],
      } as Schema,
    } as Schema,
  },
  required: ["options"],
};

export async function getTaskExtractionFromEmail(
  apiKey: string,
  subject: string,
  body: string,
  from: string,
  systemPrompt: string
): Promise<TaskExtractionResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: TASK_EXTRACTION_SCHEMA,
    },
  });

  const userContent = `From: ${from}\nSubject: ${subject}\n\nBody:\n${body}`;
  const fullPrompt = `${systemPrompt}\n\n---\n\n${userContent}`;

  const result = await model.generateContent(fullPrompt);
  const response = result.response;
  const text = response.text();

  const parsed = JSON.parse(text) as TaskExtractionResult;

  if (!parsed.title || !parsed.target_bucket) {
    throw new Error("Invalid Gemini response: missing required fields");
  }

  if (!["today", "this_week", "later"].includes(parsed.target_bucket)) {
    parsed.target_bucket = "later";
  }

  if (!parsed.email_type) {
    parsed.email_type = "task";
  }

  if (parsed.email_type === "promotion" && parsed.promotion_relevant === undefined) {
    parsed.promotion_relevant = false;
  }

  if (parsed.email_type === "promotion") {
    if (typeof parsed.store !== "string") {
      parsed.store = "";
    }
    if (typeof parsed.deal_summary !== "string") {
      parsed.deal_summary = "";
    }
    if (typeof parsed.store_link !== "string") {
      parsed.store_link = "";
    }
  }

  return parsed;
}

export async function extractGrowingKnowledge(
  apiKey: string,
  fullPrompt: string
): Promise<GrowingKnowledgeExtractionResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: GROWING_KNOWLEDGE_SCHEMA,
    },
  });

  const result = await model.generateContent(fullPrompt);
  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("Gemini returned empty response");
  }
  let parsed: GrowingKnowledgeExtractionResult;
  try {
    parsed = JSON.parse(text) as GrowingKnowledgeExtractionResult;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Gemini returned invalid JSON: ${msg}. First 200 chars: ${text.slice(0, 200)}`);
  }

  const actionable_tips = (parsed.actionable_tips ?? [])
    .filter((tip) => tip && typeof tip.item_name === "string")
    .map((tip) => ({
      ...tip,
      suggestion_kind: "action" as const,
      start_month: Math.min(12, Math.max(1, Number(tip.start_month) || 1)),
      end_month: Math.min(12, Math.max(1, Number(tip.end_month) || 12)),
      priority: Math.min(10, Math.max(1, Number(tip.priority) || 5)),
      suggested_bucket:
        tip.suggested_bucket === "today" ||
        tip.suggested_bucket === "this_week" ||
        tip.suggested_bucket === "later"
          ? tip.suggested_bucket
          : "this_week",
      tags: Array.isArray(tip.tags) ? tip.tags.filter((tag) => typeof tag === "string").slice(0, 8) : [],
    }));

  const knowledge_nuggets = (parsed.knowledge_nuggets ?? [])
    .filter((nugget) => nugget && typeof nugget.title === "string" && typeof nugget.content === "string")
    .map((nugget) => ({
      ...nugget,
      tags: Array.isArray(nugget.tags) ? nugget.tags.filter((tag) => typeof tag === "string").slice(0, 10) : [],
      season_relevance: Array.isArray(nugget.season_relevance)
        ? nugget.season_relevance.filter((season) =>
            season === "spring" || season === "summer" || season === "autumn" || season === "winter"
          )
        : [],
      stockholm_relevant: Boolean(nugget.stockholm_relevant),
      location_note:
        typeof nugget.location_note === "string" && nugget.location_note.trim()
          ? nugget.location_note.trim().slice(0, 120)
          : null,
    }));

  return { actionable_tips, knowledge_nuggets };
}

export async function extractTripLogistics(
  apiKey: string,
  input: {
    title?: string | null;
    destination?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    logistics: string;
  }
): Promise<TripLogisticsExtractionResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: TRIP_LOGISTICS_SCHEMA,
    },
  });

  const prompt = [
    "Extract structured family trip logistics from the notes.",
    "Only use facts present in the notes or obvious from the trip metadata.",
    "Use null for unknown scalar fields and [] for unknown list fields.",
    "If the notes mention more than one accommodation, put each stay in accommodations with its own check-in and check-out details.",
    "Keep the legacy accommodation_name, accommodation_address, check_in_time, and check_out_time fields populated from the primary or first accommodation when possible.",
    "Keep times as concise human-readable strings. Do not invent booking references or addresses.",
    "",
    `Trip title: ${input.title ?? ""}`,
    `Destination: ${input.destination ?? ""}`,
    `Start date: ${input.start_date ?? ""}`,
    `End date: ${input.end_date ?? ""}`,
    "",
    "Logistics notes:",
    input.logistics,
  ].join("\n");

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("Gemini returned empty response");
  }

  let parsed: TripLogisticsExtractionResult;
  try {
    parsed = JSON.parse(text) as TripLogisticsExtractionResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Gemini returned invalid JSON: ${message}. First 200 chars: ${text.slice(0, 200)}`);
  }

  const cleanString = (value: unknown): string | null =>
    typeof value === "string" && value.trim().length > 0 ? value.trim().slice(0, 300) : null;
  const cleanArray = (value: unknown): string[] =>
    Array.isArray(value)
      ? value
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 12)
      : [];
  const cleanAccommodation = (value: unknown): TripAccommodationLogistics | null => {
    if (!value || typeof value !== "object") return null;
    const row = value as Record<string, unknown>;
    const cleaned = {
      name: cleanString(row.name),
      address: cleanString(row.address),
      area: cleanString(row.area),
      check_in_date: cleanString(row.check_in_date),
      check_in_time: cleanString(row.check_in_time),
      check_out_date: cleanString(row.check_out_date),
      check_out_time: cleanString(row.check_out_time),
      booking_reference: cleanString(row.booking_reference),
      notes: cleanString(row.notes),
    };
    return Object.values(cleaned).some(Boolean) ? cleaned : null;
  };
  const accommodations = Array.isArray(parsed.accommodations)
    ? parsed.accommodations.map(cleanAccommodation).filter((item): item is TripAccommodationLogistics => item !== null).slice(0, 12)
    : [];

  return {
    transport_mode: cleanString(parsed.transport_mode),
    outbound_departure_location: cleanString(parsed.outbound_departure_location),
    outbound_departure_time: cleanString(parsed.outbound_departure_time),
    outbound_arrival_location: cleanString(parsed.outbound_arrival_location),
    outbound_arrival_time: cleanString(parsed.outbound_arrival_time),
    return_departure_location: cleanString(parsed.return_departure_location),
    return_departure_time: cleanString(parsed.return_departure_time),
    return_arrival_location: cleanString(parsed.return_arrival_location),
    return_arrival_time: cleanString(parsed.return_arrival_time),
    accommodation_name: cleanString(parsed.accommodation_name),
    accommodation_address: cleanString(parsed.accommodation_address),
    base_area: cleanString(parsed.base_area),
    local_transport: cleanString(parsed.local_transport),
    check_in_time: cleanString(parsed.check_in_time),
    check_out_time: cleanString(parsed.check_out_time),
    accommodations,
    booking_references: cleanArray(parsed.booking_references),
    important_links: cleanArray(parsed.important_links),
    parking_notes: cleanString(parsed.parking_notes),
    constraints: cleanArray(parsed.constraints),
    confidence_notes: cleanArray(parsed.confidence_notes),
  };
}

export async function suggestTripOptions(
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
    existing_options: string[];
  }
): Promise<TripOptionSuggestionsResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: TRIP_OPTION_SUGGESTIONS_SCHEMA,
    },
  });

  const prompt = [
    "Suggest practical family trip options for Dad-Ops.",
    "Use the known logistics as hard context. Avoid repeating places or patterns listed as already done.",
    "Return 6-10 editable option cards. Prefer concrete, family-realistic ideas over generic travel prose.",
    "Mix anchors, easy wins, rainy-day backups, food/fika stops, and scenic stops when appropriate.",
    "Do not duplicate existing options. Keep why and notes concise.",
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
    "Existing options:",
    input.existing_options.map((option) => `- ${option}`).join("\n") || "- none",
  ].join("\n");

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("Gemini returned empty trip option suggestions");
  }

  let parsed: TripOptionSuggestionsResult;
  try {
    parsed = JSON.parse(text) as TripOptionSuggestionsResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Gemini returned invalid JSON: ${message}. First 200 chars: ${text.slice(0, 200)}`);
  }

  const cleanString = (value: unknown, maxLength = 300): string | null =>
    typeof value === "string" && value.trim().length > 0 ? value.trim().slice(0, maxLength) : null;
  const optionTypes = new Set(["activity", "food", "rainy_day", "scenic_stop", "logistics", "other"]);
  const efforts = new Set(["low", "medium", "high"]);
  const weatherFits = new Set(["sun", "rain", "any"]);
  const kidFits = new Set(["low", "medium", "high"]);
  const seen = new Set(input.existing_options.map((option) => option.trim().toLocaleLowerCase("sv-SE")));

  const options = (parsed.options ?? [])
    .map((option) => {
      const title = cleanString(option.title, 120);
      if (!title) return null;
      const key = title.toLocaleLowerCase("sv-SE");
      if (seen.has(key)) return null;
      seen.add(key);
      return {
        title,
        option_type: optionTypes.has(option.option_type) ? option.option_type : "other",
        location: cleanString(option.location, 180),
        best_for: cleanString(option.best_for, 240),
        effort: option.effort && efforts.has(option.effort) ? option.effort : null,
        weather_fit: option.weather_fit && weatherFits.has(option.weather_fit) ? option.weather_fit : null,
        kid_fit: option.kid_fit && kidFits.has(option.kid_fit) ? option.kid_fit : null,
        booking_needed: option.booking_needed === true,
        why: cleanString(option.why, 500) ?? "Suggested from trip context.",
        notes: cleanString(option.notes, 500),
      } satisfies TripOptionSuggestion;
    })
    .filter((option): option is TripOptionSuggestion => option !== null)
    .slice(0, 10);

  return { options };
}

/** Kind of meal suggestion (10-meal promo plan). */
export type PromoMealPlanMealKind = "lunch" | "dinner" | "either" | "snack" | "other";

/** One meal idea in the 10-meal promo plan (Swedish copy). */
export interface PromoMealPlanMeal {
  title: string;
  summary: string;
  meal_kind: PromoMealPlanMealKind;
  /** Shopping lines: Swedish; promotions may appear as only part of the list. */
  ingredients: string[];
  /** Short prep/cooking steps, or empty if obvious. */
  cooking_note: string;
  /** Which promotion titles this meal builds on (subset of import; may be empty). */
  uses_promotion_titles: string[];
  /** Cuisine / style echoing user interests, e.g. "vietnamesiskt", "svensk husman". */
  cuisine_style: string;
}

const MEAL_PLAN_INGREDIENT_CAP = 18;

function sanitizeMealPlanIngredientList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((s) => (s.length > 100 ? `${s.slice(0, 100)}…` : s))
    .slice(0, MEAL_PLAN_INGREDIENT_CAP);
}

const MEAL_KINDS: PromoMealPlanMealKind[] = ["lunch", "dinner", "either", "snack", "other"];

function sanitizeMealKind(value: unknown): PromoMealPlanMealKind {
  return typeof value === "string" && MEAL_KINDS.includes(value as PromoMealPlanMealKind)
    ? (value as PromoMealPlanMealKind)
    : "other";
}

export interface PromoMealPlanResult {
  intro: string;
  /** Exactly 10 meal suggestions. */
  meals: PromoMealPlanMeal[];
  shopping_reminders: string[];
}

export type PromoMealPlanInputItem = {
  title: string;
  card_text?: string | null;
  price_hint?: string | null;
  matched_interest: string;
};

const PROMO_MEAL_PLAN_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    intro: {
      type: SchemaType.STRING,
      description: "Short intro in Swedish (1–3 sentences).",
    } as Schema,
    meals: {
      type: SchemaType.ARRAY,
      description:
        "Exactly 10 meal ideas. Leverage weekly promotions where sensible; vary cuisine using user interests.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: {
            type: SchemaType.STRING,
            description: "Dish / meal name in Swedish.",
          } as Schema,
          summary: {
            type: SchemaType.STRING,
            description: "1–2 sentences in Swedish: what it is and how it uses offers or style.",
          } as Schema,
          meal_kind: {
            type: SchemaType.STRING,
            description: "One of: lunch, dinner, either, snack, other.",
          } as Schema,
          ingredients: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING } as Schema,
            description:
              "Swedish shopping lines; ingredients available in Sweden; promotion products may be only part of the list.",
          } as Schema,
          cooking_note: {
            type: SchemaType.STRING,
            description: "Short Swedish prep/cook steps, or empty string.",
          } as Schema,
          uses_promotion_titles: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING } as Schema,
            description: "Promotion titles from the input list used in this meal (exact strings).",
          } as Schema,
          cuisine_style: {
            type: SchemaType.STRING,
            description:
              "Short tag in Swedish, e.g. italienskt, vietnamesiskt, svensk husman, asiatiskt — aligned with user interests.",
          } as Schema,
        },
        required: [
          "title",
          "summary",
          "meal_kind",
          "ingredients",
          "cooking_note",
          "uses_promotion_titles",
          "cuisine_style",
        ],
      } as Schema,
    } as Schema,
    shopping_reminders: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING } as Schema,
    } as Schema,
  },
  required: ["intro", "meals", "shopping_reminders"],
};

function truncatePromoDetail(value: string | null | undefined, max: number): string {
  if (value == null) return "";
  const t = value.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

/**
 * Build **10 meal suggestions** from matched promotion rows (ICA-style offers, Swedish output).
 */
export async function generatePromoMealPlanForWeek(
  apiKey: string,
  input: {
    isoWeek: number;
    storeKey: string;
    interests: string[];
    promotions: PromoMealPlanInputItem[];
  },
): Promise<PromoMealPlanResult> {
  const promosPayload = input.promotions.map((p) => ({
    title: p.title,
    detail: truncatePromoDetail(p.card_text, 220),
    price_hint: truncatePromoDetail(p.price_hint, 80),
    watchlist_match: p.matched_interest,
  }));

  const systemPreamble = `Du är en praktisk matplanerare för ett hushåll i **Sverige**.

## Uppgift
Föreslå **exakt 10 måltider** (inte en dag-för-dag-veckokalender) utifrån:
- **Kampanjer** i JSON:en (ICA-liknande veckorbjudanden). **Utnyttja kampanjerna aktivt** – de kan vara huvudingrediens, del av rätten (t.ex. kyckling på kampanj i en gryta med andra saker) eller tillbehör. Koppla tydligt i text och i **uses_promotion_titles** när det stämmer.
- **watchlist_interests** (användarens intressen): använd dem för **smak och stil** – t.ex. asiatiskt, **vietnamesiskt**, **svensk** husman, **italienskt**, eller andra matkulturer som användaren nämner. Variera gärna mellan rätter så olika intressen får plats.
- **Ingredienser** ska vara **realistiska att köpa i Sverige** (vanliga matbutiker som ICA, Willys, Hemköp, Coop; specialitet som finns i vanliga större städer eller väl utbudet närbutik – undvik obskyra varor som sällan finns här). Skriv inköpsrader på **svenska** med valfri mängd där det hjälper.

## Regler
- Varje måltid har **ingredients** (lista) – kampanjvaror kan vara **en del** av listan, inte alltid hela måltiden.
- **cuisine_style**: kort svensk etikett (t.ex. "italienskt", "vietnamesiskt", "svensk husman", "asiatiskt") som speglar intressen och rätten.
- **meal_kind**: lunch | dinner | either | snack | other.
- **cooking_note**: korta tillagningssteg på svenska, eller tom sträng om uppenbart.
- **uses_promotion_titles**: exakt de kampanjtitlar från listan som måltiden bygger på (tom array om ingen kampanj passar).
- **intro** och **shopping_reminders** på svenska.
- Håll tonen vardaglig; inga långa recept – bara förslag som går att laga hemma.

Returnera JSON enligt schemat: **intro**, **meals** (10 st), **shopping_reminders**.`;

  const body = {
    iso_week: input.isoWeek,
    store_key: input.storeKey,
    watchlist_interests: input.interests,
    promotions: promosPayload,
  };

  const userContent = JSON.stringify(body, null, 0);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: PROMO_MEAL_PLAN_SCHEMA,
    },
  });

  const fullPrompt = `${systemPreamble}\n\n---\n\n${userContent}`;

  const result = await model.generateContent(fullPrompt);
  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("Gemini returned empty meal plan response");
  }

  let parsed: PromoMealPlanResult;
  try {
    parsed = JSON.parse(text) as PromoMealPlanResult;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Gemini returned invalid meal plan JSON: ${msg}. Snippet: ${text.slice(0, 160)}`);
  }

  const intro = typeof parsed.intro === "string" ? parsed.intro.trim() : "";
  const mealsRaw = Array.isArray((parsed as { meals?: unknown }).meals)
    ? (parsed as { meals: unknown[] }).meals
    : [];
  const meals: PromoMealPlanMeal[] = mealsRaw
    .filter((m) => m && typeof m === "object")
    .slice(0, 10)
    .map((raw) => {
      const m = raw as Partial<PromoMealPlanMeal>;
      return {
        title: typeof m.title === "string" ? m.title.trim() : "",
        summary: typeof m.summary === "string" ? m.summary.trim() : "",
        meal_kind: sanitizeMealKind(m.meal_kind),
        ingredients: sanitizeMealPlanIngredientList(m.ingredients),
        cooking_note: typeof m.cooking_note === "string" ? m.cooking_note.trim() : "",
        uses_promotion_titles: Array.isArray(m.uses_promotion_titles)
          ? m.uses_promotion_titles.filter((t): t is string => typeof t === "string").slice(0, 12)
          : [],
        cuisine_style:
          typeof m.cuisine_style === "string" ? m.cuisine_style.trim().slice(0, 80) : "",
      };
    })
    .filter((m) => m.title.length > 0 && (m.summary.length > 0 || m.ingredients.length > 0));

  const shopping_reminders = Array.isArray(parsed.shopping_reminders)
    ? parsed.shopping_reminders
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 12)
    : [];

  if (meals.length !== 10) {
    throw new Error(
      `Meal plan must contain exactly 10 meals; got ${meals.length}. Regenerate or adjust the model output.`,
    );
  }

  return {
    intro: intro || "Här är tio förslag baserat på veckans kampanjer och dina intressen.",
    meals,
    shopping_reminders,
  };
}

/** Structured ingredient line for recipe generator output (Swedish UI). */
export interface RecipeIngredient {
  text: string;
  ingredient_label: string;
  amount: string;
}

export type RecipeDifficulty = "easy" | "medium" | "hard";

function sanitizeRecipeDifficulty(value: unknown): RecipeDifficulty {
  return value === "easy" || value === "hard" || value === "medium" ? value : "medium";
}

/**
 * One AI-generated **suggestion** (recipe generator): dish names + shopping-style ingredients.
 * Cooking steps are **not** from the model — the user pastes markdown from a trusted source.
 */
export interface RecipeGeneratorMeal {
  /** Dish name in Swedish (primary). */
  title: string;
  /** Same dish in English (for search/sharing). */
  title_en: string;
  /** Same dish in Vietnamese (family communication). */
  title_vi: string;
  /** Optional one-line hint; full prose comes from the user’s pasted source. */
  summary: string;
  meal_kind: PromoMealPlanMealKind;
  /** Approx. active + light waiting time until serving, e.g. "ca 35 min" (Swedish). */
  estimated_cook_time: string;
  /** Rough cooking difficulty for planning and filtering. */
  difficulty: RecipeDifficulty;
  ingredients: RecipeIngredient[];
  /** Always empty from AI; filled when the user pastes source markdown in the dashboard. */
  steps: string[];
  uses_ingredient_picks: string[];
}

export interface RecipeGenerateResult {
  intro: string;
  meals: RecipeGeneratorMeal[];
}

export type VietnameseMealStatus = "draft" | "published" | "archived";
export type VietnameseMealIngredientRole =
  | "main"
  | "broth"
  | "sauce"
  | "garnish"
  | "optional";

export interface VietnameseMealTypicalIngredient {
  name: string;
  name_vi: string;
  role: VietnameseMealIngredientRole;
  notes: string;
}

export interface VietnameseMealTouristNotes {
  taste_description: string;
  ordering_context: string;
  allergen_hints: string[];
  adventurousness: "familiar" | "medium" | "adventurous";
}

export interface VietnameseMealDraft {
  name_vi: string;
  name_en: string;
  summary: string;
  status: VietnameseMealStatus;
  region_tags: string[];
  base_tags: string[];
  protein_tags: string[];
  method_tags: string[];
  flavor_tags: string[];
  meal_context_tags: string[];
  typical_ingredients: VietnameseMealTypicalIngredient[];
  tourist_notes: VietnameseMealTouristNotes;
  ai_confidence: number;
  warnings: string[];
}

export interface VietnameseMealEnrichmentResult {
  meals: VietnameseMealDraft[];
}

const RECIPE_GENERATOR_MAX_MEALS = 8;
const RECIPE_INGREDIENT_ROW_CAP = 24;
const RECIPE_STEP_CAP = 24;
const VIETNAMESE_MEAL_ENRICHMENT_MAX_MEALS = 30;
const VIETNAMESE_MEAL_TAG_CAP = 12;
const VIETNAMESE_MEAL_INGREDIENT_CAP = 24;

const VIETNAMESE_RECIPE_TRANSLATION_GLOSSARY = [
  {
    vi: "hạt nêm",
    sv: "vietnamesiskt buljongpulver",
    en: "Vietnamese seasoning granules",
  },
  { vi: "nước mắm", sv: "fisksås", en: "fish sauce" },
  { vi: "bột ngọt", sv: "natriumglutamat (MSG)", en: "MSG" },
  { vi: "bánh phở", sv: "risnudlar för pho", en: "pho rice noodles" },
  { vi: "gạo nếp", sv: "klibbigt ris", en: "glutinous rice" },
  { vi: "đường phèn", sv: "kandisocker", en: "rock sugar" },
] as const;

const VIETNAMESE_RECIPE_TRANSLATION_GLOSSARY_TEXT =
  VIETNAMESE_RECIPE_TRANSLATION_GLOSSARY.map(
    (row) => `- ${row.vi}: svenska = ${row.sv}; English = ${row.en}; tiếng Việt = ${row.vi}`,
  ).join("\n");

/** Model id for dashboard recipe generator (`generateRecipeIdeasFromIngredients`). */
export const RECIPE_GENERATOR_MODEL_ID = "gemini-2.5-flash";

/** Stored on `saved_recipes.source` when saving a suggestion-only row from the generator. */
export const RECIPE_GENERATOR_SOURCE_LABEL = "Gemini 2.5 Flash (AI recipe suggestions)";

/** Stored when the user pastes markdown from an external recipe to fulfill a suggestion. */
export const RECIPE_SOURCE_MANUAL_MARKDOWN = "Manual (markdown from source)";

export type FoodStyleFavoriteSuggestion = {
  watchlist_text: string;
  priority: number;
  reason: string;
};

export type FoodStyleFavoriteSuggestionResult = {
  suggestions: FoodStyleFavoriteSuggestion[];
};

const FOOD_STYLE_FAVORITE_SUGGESTION_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    suggestions: {
      type: SchemaType.ARRAY,
      description: "Suggested ICA watchlist items for this food style",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          watchlist_text: {
            type: SchemaType.STRING,
            description: "Exact watchlistText copied from the provided ICA item list",
          } as Schema,
          priority: {
            type: SchemaType.INTEGER,
            description: "Lower numbers are more important; use 10, 20, 30...",
          } as Schema,
          reason: {
            type: SchemaType.STRING,
            description: "Short Swedish reason why this item fits the food style",
          } as Schema,
        },
        required: ["watchlist_text", "priority", "reason"],
      } as Schema,
    } as Schema,
  },
  required: ["suggestions"],
};

function sanitizeFoodStyleSuggestion(value: unknown): FoodStyleFavoriteSuggestion | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Record<string, unknown>;
  const watchlist_text =
    typeof row.watchlist_text === "string"
      ? row.watchlist_text.replace(/\s+/g, " ").trim().slice(0, 120)
      : "";
  const priority =
    typeof row.priority === "number" && Number.isFinite(row.priority)
      ? Math.max(1, Math.min(999, Math.round(row.priority)))
      : 100;
  const reason =
    typeof row.reason === "string"
      ? row.reason.replace(/\s+/g, " ").trim().slice(0, 220)
      : "";
  if (!watchlist_text || !reason) {
    return null;
  }
  return { watchlist_text, priority, reason };
}

export async function suggestPromoFavoritesForFoodStyle(
  apiKey: string,
  input: {
    styleLabel: string;
    categories: Array<{ id: string; name: string; path: string }>;
    items: Array<{ watchlistText: string; categoryName: string; departmentName: string }>;
  },
): Promise<FoodStyleFavoriteSuggestionResult> {
  const styleLabel = input.styleLabel.replace(/\s+/g, " ").trim().slice(0, 120);
  if (!styleLabel) {
    throw new Error("Food style is required");
  }

  const categories = input.categories
    .map((category) => ({
      id: category.id,
      name: category.name.replace(/\s+/g, " ").trim().slice(0, 80),
      path: category.path.replace(/\s+/g, " ").trim().slice(0, 180),
    }))
    .filter((category) => category.id && category.name)
    .slice(0, 300);

  const items = input.items
    .map((item) => ({
      watchlistText: item.watchlistText.replace(/\s+/g, " ").trim().slice(0, 120),
      categoryName: item.categoryName.replace(/\s+/g, " ").trim().slice(0, 80),
      departmentName: item.departmentName.replace(/\s+/g, " ").trim().slice(0, 80),
    }))
    .filter((item) => item.watchlistText)
    .slice(0, 900);

  const allowedWatchlistTexts = new Set(items.map((item) => item.watchlistText));

  const prompt = `Du hjälper till att bygga en promo-watchlist för matlagning i Sverige.

## Uppgift
Välj 8-18 ICA-katalogposter som är bra att bevaka på kampanj för matstilen: **${styleLabel}**.

## Regler
- Använd endast exakt **watchlistText** från listan med ICA-katalogposter.
- Välj råvaror, proteiner, grönsaker, mejeri, basvaror eller färskvaror som faktiskt hjälper denna matstil.
- Prioritera sådant som ofta är värt att köpa på kampanj och går att laga flera rätter med.
- Undvik för generiska eller irrelevanta poster om det finns bättre specifika alternativ.
- **reason** ska vara kort på svenska.
- **priority**: 10, 20, 30... där lägre är viktigare.

## ICA-kategorier
${JSON.stringify(categories)}

## ICA-katalogposter
${JSON.stringify(items)}`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: RECIPE_GENERATOR_MODEL_ID,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: FOOD_STYLE_FAVORITE_SUGGESTION_SCHEMA,
    },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("Gemini returned empty food-style suggestion response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Gemini returned invalid food-style suggestion JSON: ${msg}. Snippet: ${text.slice(0, 160)}`,
    );
  }

  const root = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  const rawSuggestions = Array.isArray(root.suggestions) ? root.suggestions : [];
  const seen = new Set<string>();
  const suggestions: FoodStyleFavoriteSuggestion[] = [];
  for (const raw of rawSuggestions) {
    const suggestion = sanitizeFoodStyleSuggestion(raw);
    if (!suggestion || seen.has(suggestion.watchlist_text)) {
      continue;
    }
    if (!allowedWatchlistTexts.has(suggestion.watchlist_text)) {
      continue;
    }
    seen.add(suggestion.watchlist_text);
    suggestions.push(suggestion);
    if (suggestions.length >= 24) {
      break;
    }
  }

  if (suggestions.length === 0) {
    throw new Error("Gemini did not return any suggestions that matched the ICA catalog.");
  }

  return { suggestions };
}

const RECIPE_INGREDIENT_ITEM_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    text: {
      type: SchemaType.STRING,
      description: "Full display line in Swedish, e.g. Kycklingfilé ca 400 g, tärnad",
    } as Schema,
    ingredient_label: {
      type: SchemaType.STRING,
      description: "Short label for the ingredient (often matches a picked ICA label).",
    } as Schema,
    amount: {
      type: SchemaType.STRING,
      description: "Amount only, e.g. 400 g, 2 dl, 1 st, efter smak",
    } as Schema,
  },
  required: ["text", "ingredient_label", "amount"],
};

const RECIPE_GENERATOR_MEAL_ITEM_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING, description: "Dish name in Swedish" } as Schema,
    title_en: {
      type: SchemaType.STRING,
      description: "Same dish name in natural English (not a literal word-for-word translation if awkward)",
    } as Schema,
    title_vi: {
      type: SchemaType.STRING,
      description: "Same dish name in Vietnamese (natural phrasing)",
    } as Schema,
    summary: {
      type: SchemaType.STRING,
      description:
        "Optional: one short Swedish line (or empty). Do not write full recipes — only a hint if needed.",
    } as Schema,
    meal_kind: {
      type: SchemaType.STRING,
      description: "One of: lunch, dinner, either, snack, other",
    } as Schema,
    ingredients: {
      type: SchemaType.ARRAY,
      description: "Structured ingredient rows the cook would shop for (Swedish)",
      items: RECIPE_INGREDIENT_ITEM_SCHEMA,
    } as Schema,
    steps: {
      type: SchemaType.ARRAY,
      description: "Must be an empty array — do not output cooking steps",
      items: { type: SchemaType.STRING } as Schema,
    } as Schema,
    uses_ingredient_picks: {
      type: SchemaType.ARRAY,
      description: "Subset of user ingredient texts this meal uses",
      items: { type: SchemaType.STRING } as Schema,
    } as Schema,
    estimated_cook_time: {
      type: SchemaType.STRING,
      description:
        "Ungefärlig tid till servering (aktiv + lite väntetid), t.ex. ca 35 min eller 25–40 min",
    } as Schema,
    difficulty: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["easy", "medium", "hard"],
      description:
        "Cooking difficulty: easy = straightforward weekday cooking, medium = some timing/technique, hard = many steps or advanced technique",
    } as Schema,
  },
  required: [
    "title",
    "title_en",
    "title_vi",
    "meal_kind",
    "ingredients",
    "steps",
    "uses_ingredient_picks",
    "estimated_cook_time",
    "difficulty",
  ],
};

const RECIPE_GENERATOR_RESULT_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    intro: {
      type: SchemaType.STRING,
      description: "Short Swedish intro (1–3 sentences) or empty string",
    } as Schema,
    meals: {
      type: SchemaType.ARRAY,
      description: `At most ${RECIPE_GENERATOR_MAX_MEALS} meal ideas`,
      items: RECIPE_GENERATOR_MEAL_ITEM_SCHEMA,
    } as Schema,
  },
  required: ["intro", "meals"],
};

const VIETNAMESE_MEAL_INGREDIENT_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    name: { type: SchemaType.STRING, description: "Ingredient name in English" } as Schema,
    name_vi: { type: SchemaType.STRING, description: "Ingredient name in Vietnamese if known" } as Schema,
    role: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["main", "broth", "sauce", "garnish", "optional"],
    } as Schema,
    notes: {
      type: SchemaType.STRING,
      description: "Short English note about the ingredient role, or empty string",
    } as Schema,
  },
  required: ["name", "name_vi", "role", "notes"],
};

const VIETNAMESE_MEAL_TOURIST_NOTES_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    taste_description: {
      type: SchemaType.STRING,
      description: "Short English description of what the dish tastes like",
    } as Schema,
    ordering_context: {
      type: SchemaType.STRING,
      description: "Short English note about where/when tourists commonly order it",
    } as Schema,
    allergen_hints: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING } as Schema,
    } as Schema,
    adventurousness: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["familiar", "medium", "adventurous"],
    } as Schema,
  },
  required: ["taste_description", "ordering_context", "allergen_hints", "adventurousness"],
};

const VIETNAMESE_MEAL_DRAFT_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    name_vi: { type: SchemaType.STRING, description: "Canonical Vietnamese dish name" } as Schema,
    name_en: { type: SchemaType.STRING, description: "Natural English dish name" } as Schema,
    summary: {
      type: SchemaType.STRING,
      description: "Short English summary of the dish for the dashboard",
    } as Schema,
    status: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["draft", "published", "archived"],
    } as Schema,
    region_tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } as Schema } as Schema,
    base_tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } as Schema } as Schema,
    protein_tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } as Schema } as Schema,
    method_tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } as Schema } as Schema,
    flavor_tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } as Schema } as Schema,
    meal_context_tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } as Schema } as Schema,
    typical_ingredients: {
      type: SchemaType.ARRAY,
      items: VIETNAMESE_MEAL_INGREDIENT_SCHEMA,
    } as Schema,
    tourist_notes: VIETNAMESE_MEAL_TOURIST_NOTES_SCHEMA,
    ai_confidence: {
      type: SchemaType.NUMBER,
      description: "Confidence from 0 to 1",
    } as Schema,
    warnings: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } as Schema } as Schema,
  },
  required: [
    "name_vi",
    "name_en",
    "summary",
    "status",
    "region_tags",
    "base_tags",
    "protein_tags",
    "method_tags",
    "flavor_tags",
    "meal_context_tags",
    "typical_ingredients",
    "tourist_notes",
    "ai_confidence",
    "warnings",
  ],
};

const VIETNAMESE_MEAL_ENRICHMENT_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    meals: {
      type: SchemaType.ARRAY,
      items: VIETNAMESE_MEAL_DRAFT_SCHEMA,
    } as Schema,
  },
  required: ["meals"],
};

const VIETNAMESE_RECIPE_INGREDIENT_ITEM_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    text: {
      type: SchemaType.STRING,
      description: "Full display line in English, e.g. rice noodles 300 g, soaked",
    } as Schema,
    ingredient_label: {
      type: SchemaType.STRING,
      description: "Short shopping-friendly ingredient label in English.",
    } as Schema,
    amount: {
      type: SchemaType.STRING,
      description: "Amount in English/metric-friendly text, e.g. 300 g, 2 tbsp, to taste",
    } as Schema,
  },
  required: ["text", "ingredient_label", "amount"],
};

const VIETNAMESE_RECIPE_GENERATOR_MEAL_ITEM_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING, description: "Dish name in English" } as Schema,
    title_en: { type: SchemaType.STRING, description: "Same dish name in English" } as Schema,
    title_vi: {
      type: SchemaType.STRING,
      description: "Same dish name in Vietnamese with diacritics when known",
    } as Schema,
    summary: {
      type: SchemaType.STRING,
      description: "One short English line describing the dish. No Swedish.",
    } as Schema,
    meal_kind: {
      type: SchemaType.STRING,
      description: "One of: lunch, dinner, either, snack, other",
    } as Schema,
    ingredients: {
      type: SchemaType.ARRAY,
      description: "Structured ingredient rows in English, with Vietnamese terms preserved where useful",
      items: VIETNAMESE_RECIPE_INGREDIENT_ITEM_SCHEMA,
    } as Schema,
    steps: {
      type: SchemaType.ARRAY,
      description: "Must be an empty array - do not output cooking steps",
      items: { type: SchemaType.STRING } as Schema,
    } as Schema,
    uses_ingredient_picks: {
      type: SchemaType.ARRAY,
      description: "Subset of source ingredient names this meal uses",
      items: { type: SchemaType.STRING } as Schema,
    } as Schema,
    estimated_cook_time: {
      type: SchemaType.STRING,
      description: "Approximate time in English, e.g. about 35 min or 25-40 min",
    } as Schema,
    difficulty: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["easy", "medium", "hard"],
      description: "Cooking difficulty: easy, medium, or hard",
    } as Schema,
  },
  required: [
    "title",
    "title_en",
    "title_vi",
    "meal_kind",
    "ingredients",
    "steps",
    "uses_ingredient_picks",
    "estimated_cook_time",
    "difficulty",
  ],
};

const VIETNAMESE_RECIPE_GENERATOR_RESULT_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    intro: {
      type: SchemaType.STRING,
      description: "Short English intro or empty string. No Swedish.",
    } as Schema,
    meals: {
      type: SchemaType.ARRAY,
      description: `At most ${RECIPE_GENERATOR_MAX_MEALS} meal ideas`,
      items: VIETNAMESE_RECIPE_GENERATOR_MEAL_ITEM_SCHEMA,
    } as Schema,
  },
  required: ["intro", "meals"],
};

function sanitizeRecipeIngredientRow(value: unknown): RecipeIngredient | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  const text = typeof o.text === "string" ? o.text.replace(/\s+/g, " ").trim().slice(0, 220) : "";
  const ingredient_label =
    typeof o.ingredient_label === "string"
      ? o.ingredient_label.replace(/\s+/g, " ").trim().slice(0, 120)
      : "";
  const amount =
    typeof o.amount === "string" ? o.amount.replace(/\s+/g, " ").trim().slice(0, 80) : "";
  if (!text || !ingredient_label || !amount) return null;
  return { text, ingredient_label, amount };
}

function sanitizeRecipeGeneratorMeal(raw: unknown): RecipeGeneratorMeal | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const title = typeof m.title === "string" ? m.title.replace(/\s+/g, " ").trim().slice(0, 160) : "";
  const title_en =
    typeof m.title_en === "string" ? m.title_en.replace(/\s+/g, " ").trim().slice(0, 160) : "";
  const title_vi =
    typeof m.title_vi === "string" ? m.title_vi.replace(/\s+/g, " ").trim().slice(0, 160) : "";
  const summary =
    typeof m.summary === "string" ? m.summary.replace(/\s+/g, " ").trim().slice(0, 600) : "";
  if (!title) return null;

  const ingRaw = Array.isArray(m.ingredients) ? m.ingredients : [];
  const ingredients: RecipeIngredient[] = [];
  for (const row of ingRaw) {
    const s = sanitizeRecipeIngredientRow(row);
    if (s) ingredients.push(s);
    if (ingredients.length >= RECIPE_INGREDIENT_ROW_CAP) break;
  }
  if (ingredients.length === 0) return null;

  /** Suggestions never include cooking steps from the model — user pastes a trusted source later. */
  const steps: string[] = [];

  const estimated_cook_time =
    typeof m.estimated_cook_time === "string"
      ? m.estimated_cook_time.replace(/\s+/g, " ").trim().slice(0, 80)
      : "";
  const difficulty = sanitizeRecipeDifficulty(m.difficulty);

  const uses = Array.isArray(m.uses_ingredient_picks)
    ? m.uses_ingredient_picks
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, 20)
    : [];

  return {
    title,
    title_en,
    title_vi,
    summary,
    meal_kind: sanitizeMealKind(m.meal_kind),
    estimated_cook_time,
    difficulty,
    ingredients,
    steps,
    uses_ingredient_picks: uses,
  };
}

function cleanShortText(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function sanitizeVietnameseTagList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const tag = cleanShortText(item, 48).toLocaleLowerCase("sv-SE");
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= VIETNAMESE_MEAL_TAG_CAP) break;
  }
  return out;
}

function sanitizeVietnameseMealIngredientRole(
  value: unknown,
): VietnameseMealIngredientRole {
  return value === "main" ||
    value === "broth" ||
    value === "sauce" ||
    value === "garnish" ||
    value === "optional"
    ? value
    : "main";
}

function sanitizeVietnameseMealIngredient(
  value: unknown,
): VietnameseMealTypicalIngredient | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  const name = cleanShortText(o.name, 100);
  const name_vi = cleanShortText(o.name_vi, 100);
  if (!name && !name_vi) return null;
  return {
    name: name || name_vi,
    name_vi,
    role: sanitizeVietnameseMealIngredientRole(o.role),
    notes: cleanShortText(o.notes, 180),
  };
}

function sanitizeVietnameseMealTouristNotes(value: unknown): VietnameseMealTouristNotes {
  const o = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const adventurousnessRaw = o.adventurousness;
  const adventurousness =
    adventurousnessRaw === "familiar" ||
    adventurousnessRaw === "adventurous" ||
    adventurousnessRaw === "medium"
      ? adventurousnessRaw
      : "medium";
  return {
    taste_description: cleanShortText(o.taste_description, 300),
    ordering_context: cleanShortText(o.ordering_context, 300),
    allergen_hints: sanitizeVietnameseTagList(o.allergen_hints).slice(0, 10),
    adventurousness,
  };
}

function sanitizeVietnameseMealDraft(raw: unknown): VietnameseMealDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const name_vi = cleanShortText(o.name_vi, 120);
  if (!name_vi) return null;

  const rawIngredients = Array.isArray(o.typical_ingredients) ? o.typical_ingredients : [];
  const typical_ingredients: VietnameseMealTypicalIngredient[] = [];
  for (const item of rawIngredients) {
    const ingredient = sanitizeVietnameseMealIngredient(item);
    if (ingredient) typical_ingredients.push(ingredient);
    if (typical_ingredients.length >= VIETNAMESE_MEAL_INGREDIENT_CAP) break;
  }

  const aiConfidence =
    typeof o.ai_confidence === "number" && Number.isFinite(o.ai_confidence)
      ? Math.max(0, Math.min(1, o.ai_confidence))
      : 0.5;

  return {
    name_vi,
    name_en: cleanShortText(o.name_en, 160),
    summary: cleanShortText(o.summary, 900),
    status: "draft",
    region_tags: sanitizeVietnameseTagList(o.region_tags),
    base_tags: sanitizeVietnameseTagList(o.base_tags),
    protein_tags: sanitizeVietnameseTagList(o.protein_tags),
    method_tags: sanitizeVietnameseTagList(o.method_tags),
    flavor_tags: sanitizeVietnameseTagList(o.flavor_tags),
    meal_context_tags: sanitizeVietnameseTagList(o.meal_context_tags),
    typical_ingredients,
    tourist_notes: sanitizeVietnameseMealTouristNotes(o.tourist_notes),
    ai_confidence: Math.round(aiConfidence * 100) / 100,
    warnings: sanitizeVietnameseTagList(o.warnings).slice(0, 8),
  };
}

/**
 * Generate up to **8** meal ideas from food type + optional ICA ingredient picks, vegetarian, and excludes.
 */
export async function generateRecipeIdeasFromIngredients(
  apiKey: string,
  input: {
    ingredientTexts: string[];
    foodTypeLabelSv: string;
    vegetarian: boolean;
    excludeMealTitles: string[];
  },
): Promise<RecipeGenerateResult> {
  const picks = input.ingredientTexts
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 24);

  const exclude = input.excludeMealTitles
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 40);

  const excludeBlock =
    exclude.length > 0
      ? `\n## Undvik dessa rätter (titlar)\nAnvändaren vill **inte** ha dessa eller nästan identiska varianter:\n${exclude.map((t) => `- ${t}`).join("\n")}\n`
      : "";

  const vegBlock = input.vegetarian
    ? `\n## Vegetariskt\n- Föreslå **endast vegetariska** rätter: **ingen** kött, fisk, skaldjur, gelatin eller djur löpe.\n- Ägg och mejeri är tillåtet om det passar.\n`
    : "";

  const ingredientModeBlock =
    picks.length > 0
      ? `- Användarens valda ingredienser är **fokus**, inte ett tvång att använda alla i varje rätt.\n- **uses_ingredient_picks**: vilka av användarens ingredienser som är centrala (exakta strängar från listan när möjligt).`
      : `- Användaren har inte valt fokusingredienser. Föreslå rätter utifrån **matstilen** och vanliga råvaror som är lätta att handla i Sverige.\n- **uses_ingredient_picks** ska vara en tom lista [].`;

  const systemPreamble = `Du hjälper ett hushåll i **Sverige** att välja **rätter** utifrån matstil och eventuella fokusråvaror.

## Uppgift
Föreslå **högst ${RECIPE_GENERATOR_MAX_MEALS}** **rättnamn + inköpslista** (ingrediensrader) utifrån användarens **matstil** och eventuella **valda ingredienser**.

## Viktigt: ingen tillagning från modellen
- **Skriv inte** tillagningssteg, metod eller detaljerade recept. Användaren hämtar det pålitlig text från bloggar, böcker eller sidor och klistrar in den själv.
- Fältet **steps** ska alltid vara en **tom lista []**.
- **summary** är valfri: högst **en kort rad** på svenska (eller tom sträng) — t.ex. stil på rätten. **Ingen** längre beskrivning.

## Regler
- **Svenska** för **title**, **ingredients** (och valfri **summary**). Ingredienser i **realistiska svenska butiksmängder** (g, kg, dl, ml, st, krm).
- **title_en** / **title_vi**: samma rätt, naturliga namn (för sök och familj).
- **ingredients**: varje rad har **text** (full rad), **ingredient_label** (kort, gärna nära användarens val), **amount**.
- **meal_kind**: lunch | dinner | either | snack | other.
- **estimated_cook_time**: grov uppskattning (t.ex. "ca 30 min") — bara vägledning.
- **difficulty**: easy | medium | hard. Välj **easy** för enkel vardagsmat, **medium** för viss tajming/teknik, **hard** för många moment eller avancerad teknik.
${ingredientModeBlock}
${vegBlock}${excludeBlock}
`;

  const body = {
    ingredient_picks: picks,
    food_type: input.foodTypeLabelSv,
    vegetarian: input.vegetarian,
  };

  const userContent = JSON.stringify(body, null, 0);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: RECIPE_GENERATOR_MODEL_ID,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RECIPE_GENERATOR_RESULT_SCHEMA,
    },
  });

  const fullPrompt = `${systemPreamble}\n\n---\n\n${userContent}`;

  const result = await model.generateContent(fullPrompt);
  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("Gemini returned empty recipe generator response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Gemini returned invalid recipe JSON: ${msg}. Snippet: ${text.slice(0, 160)}`);
  }

  const root = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  const intro =
    typeof root.intro === "string" ? root.intro.replace(/\s+/g, " ").trim().slice(0, 800) : "";

  const mealsRaw = Array.isArray(root.meals) ? root.meals : [];
  const meals: RecipeGeneratorMeal[] = mealsRaw
    .map((m) => sanitizeRecipeGeneratorMeal(m))
    .filter((m): m is RecipeGeneratorMeal => m !== null)
    .slice(0, RECIPE_GENERATOR_MAX_MEALS);

  if (meals.length === 0) {
    throw new Error("Recipe generator returned no usable meals after validation.");
  }

  return {
    intro:
      intro ||
      "Här är rättförslag och inköpsrader. Klistra in tillagning från en källa du litar på när du sparar.",
    meals,
  };
}

export async function enrichVietnameseMealNames(
  apiKey: string,
  input: { names: string[] },
): Promise<VietnameseMealEnrichmentResult> {
  const names = input.names
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, VIETNAMESE_MEAL_ENRICHMENT_MAX_MEALS);
  if (names.length === 0) {
    throw new Error("At least one meal name is required.");
  }

  const prompt = `You are building a curated Vietnamese food knowledge base for a household recipe dashboard.

## Task
Enrich each Vietnamese meal name into a reviewed draft catalog row.

## Rules
- Keep **name_vi** as the canonical Vietnamese dish name with diacritics when known.
- **summary** must be English, short, and practical for a recipe library and future tourist food discovery.
- Tags must be short lowercase facets, not long sentences.
- Use these tag styles:
  - region_tags: north, central, south, hue, saigon, hanoi, mekong, diaspora, unknown
  - base_tags: noodles, rice, soup, bread, rolls, pancake, salad, hotpot
  - protein_tags: pork, beef, chicken, seafood, fish, shrimp, egg, tofu, vegetarian
  - method_tags: grilled, braised, fried, steamed, simmered, fresh, fermented
  - flavor_tags: spicy, sour, sweet-savory, herb-heavy, fermented, rich, light
  - meal_context_tags: breakfast, lunch, dinner, street-food, family-meal, festive, snack
- typical_ingredients should list ingredients tourists/cooks would recognize. Use role main/broth/sauce/garnish/optional.
- tourist_notes are future-facing, in English.
- ai_confidence is 0-1. Add warnings when regional variation or uncertainty matters.
- Set status to draft for every row.

Input names:
${JSON.stringify(names)}`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: RECIPE_GENERATOR_MODEL_ID,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: VIETNAMESE_MEAL_ENRICHMENT_SCHEMA,
    },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("Gemini returned empty Vietnamese meal enrichment response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Gemini returned invalid Vietnamese meal JSON: ${msg}. Snippet: ${text.slice(0, 160)}`,
    );
  }

  const root = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  const rawMeals = Array.isArray(root.meals) ? root.meals : [];
  const meals = rawMeals
    .map((meal) => sanitizeVietnameseMealDraft(meal))
    .filter((meal): meal is VietnameseMealDraft => meal !== null)
    .slice(0, names.length);

  if (meals.length === 0) {
    throw new Error("Vietnamese meal enrichment returned no usable meals after validation.");
  }
  return { meals };
}

export async function generateRecipesFromVietnameseMeals(
  apiKey: string,
  input: {
    meals: Array<{
      name_vi: string;
      name_en: string;
      summary: string;
      region_tags: string[];
      base_tags: string[];
      protein_tags: string[];
      typical_ingredients: VietnameseMealTypicalIngredient[];
    }>;
    excludeMealTitles: string[];
  },
): Promise<RecipeGenerateResult> {
  const meals = input.meals
    .map((meal) => ({
      name_vi: cleanShortText(meal.name_vi, 120),
      name_en: cleanShortText(meal.name_en, 160),
      summary: cleanShortText(meal.summary, 700),
      region_tags: meal.region_tags.slice(0, 10),
      base_tags: meal.base_tags.slice(0, 10),
      protein_tags: meal.protein_tags.slice(0, 10),
      typical_ingredients: meal.typical_ingredients.slice(0, 18),
    }))
    .filter((meal) => meal.name_vi)
    .slice(0, 8);
  if (meals.length === 0) {
    throw new Error("At least one Vietnamese meal is required.");
  }

  const exclude = input.excludeMealTitles
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 40);
  const excludeBlock =
    exclude.length > 0
      ? `\nAvoid these existing saved recipe titles or near-identical variants:\n${exclude.map((title) => `- ${title}`).join("\n")}`
      : "";

  const prompt = `You help build recipe ideas from a curated Vietnamese meal database.

## Task
Create at most ${RECIPE_GENERATOR_MAX_MEALS} recipe suggestions inspired by the selected Vietnamese meals.

## Language rules
- Use **English** for title, title_en, summary, intro, ingredient text, ingredient_label, amount, estimated_cook_time, and any notes.
- Use **Vietnamese** only in title_vi and when preserving specific Vietnamese ingredient names inside English ingredient text.
- Do **not** write Swedish anywhere. Avoid Swedish words such as "ca", "st", "efter smak", "färsk", "risnudlar", "fisksås", or "vietnamesiskt".

## Content rules
- The result must match the recipe generator schema.
- title and title_en should be natural English names for the dish.
- title_vi should be the natural Vietnamese dish name with diacritics when known.
- steps must always be [] because the user will add cooking instructions from a trusted source later.
- Keep the recipes practical for a household shopping in Sweden, but describe ingredients in English.
- ingredient_label must be short and shopping-friendly in English.
- Amounts should use metric-friendly English, e.g. "400 g", "2 tbsp", "to taste".
- estimated_cook_time should be English, e.g. "about 35 min" or "25-40 min".
- difficulty must be realistic.
${excludeBlock}

Selected Vietnamese meals:
${JSON.stringify(meals)}`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: RECIPE_GENERATOR_MODEL_ID,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: VIETNAMESE_RECIPE_GENERATOR_RESULT_SCHEMA,
    },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("Gemini returned empty Vietnamese recipe suggestion response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Gemini returned invalid Vietnamese recipe JSON: ${msg}. Snippet: ${text.slice(0, 160)}`,
    );
  }

  const root = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  const intro =
    typeof root.intro === "string" ? root.intro.replace(/\s+/g, " ").trim().slice(0, 800) : "";
  const rawMeals = Array.isArray(root.meals) ? root.meals : [];
  const suggestions = rawMeals
    .map((meal) => sanitizeRecipeGeneratorMeal(meal))
    .filter((meal): meal is RecipeGeneratorMeal => meal !== null)
    .slice(0, RECIPE_GENERATOR_MAX_MEALS);

  if (suggestions.length === 0) {
    throw new Error("Vietnamese recipe suggestions returned no usable meals after validation.");
  }
  return {
    intro: intro || "Here are recipe ideas inspired by the selected Vietnamese meals.",
    meals: suggestions,
  };
}

/** Full recipe text in one target language (cached in `saved_recipes.i18n`). */
export interface SavedRecipeTranslationPayload {
  title: string;
  summary: string;
  ingredients: RecipeIngredient[];
  steps: string[];
}

const RECIPE_TRANSLATE_RESULT_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: {
      type: SchemaType.STRING,
      description: "Dish name in the target language (natural, concise)",
    } as Schema,
    summary: {
      type: SchemaType.STRING,
      description: "1–2 sentences in the target language: what the dish is",
    } as Schema,
    ingredients: {
      type: SchemaType.ARRAY,
      description: "Same rows as source, translated",
      items: RECIPE_INGREDIENT_ITEM_SCHEMA,
    } as Schema,
    steps: {
      type: SchemaType.ARRAY,
      description: "Cooking steps in the target language, one short sentence each",
      items: { type: SchemaType.STRING } as Schema,
    } as Schema,
  },
  required: ["title", "summary", "ingredients", "steps"],
};

function sanitizeSavedRecipeTranslationPayload(raw: unknown): SavedRecipeTranslationPayload | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const m = raw as Record<string, unknown>;
  const title =
    typeof m.title === "string" ? m.title.replace(/\s+/g, " ").trim().slice(0, 200) : "";
  const summary =
    typeof m.summary === "string" ? m.summary.replace(/\s+/g, " ").trim().slice(0, 800) : "";
  if (!title || !summary) {
    return null;
  }
  const ingRaw = Array.isArray(m.ingredients) ? m.ingredients : [];
  const ingredients: RecipeIngredient[] = [];
  for (const row of ingRaw) {
    const s = sanitizeRecipeIngredientRow(row);
    if (s) {
      ingredients.push(s);
    }
    if (ingredients.length >= RECIPE_INGREDIENT_ROW_CAP) {
      break;
    }
  }
  if (ingredients.length === 0) {
    return null;
  }
  const stepsRaw = Array.isArray(m.steps) ? m.steps : [];
  const steps = stepsRaw
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((s) => (s.length > 800 ? `${s.slice(0, 800)}…` : s))
    .slice(0, RECIPE_STEP_CAP);
  if (steps.length === 0) {
    return null;
  }
  return { title, summary, ingredients, steps };
}

/**
 * Translate a saved recipe’s Swedish body (and title when needed) to English or Vietnamese.
 * Prefer using existing `title_en` / `title_vi` as hints when provided.
 */
export async function translateSavedRecipeBody(
  apiKey: string,
  input: {
    sourceTitle: string;
    sourceSummary: string;
    ingredients: RecipeIngredient[];
    steps: string[];
    existingTitleEn?: string;
    existingTitleVi?: string;
  },
  target: "en" | "vi",
): Promise<SavedRecipeTranslationPayload> {
  const langName = target === "en" ? "English" : "Vietnamese";
  const hint =
    target === "en"
      ? input.existingTitleEn?.trim()
        ? `If appropriate, align the title with this existing English name (you may refine slightly): "${input.existingTitleEn.trim()}"`
        : ""
      : input.existingTitleVi?.trim()
        ? `If appropriate, align the title with this existing Vietnamese name (you may refine slightly): "${input.existingTitleVi.trim()}"`
        : "";

  const sourceJson = JSON.stringify(
    {
      title_sv: input.sourceTitle,
      summary_sv: input.sourceSummary,
      ingredients_sv: input.ingredients,
      steps_sv: input.steps,
    },
    null,
    0,
  );

  const systemPreamble = `You translate home cooking recipes for a family in Sweden.

## Task
Translate the recipe into **${langName}** for kitchen use. Keep units realistic (g, kg, dl, ml, st, krm) and ingredient structure.

## Rules
- **title**: Natural dish name in ${langName} (not literal if awkward).
- **summary**: 1–2 sentences in ${langName}.
- **ingredients**: Same number of rows as source; each row has **text**, **ingredient_label**, **amount** — all in ${langName} where it makes sense (labels can stay short).
- **steps**: Same step count and order as source; clear, short sentences in ${langName}.
- Preserve culturally specific Vietnamese ingredients. If a glossary term appears in the source, use the exact target-language term below instead of a generic substitute.

## Vietnamese ingredient glossary
${VIETNAMESE_RECIPE_TRANSLATION_GLOSSARY_TEXT}
${hint ? `\n## Title hint\n${hint}\n` : ""}
`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: RECIPE_GENERATOR_MODEL_ID,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RECIPE_TRANSLATE_RESULT_SCHEMA,
    },
  });

  const fullPrompt = `${systemPreamble}\n## Source (JSON)\n${sourceJson}\n`;
  const result = await model.generateContent(fullPrompt);
  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("Gemini returned empty translation");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Gemini returned invalid translation JSON: ${msg}`);
  }
  const out = sanitizeSavedRecipeTranslationPayload(parsed);
  if (!out) {
    throw new Error("Gemini translation failed validation");
  }
  return out;
}

async function translateImportedSourceBodyToSwedish(
  apiKey: string,
  input: {
    sourceLanguage: "en" | "vi";
    sourceTitle: string;
    sourceSummary: string;
    ingredients: RecipeIngredient[];
    steps: string[];
  },
): Promise<SavedRecipeTranslationPayload> {
  const sourceLanguageName = input.sourceLanguage === "en" ? "English" : "Vietnamese";
  const sourceJson = JSON.stringify(
    {
      source_language: input.sourceLanguage,
      title: input.sourceTitle,
      summary: input.sourceSummary,
      ingredients: input.ingredients,
      steps: input.steps,
    },
    null,
    0,
  );

  const systemPreamble = `You translate imported home cooking recipes for a family in Sweden.

## Task
Translate the ${sourceLanguageName} recipe body into **Swedish** for the primary saved recipe fields.

## Rules
- Return only Swedish in **title**, **summary**, **ingredients**, and **steps**.
- **title**: natural Swedish dish name; preserve the dish identity.
- **summary**: 1–2 Swedish sentences.
- **ingredients**: same number of rows as source; each row has **text**, **ingredient_label**, **amount**. Translate text and labels into Swedish shopping/cooking language.
- **steps**: same step count and order as source; clear Swedish kitchen instructions.
- Keep units realistic for Sweden (g, kg, dl, ml, st, krm).
- Preserve culturally specific Vietnamese ingredients. If a glossary term appears in the source, use the exact Swedish term below instead of a generic substitute.

## Vietnamese ingredient glossary
${VIETNAMESE_RECIPE_TRANSLATION_GLOSSARY_TEXT}
`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: RECIPE_GENERATOR_MODEL_ID,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RECIPE_TRANSLATE_RESULT_SCHEMA,
    },
  });

  const fullPrompt = `${systemPreamble}\n## Source (JSON)\n${sourceJson}\n`;
  const result = await model.generateContent(fullPrompt);
  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("Gemini returned empty Swedish import translation");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Gemini returned invalid Swedish import translation JSON: ${msg}`);
  }
  const out = sanitizeSavedRecipeTranslationPayload(parsed);
  if (!out) {
    throw new Error("Gemini Swedish import translation failed validation");
  }
  return out;
}

async function ensureImportedRecipePrimaryBodyIsSwedish(
  apiKey: string,
  parsed: ParsedRecipeFromMarkdownImport,
): Promise<ParsedRecipeFromMarkdownImport> {
  if (parsed.source_language !== "en" && parsed.source_language !== "vi") {
    return parsed;
  }
  if (
    !parsed.source_language_summary.trim() ||
    parsed.source_language_ingredients.length === 0 ||
    parsed.source_language_steps.length === 0
  ) {
    return parsed;
  }

  const translated = await translateImportedSourceBodyToSwedish(apiKey, {
    sourceLanguage: parsed.source_language,
    sourceTitle: parsed.source_language_title,
    sourceSummary: parsed.source_language_summary,
    ingredients: parsed.source_language_ingredients,
    steps: parsed.source_language_steps,
  });

  return {
    ...parsed,
    summary: translated.summary,
    ingredients: translated.ingredients,
    steps: translated.steps,
  };
}

async function ensureNewDishPrimaryBodyIsSwedish(
  apiKey: string,
  parsed: ParsedNewDishFromMarkdown,
): Promise<ParsedNewDishFromMarkdown> {
  if (parsed.source_language !== "en" && parsed.source_language !== "vi") {
    return parsed;
  }
  if (
    !parsed.source_language_summary.trim() ||
    parsed.source_language_ingredients.length === 0 ||
    parsed.source_language_steps.length === 0
  ) {
    return parsed;
  }

  const translated = await translateImportedSourceBodyToSwedish(apiKey, {
    sourceLanguage: parsed.source_language,
    sourceTitle:
      parsed.source_language === "en"
        ? parsed.title_en.trim() || parsed.title
        : parsed.title_vi.trim() || parsed.title,
    sourceSummary: parsed.source_language_summary,
    ingredients: parsed.source_language_ingredients,
    steps: parsed.source_language_steps,
  });

  return {
    ...parsed,
    title: translated.title,
    summary: translated.summary,
    ingredients: translated.ingredients,
    steps: translated.steps,
  };
}

/** Structured recipe extracted from pasted markdown (import flow). */
export type ParsedRecipeFromMarkdownImport = {
  summary: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  /** Swedish phrase, e.g. "ca 35 min", or empty. */
  estimated_cook_time: string;
  difficulty: RecipeDifficulty;
  /** Detected original/source language of the pasted markdown. */
  source_language: "sv" | "en" | "vi" | "other";
  /** Original-language dish name when source language is EN/VI; empty otherwise. */
  source_language_title: string;
  /** Original-language summary when source language is EN/VI; empty otherwise. */
  source_language_summary: string;
  /** Original-language ingredient rows when source language is EN/VI; empty otherwise. */
  source_language_ingredients: RecipeIngredient[];
  /** Original-language steps when source language is EN/VI; empty otherwise. */
  source_language_steps: string[];
};

const RECIPE_MARKDOWN_IMPORT_RESULT_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    summary: {
      type: SchemaType.STRING,
      description:
        "1–2 sentences in Swedish describing the dish (what it is, not full instructions). Never copy English/Vietnamese source text here.",
    } as Schema,
    ingredients: {
      type: SchemaType.ARRAY,
      description:
        "Structured ingredient lines in Swedish for shopping. Never copy English/Vietnamese source rows here.",
      items: RECIPE_INGREDIENT_ITEM_SCHEMA,
    } as Schema,
    steps: {
      type: SchemaType.ARRAY,
      description:
        "Ordered cooking steps in Swedish, one clear sentence per step (no numbering in the string). Never copy English/Vietnamese source steps here.",
      items: { type: SchemaType.STRING } as Schema,
    } as Schema,
    estimated_cook_time: {
      type: SchemaType.STRING,
      description:
        "Approximate total time in Swedish, e.g. ca 40 min or 25–35 min; empty string if unknown",
    } as Schema,
    difficulty: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["easy", "medium", "hard"],
      description:
        "Cooking difficulty: easy = straightforward, medium = some timing/technique, hard = many steps or advanced technique",
    } as Schema,
    source_language: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["sv", "en", "vi", "other"],
      description: "Detected main language of the pasted source markdown.",
    } as Schema,
    source_language_title: {
      type: SchemaType.STRING,
      description:
        "Original-language title if source_language is en or vi; empty string for sv/other.",
    } as Schema,
    source_language_summary: {
      type: SchemaType.STRING,
      description:
        "Original-language 1–2 sentence summary if source_language is en or vi; empty string for sv/other.",
    } as Schema,
    source_language_ingredients: {
      type: SchemaType.ARRAY,
      description:
        "Original-language ingredient rows if source_language is en or vi; empty array for sv/other.",
      items: RECIPE_INGREDIENT_ITEM_SCHEMA,
    } as Schema,
    source_language_steps: {
      type: SchemaType.ARRAY,
      description:
        "Original-language cooking steps if source_language is en or vi; empty array for sv/other.",
      items: { type: SchemaType.STRING } as Schema,
    } as Schema,
  },
  required: [
    "summary",
    "ingredients",
    "steps",
    "estimated_cook_time",
    "difficulty",
    "source_language",
    "source_language_title",
    "source_language_summary",
    "source_language_ingredients",
    "source_language_steps",
  ],
};

function sanitizeParsedRecipeMarkdownImport(raw: unknown): ParsedRecipeFromMarkdownImport | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const m = raw as Record<string, unknown>;
  const summary =
    typeof m.summary === "string" ? m.summary.replace(/\s+/g, " ").trim().slice(0, 800) : "";
  if (!summary) {
    return null;
  }
  const ingRaw = Array.isArray(m.ingredients) ? m.ingredients : [];
  const ingredients: RecipeIngredient[] = [];
  for (const row of ingRaw) {
    const s = sanitizeRecipeIngredientRow(row);
    if (s) {
      ingredients.push(s);
    }
    if (ingredients.length >= RECIPE_INGREDIENT_ROW_CAP) {
      break;
    }
  }
  if (ingredients.length === 0) {
    return null;
  }
  const stepsRaw = Array.isArray(m.steps) ? m.steps : [];
  const steps = stepsRaw
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((s) => (s.length > 800 ? `${s.slice(0, 800)}…` : s))
    .slice(0, RECIPE_STEP_CAP);
  if (steps.length === 0) {
    return null;
  }
  const estimated_cook_time =
    typeof m.estimated_cook_time === "string"
      ? m.estimated_cook_time.replace(/\s+/g, " ").trim().slice(0, 120)
      : "";
  const difficulty = sanitizeRecipeDifficulty(m.difficulty);
  const rawSourceLanguage =
    typeof m.source_language === "string"
      ? m.source_language.replace(/\s+/g, " ").trim().toLowerCase()
      : "";
  const source_language =
    rawSourceLanguage === "en" ||
    rawSourceLanguage === "vi" ||
    rawSourceLanguage === "sv" ||
    rawSourceLanguage === "other"
      ? rawSourceLanguage
      : "other";
  const keepSourceBody = source_language === "en" || source_language === "vi";
  const source_language_title =
    keepSourceBody && typeof m.source_language_title === "string"
      ? m.source_language_title.replace(/\s+/g, " ").trim().slice(0, 200)
      : "";
  const source_language_summary =
    keepSourceBody && typeof m.source_language_summary === "string"
      ? m.source_language_summary.replace(/\s+/g, " ").trim().slice(0, 800)
      : "";
  const sourceIngredientsRaw = Array.isArray(m.source_language_ingredients)
    ? m.source_language_ingredients
    : [];
  const source_language_ingredients: RecipeIngredient[] = [];
  if (keepSourceBody) {
    for (const row of sourceIngredientsRaw) {
      const s = sanitizeRecipeIngredientRow(row);
      if (s) {
        source_language_ingredients.push(s);
      }
      if (source_language_ingredients.length >= RECIPE_INGREDIENT_ROW_CAP) {
        break;
      }
    }
  }
  const sourceStepsRaw = Array.isArray(m.source_language_steps) ? m.source_language_steps : [];
  const source_language_steps = keepSourceBody
    ? sourceStepsRaw
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .map((s) => (s.length > 800 ? `${s.slice(0, 800)}…` : s))
        .slice(0, RECIPE_STEP_CAP)
    : [];

  return {
    summary,
    ingredients,
    steps,
    estimated_cook_time,
    difficulty,
    source_language,
    source_language_title,
    source_language_summary,
    source_language_ingredients,
    source_language_steps,
  };
}

const MAX_MARKDOWN_IMPORT_CHARS = 120_000;

/**
 * Extract structured Swedish recipe fields from arbitrary markdown (blog export, cookbook site clip, …).
 * Use the saved recipe title as context so the model stays aligned with the dish being filled.
 */
export async function parseRecipeMarkdownForImport(
  apiKey: string,
  input: { markdown: string; contextTitle: string; contextSummary?: string },
): Promise<ParsedRecipeFromMarkdownImport> {
  const md = input.markdown.replace(/\r\n/g, "\n").trim().slice(0, MAX_MARKDOWN_IMPORT_CHARS);
  if (!md) {
    throw new Error("Markdown text is empty");
  }
  const titleHint = input.contextTitle.replace(/\s+/g, " ").trim().slice(0, 200);
  const sumHint = (input.contextSummary ?? "").replace(/\s+/g, " ").trim().slice(0, 500);

  const systemPreamble = `Du hjälper att fylla i ett **sparad recept** i Sverige utifrån inklistrad **markdown** från valfri källa.

## Kontext (byt inte rätt)
Användaren fyller receptet med titeln: **"${titleHint}"**
${sumHint ? `Nuvarande kort beskrivning (får uppdateras om källan är tydligare):\n${sumHint}\n` : ""}

## Uppgift
- Tolka markdown och extrahera de primära receptfälten på **svenska**, även om källan är på engelska eller vietnamesiska.
- **summary**, **ingredients**, **steps** och **estimated_cook_time** är alltid svenska fält. Kopiera aldrig engelska/vietnamesiska meningar till dessa fält.
- Extrahera **ingredienser** och **tillagningssteg** på **svenska** (köksnära, realistiska mängder: g, kg, dl, ml, st, krm).
- Identifiera källans huvudspråk som **source_language**: "sv", "en", "vi" eller "other".
- Om källspråket är **engelska** eller **vietnamesiska**, fyll även i **source_language_title**, **source_language_summary**, **source_language_ingredients** och **source_language_steps** på originalspråket. Bevara naturligt receptspråk från källan, men strukturera rader/steg som i svenska fälten.
- Om källspråket är svenska eller annat språk än engelska/vietnamesiska: sätt originalspråksfälten till tom sträng/tom array.
- Ignorera annonser, navigering, kommentarsfält och irrelevant text.
- **summary**: 1–2 meningar om vad rätten är.
- **steps**: varje steg som en kort, numrerbar mening (ingen sifferpräfix i själva strängen).
- **estimated_cook_time**: om tid nämns, kort svensk fras (t.ex. "ca 35 min"); annars tom sträng.
- **difficulty**: easy | medium | hard utifrån antal moment, tajming och teknik.
- Bevara kulturspecifika vietnamesiska råvaror. Om en term i ordlistan förekommer i källan, använd exakt svensk term i svenska fält och exakt originalterm i vietnamesiska originalspråksfält.

## Vietnamesisk råvaruordlista
${VIETNAMESE_RECIPE_TRANSLATION_GLOSSARY_TEXT}

Om vissa uppgifter saknas i texten: gör så mycket du kan; låt inte fälten bli tomma om det finns innehåll att hämta.
`;

  const userBlock = `## Inklistrad markdown\n\n${md}`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: RECIPE_GENERATOR_MODEL_ID,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RECIPE_MARKDOWN_IMPORT_RESULT_SCHEMA,
    },
  });

  const fullPrompt = `${systemPreamble}\n\n${userBlock}`;
  const result = await model.generateContent(fullPrompt);
  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("Gemini returned empty recipe import response");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Gemini returned invalid import JSON: ${msg}. Snippet: ${text.slice(0, 200)}`);
  }
  const out = sanitizeParsedRecipeMarkdownImport(parsed);
  if (!out) {
    throw new Error("Recipe import response failed validation (need summary, ingredients, and steps).");
  }
  return ensureImportedRecipePrimaryBodyIsSwedish(apiKey, out);
}

/** Full structured recipe for “new dish” import from markdown (no existing row). */
export type ParsedNewDishFromMarkdown = {
  title: string;
  title_en: string;
  title_vi: string;
  summary: string;
  meal_kind: PromoMealPlanMealKind;
  /** One of the preset food style ids supplied to the parser. */
  food_type_id: string;
  vegetarian: boolean;
  /** Short shopping-style labels (ICA-like); at least one required for saved_recipes. */
  ingredient_picks: string[];
  ingredients: RecipeIngredient[];
  steps: string[];
  estimated_cook_time: string;
  difficulty: RecipeDifficulty;
  /** Detected original/source language of the pasted markdown. */
  source_language: "sv" | "en" | "vi" | "other";
  /** Original-language summary when source language is EN/VI; empty otherwise. */
  source_language_summary: string;
  /** Original-language ingredient rows when source language is EN/VI; empty otherwise. */
  source_language_ingredients: RecipeIngredient[];
  /** Original-language steps when source language is EN/VI; empty otherwise. */
  source_language_steps: string[];
};

const NEW_DISH_MARKDOWN_IMPORT_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: {
      type: SchemaType.STRING,
      description:
        "Dish name in Swedish (primary title for the recipe row). Never copy the English/Vietnamese source title here.",
    } as Schema,
    title_en: {
      type: SchemaType.STRING,
      description: "Natural English name for the dish, or empty string if unsure.",
    } as Schema,
    title_vi: {
      type: SchemaType.STRING,
      description: "Natural Vietnamese name for the dish, or empty string if unsure.",
    } as Schema,
    summary: {
      type: SchemaType.STRING,
      description:
        "1–3 sentences in Swedish: what the dish is (not full step copy). Never copy English/Vietnamese source text here.",
    } as Schema,
    meal_kind: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["lunch", "dinner", "either", "snack", "other"],
      description: "When this meal fits best",
    } as Schema,
    food_type_id: {
      type: SchemaType.STRING,
      description:
        "Exactly one `id` from the allowed food-style list given in the system prompt (English slug).",
    } as Schema,
    vegetarian: {
      type: SchemaType.BOOLEAN,
      description: "True if the recipe is vegetarian (no meat/fish; dairy/egg allowed).",
    } as Schema,
    ingredient_picks: {
      type: SchemaType.ARRAY,
      description:
        "3–12 short ICA-style ingredient names in Swedish (key shopping items), no amounts.",
      items: { type: SchemaType.STRING } as Schema,
    } as Schema,
    ingredients: {
      type: SchemaType.ARRAY,
      description:
        "Structured ingredient rows in Swedish for shopping/cooking. Never copy English/Vietnamese source rows here.",
      items: RECIPE_INGREDIENT_ITEM_SCHEMA,
    } as Schema,
    steps: {
      type: SchemaType.ARRAY,
      description:
        "Ordered cooking steps in Swedish, one clear sentence per step (no numbering in the string). Never copy English/Vietnamese source steps here.",
      items: { type: SchemaType.STRING } as Schema,
    } as Schema,
    estimated_cook_time: {
      type: SchemaType.STRING,
      description:
        "Approximate total time in Swedish, e.g. ca 40 min; empty string if unknown",
    } as Schema,
    difficulty: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["easy", "medium", "hard"],
      description:
        "Cooking difficulty: easy = straightforward, medium = some timing/technique, hard = many steps or advanced technique",
    } as Schema,
    source_language: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["sv", "en", "vi", "other"],
      description: "Detected main language of the pasted source markdown.",
    } as Schema,
    source_language_summary: {
      type: SchemaType.STRING,
      description:
        "Original-language 1–2 sentence summary if source_language is en or vi; empty string for sv/other.",
    } as Schema,
    source_language_ingredients: {
      type: SchemaType.ARRAY,
      description:
        "Original-language ingredient rows if source_language is en or vi; empty array for sv/other.",
      items: RECIPE_INGREDIENT_ITEM_SCHEMA,
    } as Schema,
    source_language_steps: {
      type: SchemaType.ARRAY,
      description:
        "Original-language cooking steps if source_language is en or vi; empty array for sv/other.",
      items: { type: SchemaType.STRING } as Schema,
    } as Schema,
  },
  required: [
    "title",
    "title_en",
    "title_vi",
    "summary",
    "meal_kind",
    "food_type_id",
    "vegetarian",
    "ingredient_picks",
    "ingredients",
    "steps",
    "estimated_cook_time",
    "difficulty",
    "source_language",
    "source_language_summary",
    "source_language_ingredients",
    "source_language_steps",
  ],
};

function pickFallbackFoodTypeId(allowed: Set<string>): string {
  if (allowed.has("swedish-nordic")) {
    return "swedish-nordic";
  }
  const first = allowed.values().next().value;
  return first ?? "swedish-nordic";
}

function sanitizeParsedNewDishFromMarkdown(
  raw: unknown,
  allowedFoodTypeIds: Set<string>,
): ParsedNewDishFromMarkdown | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const m = raw as Record<string, unknown>;
  const title = typeof m.title === "string" ? m.title.replace(/\s+/g, " ").trim().slice(0, 200) : "";
  if (!title) {
    return null;
  }
  const title_en =
    typeof m.title_en === "string" ? m.title_en.replace(/\s+/g, " ").trim().slice(0, 200) : "";
  const title_vi =
    typeof m.title_vi === "string" ? m.title_vi.replace(/\s+/g, " ").trim().slice(0, 200) : "";
  const summary =
    typeof m.summary === "string" ? m.summary.replace(/\s+/g, " ").trim().slice(0, 2000) : "";
  if (!summary) {
    return null;
  }
  const meal_kind = sanitizeMealKind(m.meal_kind);
  let food_type_id =
    typeof m.food_type_id === "string"
      ? m.food_type_id.replace(/\s+/g, " ").trim().slice(0, 80)
      : "";
  if (!allowedFoodTypeIds.has(food_type_id)) {
    food_type_id = pickFallbackFoodTypeId(allowedFoodTypeIds);
  }
  const vegetarian = m.vegetarian === true;
  const picksRaw = Array.isArray(m.ingredient_picks) ? m.ingredient_picks : [];
  const ingredient_picks: string[] = [];
  for (const p of picksRaw) {
    if (typeof p !== "string") {
      continue;
    }
    const t = p.replace(/\s+/g, " ").trim().slice(0, 120);
    if (t) {
      ingredient_picks.push(t);
    }
    if (ingredient_picks.length >= 15) {
      break;
    }
  }
  const ingRaw = Array.isArray(m.ingredients) ? m.ingredients : [];
  const ingredients: RecipeIngredient[] = [];
  for (const row of ingRaw) {
    const s = sanitizeRecipeIngredientRow(row);
    if (s) {
      ingredients.push(s);
    }
    if (ingredients.length >= RECIPE_INGREDIENT_ROW_CAP) {
      break;
    }
  }
  if (ingredients.length === 0) {
    return null;
  }
  if (ingredient_picks.length === 0) {
    for (const row of ingredients) {
      if (row.ingredient_label.trim()) {
        ingredient_picks.push(row.ingredient_label.trim().slice(0, 120));
      }
      if (ingredient_picks.length >= 3) {
        break;
      }
    }
  }
  if (ingredient_picks.length === 0) {
    ingredient_picks.push(ingredients[0]!.ingredient_label.trim().slice(0, 120));
  }
  const stepsRaw = Array.isArray(m.steps) ? m.steps : [];
  const steps = stepsRaw
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((s) => (s.length > 800 ? `${s.slice(0, 800)}…` : s))
    .slice(0, RECIPE_STEP_CAP);
  if (steps.length === 0) {
    return null;
  }
  const estimated_cook_time =
    typeof m.estimated_cook_time === "string"
      ? m.estimated_cook_time.replace(/\s+/g, " ").trim().slice(0, 120)
      : "";
  const difficulty = sanitizeRecipeDifficulty(m.difficulty);
  const rawSourceLanguage =
    typeof m.source_language === "string"
      ? m.source_language.replace(/\s+/g, " ").trim().toLowerCase()
      : "";
  const source_language =
    rawSourceLanguage === "en" ||
    rawSourceLanguage === "vi" ||
    rawSourceLanguage === "sv" ||
    rawSourceLanguage === "other"
      ? rawSourceLanguage
      : "other";
  const keepSourceBody = source_language === "en" || source_language === "vi";
  const source_language_summary =
    keepSourceBody && typeof m.source_language_summary === "string"
      ? m.source_language_summary.replace(/\s+/g, " ").trim().slice(0, 800)
      : "";
  const sourceIngredientsRaw = Array.isArray(m.source_language_ingredients)
    ? m.source_language_ingredients
    : [];
  const source_language_ingredients: RecipeIngredient[] = [];
  if (keepSourceBody) {
    for (const row of sourceIngredientsRaw) {
      const s = sanitizeRecipeIngredientRow(row);
      if (s) {
        source_language_ingredients.push(s);
      }
      if (source_language_ingredients.length >= RECIPE_INGREDIENT_ROW_CAP) {
        break;
      }
    }
  }
  const sourceStepsRaw = Array.isArray(m.source_language_steps) ? m.source_language_steps : [];
  const source_language_steps = keepSourceBody
    ? sourceStepsRaw
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .map((s) => (s.length > 800 ? `${s.slice(0, 800)}…` : s))
        .slice(0, RECIPE_STEP_CAP)
    : [];

  return {
    title,
    title_en,
    title_vi,
    summary,
    meal_kind,
    food_type_id,
    vegetarian,
    ingredient_picks,
    ingredients,
    steps,
    estimated_cook_time,
    difficulty,
    source_language,
    source_language_summary,
    source_language_ingredients,
    source_language_steps,
  };
}

export type NewDishMarkdownParseInput = {
  markdown: string;
  /** Preset food styles (id + Swedish label), e.g. from recipe-food-types.json */
  foodTypeOptions: { id: string; label: string }[];
};

/**
 * Parse arbitrary markdown into a full new-recipe shape: titles, meal kind, food style id,
 * vegetarian flag, shopping picks, ingredients, steps, and time.
 */
export async function parseNewDishFromMarkdown(
  apiKey: string,
  input: NewDishMarkdownParseInput,
): Promise<ParsedNewDishFromMarkdown> {
  const md = input.markdown.replace(/\r\n/g, "\n").trim().slice(0, MAX_MARKDOWN_IMPORT_CHARS);
  if (!md) {
    throw new Error("Markdown text is empty");
  }
  const opts = input.foodTypeOptions.filter((o) => o.id?.trim() && o.label?.trim());
  if (opts.length === 0) {
    throw new Error("foodTypeOptions is empty");
  }
  const allowed = new Set(opts.map((o) => o.id.trim()));
  const styleBlock = opts.map((o) => `- \`${o.id}\` — ${o.label}`).join("\n");

  const systemPreamble = `Du är en köksassistent för ett **svenskt hem**. Användaren klistrar in **markdown eller manuella anteckningar** (blogg, tidning, receptsajt, YouTube/TikTok-noteringar, ingredienslista eller familjens egna matlagningsanteckningar) om ett nytt recept som ska sparas som egen rätt.

## Matstilar (välj exakt ett \`food_type_id\` från listan)
${styleBlock}

## Uppgift
- Identifiera rättens namn: **title** på svenska; **title_en** och **title_vi** om det går, annars tom sträng.
- Alla primära receptfält (**title**, **summary**, **ingredient_picks**, **ingredients**, **steps**, **estimated_cook_time**) ska vara på **svenska**, även när källan är på engelska eller vietnamesiska.
- Kopiera aldrig engelska/vietnamesiska källmeningar till de primära svenska fälten; använd originalspråksfälten för originaltexten.
- Identifiera källans huvudspråk som **source_language**: "sv", "en", "vi" eller "other".
- Om källspråket är engelska: sätt **title_en** till original-/naturligt engelskt namn och fyll **source_language_summary**, **source_language_ingredients**, **source_language_steps** på engelska.
- Om källspråket är vietnamesiska: sätt **title_vi** till original-/naturligt vietnamesiskt namn och fyll **source_language_summary**, **source_language_ingredients**, **source_language_steps** på vietnamesiska.
- Om källspråket är svenska eller annat språk än engelska/vietnamesiska: sätt originalspråksfälten till tom sträng/tom array.
- Om underlaget är manuella anteckningar utan komplett recept: fullfölj receptet praktiskt utifrån anteckningarna, men hitta inte på dyra eller ovanliga råvaror om enklare svenska butiksvaror räcker.
- **summary**: kort på svenska vad rätten är.
- **meal_kind**: lunch | dinner | either | snack | other — vad som passar bäst.
- **food_type_id**: exakt ett id från listan ovan som bäst matchar rättens stil (köket/stämningen).
- **vegetarian**: sant om receptet är vegetariskt (ingen kött/fisk; mejeri/ägg ok).
- **ingredient_picks**: 3–12 korta ICA-liknande benämningar (inga mängder), typiska råvaror man handlar.
- **ingredients**: strukturerade rader: text, ingredient_label, amount på svenska.
- **steps**: tillagningssteg i ordning, ett tydligt steg per sträng (ingen siffra i början av strängen).
- **estimated_cook_time**: t.ex. "ca 35 min" om det går att avgöra; annars tom sträng.
- **difficulty**: easy | medium | hard utifrån antal moment, tajming och teknik.
- Bevara kulturspecifika vietnamesiska råvaror. Om en term i ordlistan förekommer i källan, använd exakt svensk term i svenska fält och exakt originalterm i vietnamesiska originalspråksfält.

## Vietnamesisk råvaruordlista
${VIETNAMESE_RECIPE_TRANSLATION_GLOSSARY_TEXT}

Ignorera annonser, navigering och irrelevant text. Om något saknas, gör ett rimligt bästa val utifrån texten och markera praktiska antaganden i summary eller steps på ett naturligt sätt.`;

  const userBlock = `## Inklistrad markdown\n\n${md}`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: RECIPE_GENERATOR_MODEL_ID,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: NEW_DISH_MARKDOWN_IMPORT_SCHEMA,
    },
  });

  const fullPrompt = `${systemPreamble}\n\n${userBlock}`;
  const result = await model.generateContent(fullPrompt);
  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("Gemini returned empty new-dish import response");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Gemini returned invalid new-dish JSON: ${msg}. Snippet: ${text.slice(0, 200)}`);
  }
  const out = sanitizeParsedNewDishFromMarkdown(parsed, allowed);
  if (!out) {
    throw new Error("New-dish import response failed validation.");
  }
  return ensureNewDishPrimaryBodyIsSwedish(apiKey, out);
}
