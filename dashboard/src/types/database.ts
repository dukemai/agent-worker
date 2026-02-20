export type TaskStatus = "pending" | "done";
export type TaskSource = "email" | "manual";
export type Bucket = "today" | "this_week" | "later";
export type LearningStatus = "active" | "paused";
export type LearningProfileType = "topic" | "category";

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
