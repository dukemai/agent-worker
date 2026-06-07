import { GoogleGenerativeAI } from "@google/generative-ai";

export type TripKnowledgeExtraction = {
  planning: TripPlanningKnowledgeExtraction;
  stories: DestinationStoryKnowledgeExtraction;
};

export type TripKnowledgeExtractionFocus = "planning" | "stories" | "both";

export type TripPlanningKnowledgeExtraction = {
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

export type DestinationStoryKnowledgeExtraction = {
  summary: string;
  stories: TripKnowledgeStory[];
  research_leads: TripKnowledgeResearchLead[];
  concepts: TripKnowledgeConcept[];
  people: string[];
  places_mentioned: string[];
  timeline: TripKnowledgeTimelineEvent[];
  kid_explanations: string[];
  tags: string[];
};

export type TripKnowledgeStory = {
  title: string;
  story_type: "place_story" | "history" | "culture" | "nature" | "local_life" | "kid_story" | null;
  area: string | null;
  related_place: string | null;
  summary: string | null;
  story: string | null;
  why_it_matters: string | null;
  what_to_notice: string[];
  good_for: string[];
};

export type TripKnowledgeResearchLead = {
  title: string;
  lead_type: "place" | "person" | "event" | "concept" | "building" | "nature" | "food" | "tradition" | "other";
  area: string | null;
  related_place: string | null;
  source_reason: string | null;
  why_interesting: string | null;
  research_questions: string[];
  suggested_search_terms: string[];
  potential_content_types: string[];
  priority: "low" | "medium" | "high";
};

export type TripResearchLeadAiDraft = {
  title: string;
  raw_markdown: string;
  confidence: "low" | "medium" | "high";
  verification_notes: string[];
};

export type TripKnowledgeConcept = {
  label: string;
  concept_type: "history" | "culture" | "nature" | "local_life" | "practical" | null;
  summary: string | null;
  related_places: string[];
};

export type TripKnowledgeTimelineEvent = {
  label: string;
  date_or_period: string | null;
  summary: string | null;
  related_place: string | null;
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
    focus: TripKnowledgeExtractionFocus;
  }
): Promise<TripKnowledgeExtraction> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = [
    "Return JSON only.",
    "Extract family trip knowledge from the markdown inspiration into separated products.",
    "Shape: {\"planning\":{\"summary\":\"...\",\"places\":[{\"name\":\"...\",\"area\":null,\"approx_location\":null,\"why\":null,\"best_for\":[],\"weather_fit\":null,\"time_needed\":null}],\"activities\":[{\"name\":\"...\",\"happens_at\":null,\"area\":null,\"approx_location\":null,\"effort\":null,\"kid_fit\":null,\"weather_fit\":null,\"time_needed\":null,\"pair_with\":[],\"why\":null}],\"food_spots\":[],\"rainy_day_ideas\":[],\"kid_relevance\":null,\"season_or_weather_notes\":null,\"booking_or_logistics_notes\":null,\"avoid_if\":null,\"candidate_option_titles\":[],\"tags\":[]},\"stories\":{\"summary\":\"...\",\"stories\":[{\"title\":\"...\",\"story_type\":null,\"area\":null,\"related_place\":null,\"summary\":null,\"story\":null,\"why_it_matters\":null,\"what_to_notice\":[],\"good_for\":[]}],\"research_leads\":[{\"title\":\"...\",\"lead_type\":\"place\",\"area\":null,\"related_place\":null,\"source_reason\":null,\"why_interesting\":null,\"research_questions\":[],\"suggested_search_terms\":[],\"potential_content_types\":[],\"priority\":\"medium\"}],\"concepts\":[{\"label\":\"...\",\"concept_type\":null,\"summary\":null,\"related_places\":[]}],\"people\":[],\"places_mentioned\":[],\"timeline\":[{\"label\":\"...\",\"date_or_period\":null,\"summary\":null,\"related_place\":null}],\"kid_explanations\":[],\"tags\":[]}}",
    `Extraction focus: ${input.focus}.`,
    "Planning knowledge is for deciding and scheduling trip options. Stories knowledge is reusable destination expertise for history, culture, nature, local life, and kid-friendly explanations.",
    "If focus is planning, fill planning deeply and keep stories mostly empty unless the source has obvious visit context. If focus is stories, fill stories deeply and keep planning mostly empty unless the source clearly names practical places/activities. If focus is both, fill both.",
    "For planning places and activities, include approximate area and location when the source implies it. Useful areas include Visby, North Gotland, Fårö, East coast, South Gotland, West coast, Central Gotland, near ferry, near accommodation, or unknown.",
    "For stories, connect each story to a related_place and area when possible. Stories must enrich a visit, not become standalone itinerary options.",
    "For research_leads, capture named places, buildings, people, events, traditions, natural features, or concepts that seem promising but need further research before they become rich content. Include concrete search terms and questions.",
    "For each research_lead.suggested_search_terms, include both English terms and terms in the source/destination language when useful. Preserve the original/local name exactly, and add native-language context words such as history, museum, architecture, legend, nature, or opening hours translated into that language. For Gotland or Swedish subjects, include Swedish search phrases such as '<subject> Gotland', '<subject> Visby', '<subject> historia', '<subject> kulturhistoria', or '<subject> sevärdhet' when relevant.",
    "Copyright and source-use rule: do not copy, quote, or closely paraphrase source text. Extract factual claims, named entities, planning facts, and research leads only, then rewrite all summaries and notes in original wording.",
    "If the source includes a no-reproduction, all-rights-reserved, or written-permission notice, treat it as research-lead-first: capture neutral facts, source links, questions, and search terms, but do not produce polished story prose from that single source.",
    "Do not imitate distinctive narrative structure, promotional language, or literary phrasing from the source. Keep story output concise and neutral unless the facts are broadly supported by the source material.",
    "Do not invent facts not supported by the source.",
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
    "Create starter trip knowledge for Dad-Ops as two separated products: planning candidates and destination stories.",
    "Shape: {\"planning\":{\"summary\":\"...\",\"places\":[{\"name\":\"...\",\"area\":null,\"approx_location\":null,\"why\":null,\"best_for\":[],\"weather_fit\":null,\"time_needed\":null}],\"activities\":[{\"name\":\"...\",\"happens_at\":null,\"area\":null,\"approx_location\":null,\"effort\":null,\"kid_fit\":null,\"weather_fit\":null,\"time_needed\":null,\"pair_with\":[],\"why\":null}],\"food_spots\":[],\"rainy_day_ideas\":[],\"kid_relevance\":null,\"season_or_weather_notes\":null,\"booking_or_logistics_notes\":null,\"avoid_if\":null,\"candidate_option_titles\":[],\"tags\":[]},\"stories\":{\"summary\":\"...\",\"stories\":[{\"title\":\"...\",\"story_type\":null,\"area\":null,\"related_place\":null,\"summary\":null,\"story\":null,\"why_it_matters\":null,\"what_to_notice\":[],\"good_for\":[]}],\"research_leads\":[{\"title\":\"...\",\"lead_type\":\"place\",\"area\":null,\"related_place\":null,\"source_reason\":null,\"why_interesting\":null,\"research_questions\":[],\"suggested_search_terms\":[],\"potential_content_types\":[],\"priority\":\"medium\"}],\"concepts\":[{\"label\":\"...\",\"concept_type\":null,\"summary\":null,\"related_places\":[]}],\"people\":[],\"places_mentioned\":[],\"timeline\":[{\"label\":\"...\",\"date_or_period\":null,\"summary\":null,\"related_place\":null}],\"kid_explanations\":[],\"tags\":[]}}",
    "Suggest approximately 8-14 places and 8-14 activities. Include approximate area and location for planning route clusters.",
    "Also include 6-12 destination stories about history, culture, nature, local life, or kid-friendly context. Stories should enrich visits, not become standalone itinerary options.",
    "Include 8-16 research_leads for places, buildings, people, traditions, natural features, or concepts worth investigating further for a future destination content hub.",
    "For each research_lead.suggested_search_terms, include both English terms and source/destination-language terms. Preserve original/local names exactly. For Swedish/Gotland topics, include useful Swedish variants such as '<subject> Gotland', '<subject> Visby', '<subject> historia', '<subject> kulturhistoria', '<subject> sevärdhet', or '<subject> öppettider' when relevant.",
    "Copyright and source-use rule: use original wording only. Do not copy, quote, or closely paraphrase any source-like wording in generated starter summaries, stories, or notes.",
    "Starter destination stories should be concise neutral context, not publishable article prose. Prefer research leads when a topic needs sourced follow-up before becoming richer content.",
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

export async function generateTripResearchLeadAiDraft(
  apiKey: string,
  input: {
    tripTitle: string;
    destination: string;
    lead: TripKnowledgeResearchLead;
  }
): Promise<TripResearchLeadAiDraft> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = [
    "Return JSON only.",
    "Use general model knowledge to create a reviewable research draft for a family trip destination knowledge base.",
    "This is not web browsing and not a cited source. Prefer cautious, broadly known, factual background. If facts are uncertain, say so in verification_notes and keep confidence low or medium.",
    "Shape: {\"title\":\"...\",\"raw_markdown\":\"...\",\"confidence\":\"medium\",\"verification_notes\":[]}",
    "The raw_markdown must be concise Markdown that can be saved as a source draft and later extracted into story materials.",
    "Do not write publishable article prose. Use neutral original wording, short sections, and factual bullets.",
    "Do not copy, quote, or closely paraphrase source text. Do not invent specific dates, names, legends, opening hours, prices, or claims if uncertain.",
    "Include useful search terms, including local-language terms when useful. For Gotland or Swedish topics, include Swedish search phrases such as '<subject> Gotland', '<subject> historia', '<subject> kulturhistoria', '<subject> sevärdhet'.",
    "Use this Markdown structure:",
    "# <subject>",
    "",
    "AI background note: Generated from AI general knowledge, not from a checked source. Verify important facts before publishing.",
    "",
    "## What may be useful",
    "- ...",
    "",
    "## What to verify",
    "- ...",
    "",
    "## Visit/story angles",
    "- ...",
    "",
    "## Search terms",
    "- ...",
    "",
    `Trip: ${input.tripTitle}`,
    `Destination: ${input.destination || "unknown"}`,
    "",
    "Research lead JSON:",
    JSON.stringify(input.lead, null, 2),
  ].join("\n");

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text?.trim()) throw new Error("Gemini returned empty research draft");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Gemini returned invalid JSON: ${message}. First 200 chars: ${text.slice(0, 200)}`);
  }

  return sanitizeResearchLeadAiDraft(parsed, input.lead.title);
}

function sanitizeExtraction(parsed: unknown): TripKnowledgeExtraction {
  const value = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  const planningSource = value.planning && typeof value.planning === "object" && !Array.isArray(value.planning)
    ? value.planning as Record<string, unknown>
    : value;
  const storiesSource = value.stories && typeof value.stories === "object" && !Array.isArray(value.stories)
    ? value.stories as Record<string, unknown>
    : value;

  return {
    planning: sanitizePlanningExtraction(planningSource),
    stories: sanitizeStoryExtraction(storiesSource),
  };
}

export function getTripKnowledgeExtractionTags(extraction: TripKnowledgeExtraction): string[] {
  return Array.from(new Set([...extraction.planning.tags, ...extraction.stories.tags]));
}

function sanitizeResearchLeadAiDraft(parsed: unknown, fallbackTitle: string): TripResearchLeadAiDraft {
  const value = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  const title = cleanString(value.title, 180) ?? `AI research: ${fallbackTitle}`;
  const rawMarkdown = cleanString(value.raw_markdown, 12000);
  const confidence = value.confidence === "low" || value.confidence === "medium" || value.confidence === "high"
    ? value.confidence
    : "medium";
  return {
    title,
    raw_markdown: rawMarkdown ?? [
      `# ${fallbackTitle}`,
      "",
      "AI background note: Generated from AI general knowledge, not from a checked source. Verify important facts before publishing.",
    ].join("\n"),
    confidence,
    verification_notes: cleanStringArray(value.verification_notes, 12, 220),
  };
}

