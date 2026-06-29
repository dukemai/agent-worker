import type { TripItineraryBlock, TripKnowledgeSourceResearchLead } from "@/types/database";

export type KnowledgePlaceRow = {
  name: string;
  area: string | null;
  approx_location: string | null;
  why: string | null;
  time_needed: string | null;
};

export type KnowledgeActivityRow = {
  name: string;
  happens_at: string | null;
  area: string | null;
  approx_location: string | null;
  why: string | null;
  time_needed: string | null;
};

export type KnowledgeStoryRow = {
  title: string;
  story_type: string | null;
  area: string | null;
  related_place: string | null;
  summary: string | null;
  story: string | null;
  why_it_matters: string | null;
  what_to_notice: string[];
  good_for: string[];
};

export type KnowledgeResearchLeadRow = {
  title: string;
  lead_type: string;
  area: string | null;
  related_place: string | null;
  source_reason: string | null;
  why_interesting: string | null;
  research_questions: string[];
  suggested_search_terms: string[];
  potential_content_types: string[];
  priority: "low" | "medium" | "high";
};

export type SelectedPreferenceGroup = {
  category: string;
  preferences: string[];
};

export type KnowledgeSourceLink = {
  title: string;
  url: string;
};

export type KnowledgeOverviewItem = {
  itemType: "place" | "activity";
  name: string;
  area: string;
  meta: string | null;
  detail: string | null;
  sourceTitles: string[];
  sourceLinks: KnowledgeSourceLink[];
  favoriteId: string | null;
};

export type KnowledgeOverview = {
  places: KnowledgeOverviewItem[];
  activities: KnowledgeOverviewItem[];
};

export type KnowledgeStoryItem = KnowledgeStoryRow & {
  area: string;
  sourceTitles: string[];
  sourceLinks: KnowledgeSourceLink[];
  sourceResearchLeads: TripKnowledgeSourceResearchLead[];
};

export type KnowledgeResearchLeadItem = KnowledgeResearchLeadRow & {
  area: string;
  sourceTitles: string[];
  sourceItemIds: string[];
  deletableSourceIds: string[];
  sourceLinks: KnowledgeSourceLink[];
  queuedSourceCount: number;
  storyMaterialCount: number;
};

export type ItineraryStoryMatch = {
  story: KnowledgeStoryItem;
  matchType: "related" | "area";
};

export type ItineraryPresetKind = "arrival" | "departure" | "check_in" | "check_out";

export type ItineraryPresetDraft = {
  kind: ItineraryPresetKind;
  title: string;
  day_number: number;
  block: TripItineraryBlock;
  time: string;
  location: string;
  notes: string;
};

export type AccommodationLogistics = {
  name: string | null;
  address: string | null;
  area: string | null;
  check_in_date: string | null;
  check_in_time: string | null;
  check_out_date: string | null;
  check_out_time: string | null;
  booking_reference: string | null;
  notes: string | null;
};
