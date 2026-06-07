import type { TripDecision, TripItineraryBlock, TripKnowledgeItem, TripOption, TripPreferenceSuggestion } from "@/types/database";

export const optionStatuses: TripOption["status"][] = ["maybe", "shortlisted", "planned", "rejected"];

export const decisionStatuses: TripDecision["status"][] = ["open", "waiting", "decided"];

export const itineraryBlocks: TripItineraryBlock[] = ["morning", "lunch", "afternoon", "backup", "drop_first"];

export const knowledgeExtractionFocuses: TripKnowledgeItem["extraction_focus"][] = ["both", "planning", "stories"];

export const tripStoryContentStyleOptions = [
  { value: "concise_trip_guide", label: "Concise trip guide" },
  { value: "family_kid_friendly", label: "Family / kid-friendly" },
  { value: "historical_deep_dive", label: "Historical deep dive" },
  { value: "place_profile", label: "Place profile" },
  { value: "walking_tour_narration", label: "Walking-tour narration" },
  { value: "content_hub_article", label: "Content hub article" },
] as const;

export const emptyTripPreferenceSuggestions: TripPreferenceSuggestion[] = [];
