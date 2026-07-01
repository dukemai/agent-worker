export type TaskStatus = "pending" | "done";
export type TaskSource = "email" | "manual" | "growing";
export type Bucket = "today" | "this_week" | "later";
export type LearningStatus = "active" | "paused";
export type LearningProfileType = "topic" | "category";
export type GrowingSuggestionKind = "action" | "inspiration";
export type GrowingSuggestionStatus = "pending" | "dismissed" | "converted" | "done";
export type GrowingSourceStatus = "queued" | "processing" | "done" | "failed";
export type ActivitySourceStatus = "queued" | "processing" | "processed" | "failed";
export type ActivitySourceCategory =
  | "official_city"
  | "municipality"
  | "museum"
  | "library"
  | "event_platform"
  | "venue"
  | "blog"
  | "community"
  | "unknown";
export type ActivitySourceTrust = "official" | "partner" | "community" | "unknown";
export type ActivitySourceLanguage = "sv" | "en" | "mixed" | "unknown";
export type ActivityType =
  | "museum"
  | "library"
  | "playground"
  | "sport"
  | "nature"
  | "swimming"
  | "workshop"
  | "event"
  | "food"
  | "other";
export type ActivityCostLevel = "free" | "low" | "medium" | "high" | "unknown";
export type ActivityWeatherFit = "indoor" | "outdoor" | "mixed";
export type ActivityEnergyLevel = "low" | "medium" | "high";
export type ActivityStatus = "active" | "dismissed" | "archived";
export type SeasonalActivityStatus = "active" | "dismissed" | "expired" | "archived";
export type ActivityConfidence = "low" | "medium" | "high";
export type TripStatus = "ideas" | "planning" | "upcoming" | "archived";
export type TripOptionStatus = "maybe" | "shortlisted" | "planned" | "rejected";
export type TripOptionType = "activity" | "food" | "rainy_day" | "scenic_stop" | "logistics" | "other";
export type TripEffort = "low" | "medium" | "high";
export type TripWeatherFit = "sun" | "rain" | "any";
export type TripKidFit = "low" | "medium" | "high";
export type TripDecisionStatus = "open" | "waiting" | "decided";
export type TripItineraryBlock = "morning" | "lunch" | "afternoon" | "backup" | "drop_first";
export type TripPreferenceCategory =
  | "pace"
  | "kids"
  | "weather"
  | "food"
  | "nature"
  | "culture"
  | "logistics"
  | "budget"
  | "planning";
export type GrowingKnowledgeCategory =
  | "technique"
  | "plant-profile"
  | "soil"
  | "pest-control"
  | "companion-planting"
  | "preservation"
  | "general";

export interface Task {
  id: string;
  created_at: string;
  /** Refreshed on every update; may be absent before migration `016_tasks_updated_at`. */
  updated_at?: string;
  title: string;
  original_body: string | null;
  due_date: string | null;
  status: TaskStatus;
  metadata: Record<string, unknown> | null;
  source: TaskSource;
  window_id: string | null;
}

export interface TaskWithBucket extends Task {
  bucket: Bucket;
}

export interface LearningProfile {
  id: string;
  topic: string;
  profile_type: LearningProfileType;
  current_level: string | null;
  daily_goal: string | null;
  target_duration_minutes: number;
  status: LearningStatus;
  curriculum_outline: unknown | null;
  created_at: string;
  updated_at: string;
}

export interface LearningLogEntry {
  id: string;
  profile_id: string;
  content: string;
  feedback: string | null;
  created_at: string;
  profile?: {
    topic: string;
    profile_type: LearningProfileType;
  } | null;
}

export interface FamilyContext {
  key: string;
  value: string;
  last_updated: string;
}

export interface GrowingProfile {
  id: string;
  city: string;
  country_code: string;
  space_type: "balcony" | "indoor" | "yard" | "mixed";
  experience_level: "beginner" | "intermediate" | "advanced";
  interests: string[];
}

export interface GrowingSuggestion {
  id: string;
  title: string;
  details: string;
  suggestion_kind: GrowingSuggestionKind;
  suggested_bucket: Bucket;
  status: GrowingSuggestionStatus;
  week_number: number;
  converted_task_id: string | null;
  window_id: string;
}

export interface GrowingSupportingKnowledge {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
}

export interface GrowingWindowKnowledgeLink {
  window_id: string;
  knowledge: GrowingSupportingKnowledge[];
}

export interface GrowingSource {
  id: string;
  url: string;
  title: string | null;
  channel: string | null;
  description: string | null;
  source_type: string | null;
  status: GrowingSourceStatus;
  error_message: string | null;
  tips_extracted: number;
  created_at: string;
  processed_at: string | null;
  transcript: string | null;
}

export interface GrowingWindow {
  id: string;
  source_id: string | null;
  item_key: string;
  item_name: string;
  suggestion_kind: string;
  action_type: string | null;
  start_month: number;
  end_month: number;
  priority: number;
  suggested_bucket: Bucket;
  stockholm_note: string;
  tags: string[];
  verified: boolean;
  created_at: string;
}

export interface GrowingWindowSource {
  id: string;
  url: string | null;
  title: string | null;
  channel: string | null;
}

export interface GrowingKnowledge {
  id: string;
  source_id: string;
  title: string;
  content: string;
  category: GrowingKnowledgeCategory;
  tags: string[];
  season_relevance: string[];
  stockholm_relevant: boolean;
  location_note: string | null;
  verified: boolean;
  created_at: string;
}

