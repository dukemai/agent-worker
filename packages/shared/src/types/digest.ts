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
}

export interface GrowingSuggestionDigestItem {
  title: string;
  details: string;
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
