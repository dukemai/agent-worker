import type { Task } from "@/types/database";
import type { Bucket, ReminderItem } from "./types";

export async function fetchBucket(bucket: Bucket): Promise<Task[]> {
  const response = await fetch(`/api/tasks?bucket=${bucket}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${bucket} tasks`);
  }
  const json = (await response.json()) as { tasks: Task[] };
  return json.tasks;
}

export async function fetchRenewals(): Promise<ReminderItem[]> {
  const response = await fetch("/api/reminders", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to fetch reminders");
  }
  const json = (await response.json()) as { reminders: ReminderItem[] };
  return json.reminders ?? [];
}

export async function readApiError(response: Response, fallback: string): Promise<never> {
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(json.error ?? fallback);
}