function sanitizePlanningExtraction(value: Record<string, unknown>): TripPlanningKnowledgeExtraction {
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

function sanitizeStoryExtraction(value: Record<string, unknown>): DestinationStoryKnowledgeExtraction {
  return {
    summary: cleanString(value.summary, 800) ?? "",
    stories: cleanStories(value.stories),
    research_leads: cleanResearchLeads(value.research_leads),
    concepts: cleanConcepts(value.concepts),
    people: cleanStringArray(value.people, 30, 120),
    places_mentioned: cleanStringArray(value.places_mentioned, 40, 160),
    timeline: cleanTimeline(value.timeline),
    kid_explanations: cleanStringArray(value.kid_explanations, 20, 300),
    tags: cleanStringArray(value.tags, 20, 60),
  };
}

function cleanStories(value: unknown): TripKnowledgeStory[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): TripKnowledgeStory | null => {
      if (typeof item === "string") {
        const title = cleanString(item, 160);
        return title
          ? {
              title,
              story_type: null,
              area: null,
              related_place: null,
              summary: null,
              story: null,
              why_it_matters: null,
              what_to_notice: [],
              good_for: [],
            }
          : null;
      }
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const title = cleanString(record.title, 160);
      if (!title) return null;
      return {
        title,
        story_type: cleanEnum(record.story_type, ["place_story", "history", "culture", "nature", "local_life", "kid_story"]),
        area: cleanString(record.area, 80),
        related_place: cleanString(record.related_place, 160),
        summary: cleanString(record.summary, 400),
        story: cleanString(record.story, 1600),
        why_it_matters: cleanString(record.why_it_matters, 600),
        what_to_notice: cleanStringArray(record.what_to_notice, 10, 120),
        good_for: cleanStringArray(record.good_for, 10, 80),
      };
    })
    .filter((item): item is TripKnowledgeStory => item !== null)
    .slice(0, 30);
}

