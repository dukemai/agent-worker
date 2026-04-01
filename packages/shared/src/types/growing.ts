/**
 * Shared types for growing ingest / sources (worker + dashboard).
 */

export type GrowingSourceStatus = "queued" | "processing" | "done" | "failed";

export interface GrowingSourceRow {
  id: string;
  url: string;
  title: string | null;
  channel: string | null;
  description: string | null;
  source_type: string | null;
  status: GrowingSourceStatus;
  transcript: string | null;
  source_language: string | null;
}

export interface GrowingProfile {
  id: string;
  city: string;
  country_code: string;
  space_type: string;
  experience_level: string;
  interests: string[];
}

export interface GrowingWindow {
  id: string;
  item_name: string;
  suggestion_kind: "action" | "inspiration";
  suggested_bucket: "today" | "this_week" | "later";
  priority: number;
  start_month: number;
  end_month: number;
  stockholm_note: string;
  tags: string[];
}

export interface GrowingSuggestion {
  id: string;
  title: string;
  details: string;
  suggestion_kind: "action" | "inspiration";
  suggested_bucket: "today" | "this_week" | "later";
  status: "pending" | "dismissed" | "converted" | "done";
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

export interface GrowingActionKnowledgeLink {
  action_id: string;
  window_id: string;
  knowledge: GrowingSupportingKnowledge[];
}