export interface ActivitySource {
  id: string;
  title: string;
  source_url: string | null;
  raw_markdown: string;
  status: ActivitySourceStatus;
  error_message: string | null;
  activities_extracted: number;
  source_domain: string | null;
  source_name: string | null;
  source_category: ActivitySourceCategory;
  source_scope: string;
  source_trust: ActivitySourceTrust;
  source_language: ActivitySourceLanguage;
  capture_html?: string | null;
  capture_metadata?: Record<string, unknown> | null;
  capture_template_id?: string | null;
  capture_template_version?: number | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityCaptureTemplate {
  id: string;
  source_domain: string;
  path_pattern: string;
  name: string;
  capture_mode: "single_activity" | "activity_list" | "season_overview" | "article" | "generic";
  content_selector: string | null;
  remove_selectors: string[];
  version: number;
}

export interface ActivitySourceMapping {
  id: string;
  source_domain: string;
  source_name: string | null;
  homepage_url: string | null;
  activity_listing_url: string | null;
  gathering_notes: string | null;
  collection_focus: string | null;
  collection_instructions: string | null;
  check_frequency: "weekly" | "monthly" | "seasonal";
  last_checked_at: string | null;
  season_target: string;
  is_core: boolean;
  source_category: ActivitySourceCategory;
  source_scope: string;
  source_trust: ActivitySourceTrust;
  source_language: ActivitySourceLanguage;
  created_at: string;
  updated_at: string;
}

export interface ActivitySourceReference {
  id: string;
  title: string;
  source_url: string | null;
  source_name: string | null;
  source_domain: string | null;
}

export interface LocalActivity {
  id: string;
  source_id: string | null;
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
  status: ActivityStatus;
  is_evergreen: boolean;
  favorite: boolean;
  created_at: string;
  updated_at: string;
  source?: ActivitySourceReference | null;
}

export interface SeasonalActivityInstance {
  id: string;
  source_id: string | null;
  activity_id: string | null;
  instance_key: string;
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
  status: SeasonalActivityStatus;
  favorite: boolean;
  extraction_confidence: ActivityConfidence;
  created_at: string;
  updated_at: string;
  source?: ActivitySourceReference | null;
  activity?: Pick<LocalActivity, "id" | "title" | "activity_type" | "is_evergreen"> | null;
}

export type BirthdayCategory = "family" | "close_friend" | "friend" | "kid_friend";
export type BirthdayStatus = "active" | "archived";

export interface Birthday {
  id: string;
  name: string;
  birthday_month: number;
  birthday_day: number;
  birth_year: number | null;
  category: BirthdayCategory;
  is_recurring: boolean;
  wishlist: string | null;
  notes: string | null;
  status: BirthdayStatus;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  user_id: string;
  household_id: string | null;
  title: string;
  destination: string;
  status: TripStatus;
  start_date: string | null;
  end_date: string | null;
  logistics: string | null;
  participants: string | null;
  adult_count: number;
  kid_count: number;
  kid_ages: number[];
  already_done: string | null;
  already_done_items: unknown[];
  preferences: string | null;
  selected_preferences: string[];
  logistics_details: Record<string, unknown>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripPreferenceSuggestion {
  id: string;
  user_id: string;
  category: TripPreferenceCategory;
  label: string;
  description: string | null;
  preference_text: string;
  tags: string[];
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TripKnowledgeItem {
  id: string;
  trip_id: string;
  title: string;
  source_url: string | null;
  raw_markdown: string;
  extraction: Record<string, unknown>;
  extraction_focus: "planning" | "stories" | "both";
  source_research_leads?: TripKnowledgeSourceResearchLead[];
  status: "queued" | "processed" | "failed";
  error_message: string | null;
  tags: string[];
  extracted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type TripKnowledgeSourceResearchLead = {
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

export interface TripKnowledgeFavorite {
  id: string;
  trip_id: string;
  item_type: "place" | "activity";
  name: string;
  area: string;
  created_at: string;
}

export interface TripStoryContent {
  id: string;
  trip_id: string;
  subject: string;
  area: string | null;
  content_style: string;
  selected_materials: unknown[];
  scaffold: Record<string, unknown>;
  status: "generated" | "archived";
  created_at: string;
  updated_at: string;
}

export interface TripWeatherForecast {
  id: string;
  trip_id: string;
  forecast_date: string;
  provider: string;
  location_label: string;
  latitude: number;
  longitude: number;
  summary: string | null;
  weather_code: number | null;
  temperature_min_c: number | null;
  temperature_max_c: number | null;
  precipitation_probability: number | null;
  precipitation_mm: number | null;
  wind_speed_mps: number | null;
  raw_forecast: Record<string, unknown>;
  fetched_at: string;
  created_at: string;
  updated_at: string;
}

export interface TripOption {
  id: string;
  trip_id: string;
  title: string;
  option_type: TripOptionType;
  status: TripOptionStatus;
  location: string | null;
  best_for: string | null;
  effort: TripEffort | null;
  weather_fit: TripWeatherFit | null;
  kid_fit: TripKidFit | null;
  booking_needed: boolean;
  why: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TripDecision {
  id: string;
  trip_id: string;
  title: string;
  status: TripDecisionStatus;
  owner: string | null;
  due_date: string | null;
  outcome: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripItineraryItem {
  id: string;
  trip_id: string;
  day_number: number;
  block: TripItineraryBlock;
  title: string;
  option_id: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
