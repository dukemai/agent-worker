/**
 * Shared types for daily digest (worker + dashboard).
 */

export interface Task {
  id: string;
  title: string;
  original_body: string | null;
  due_date: string | null;
  status: string;
  source: string;
  metadata: Record<string, unknown> | null;
  /** Set for growing-season tasks linked to `growing_windows`. */
  window_id: string | null;
}

export interface BucketRow {
  task_id: string;
}

export interface PromotionDigestItem {
  store: string;
  summary: string;
  link: string | null;
}

export interface RenewalDigestItem {
  title: string;
  dueDate: string;
  daysLeft: number;
  link: string | null;
}

export interface GrowingTaskDigestItem {
  title: string;
  dueDate: string | null;
  body: string | null;
}

export interface GrowingSuggestionDigestItem {
  id?: string;
  window_id?: string;
  title: string;
  details: string;
  status?: string;
  suggestion_kind?: "action" | "inspiration";
  suggested_bucket?: "today" | "this_week" | "later";
  week_number?: number;
}

export interface RecentGrowingKnowledgeItem {
  title: string;
  content: string;
  category: string;
  sourceUrl: string | null;
}

export interface RecentGrowingWindowItem {
  title: string;
  note: string;
  sourceUrl: string | null;
}

/** Minimal lesson shape for digest email (profile_type, topic, content). */
export interface DigestLessonItem {
  profile_type: string;
  topic: string;
  content: string;
}
