import type { GrowingSupportingKnowledge, Task } from "@/types/database";
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

export async function fetchGrowingWindowKnowledge(windowId: string): Promise<GrowingSupportingKnowledge[]> {
  const response = await fetch(`/api/growing/windows/${windowId}/knowledge`, { cache: "no-store" });
  if (!response.ok) {
    await readApiError(response, "Failed to load related knowledge");
  }
  const json = (await response.json()) as { knowledge?: GrowingSupportingKnowledge[] };
  return json.knowledge ?? [];
}

export async function fetchTask(id: string): Promise<Task> {
  const response = await fetch(`/api/tasks/${id}`, { cache: "no-store" });
  if (!response.ok) {
    await readApiError(response, "Failed to fetch task");
  }
  const json = (await response.json()) as { task: Task };
  return json.task;
}

export async function updateTaskStatus(id: string, status: Task["status"]): Promise<Task> {
  return updateTask(id, { status });
}

export type UpdateTaskPayload = {
  title?: string;
  original_body?: string | null;
  due_date?: string | null;
  status?: Task["status"];
};

export async function updateTask(id: string, payload: UpdateTaskPayload): Promise<Task> {
  const response = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    await readApiError(response, "Failed to update task");
  }
  const json = (await response.json()) as { task: Task };
  return json.task;
}

export async function readApiError(response: Response, fallback: string): Promise<never> {
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(json.error ?? fallback);
}
