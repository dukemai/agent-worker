import type { Bucket, Task } from "@/types/database";

export type { Bucket };

export type TasksByBucket = Record<Bucket, Task[]>;

export type ReminderType =
  | "passport"
  | "subscription"
  | "membership"
  | "permit"
  | "insurance"
  | "other";

export type Recurrence = "none" | "yearly" | "monthly";

export type ReminderGroup = "critical" | "urgent" | "soon";
export type ReminderAction = "complete" | "snooze";

export type ReminderItem = {
  id: string;
  title: string;
  due_date: string;
  days_left: number;
  metadata: Record<string, unknown> | null;
  group: ReminderGroup;
};

export type CreateTaskPayload = {
  title: string;
  due_date: string | null;
  bucket: Bucket;
};

export type CreateReminderPayload = {
  title: string;
  reminder_type: ReminderType;
  owner: string;
  expires_on: string | null;
  lead_days: number;
  recurrence: Recurrence;
  link: string;
  next_action: string;
};

export const BUCKETS: Bucket[] = ["today", "this_week", "later"];

export const BUCKET_LABELS: Record<Bucket, string> = {
  today: "Today",
  this_week: "This Week",
  later: "Later",
};

export const EMPTY_TASKS: TasksByBucket = {
  today: [],
  this_week: [],
  later: [],
};
