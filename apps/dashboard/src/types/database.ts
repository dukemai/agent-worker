export type TaskStatus = "pending" | "done";
export type TaskSource = "email" | "manual";
export type Bucket = "today" | "this_week" | "later";
export type LearningStatus = "active" | "paused";
export type LearningProfileType = "topic" | "category";
export type GrowingSuggestionKind = "action" | "inspiration";
export type GrowingSuggestionStatus = "pending" | "dismissed" | "converted" | "done";
export type GrowingSourceStatus = "queued" | "processing" | "done" | "failed";
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
  title: string;
  original_body: string | null;
  due_date: string | null;
  status: TaskStatus;
  metadata: Record<string, unknown> | null;
  source: TaskSource;
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
  week_start_date: string;
  converted_task_id: string | null;
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
  created_at: string;
}