function cleanResearchLeads(value: unknown): TripKnowledgeResearchLead[] {
  if (!Array.isArray(value)) return [];
  const leadTypes = ["place", "person", "event", "concept", "building", "nature", "food", "tradition", "other"] as const;
  return value
    .map((item): TripKnowledgeResearchLead | null => {
      if (typeof item === "string") {
        const title = cleanString(item, 160);
        return title
          ? {
              title,
              lead_type: "other",
              area: null,
              related_place: null,
              source_reason: null,
              why_interesting: null,
              research_questions: [],
              suggested_search_terms: [title],
              potential_content_types: [],
              priority: "medium",
            }
          : null;
      }
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const title = cleanString(record.title, 160);
      if (!title) return null;
      return {
        title,
        lead_type: cleanEnum(record.lead_type, leadTypes) ?? "other",
        area: cleanString(record.area, 80),
        related_place: cleanString(record.related_place, 160),
        source_reason: cleanString(record.source_reason, 500),
        why_interesting: cleanString(record.why_interesting, 500),
        research_questions: cleanStringArray(record.research_questions, 8, 180),
        suggested_search_terms: cleanStringArray(record.suggested_search_terms, 14, 180),
        potential_content_types: cleanStringArray(record.potential_content_types, 8, 80),
        priority: cleanEnum(record.priority, ["low", "medium", "high"]) ?? "medium",
      };
    })
    .filter((item): item is TripKnowledgeResearchLead => item !== null)
    .slice(0, 40);
}

function cleanConcepts(value: unknown): TripKnowledgeConcept[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): TripKnowledgeConcept | null => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const label = cleanString(record.label, 140);
      if (!label) return null;
      return {
        label,
        concept_type: cleanEnum(record.concept_type, ["history", "culture", "nature", "local_life", "practical"]),
        summary: cleanString(record.summary, 500),
        related_places: cleanStringArray(record.related_places, 12, 140),
      };
    })
    .filter((item): item is TripKnowledgeConcept => item !== null)
    .slice(0, 30);
}

function cleanTimeline(value: unknown): TripKnowledgeTimelineEvent[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): TripKnowledgeTimelineEvent | null => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const label = cleanString(record.label, 160);
      if (!label) return null;
      return {
        label,
        date_or_period: cleanString(record.date_or_period, 120),
        summary: cleanString(record.summary, 500),
        related_place: cleanString(record.related_place, 160),
      };
    })
    .filter((item): item is TripKnowledgeTimelineEvent => item !== null)
    .slice(0, 40);
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
