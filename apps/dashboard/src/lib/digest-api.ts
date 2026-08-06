import type { DigestPreviewResponse } from "@/app/api/digest/preview/route";

async function readApiError(response: Response, fallback: string): Promise<never> {
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(json.error ?? fallback);
}

export async function fetchDigestPreview(): Promise<DigestPreviewResponse> {
  const response = await fetch("/api/digest/preview", { cache: "no-store" });
  if (!response.ok) {
    await readApiError(response, "Failed to load digest preview");
  }
  return (await response.json()) as DigestPreviewResponse;
}

export type DigestPreferences = {
  singleton: boolean;
  red_day_lead_days: number;
  high_growth_start: string;
  high_growth_end: string;
  harvest_start: string;
  harvest_end: string;
};

export type PlanningDay = {
  id: string;
  title: string;
  category: "red_day" | "school" | "family" | "closure" | "other";
  starts_on: string;
  ends_on: string | null;
  enabled: boolean;
  notes: string | null;
};

export async function fetchDigestSettings(): Promise<{ preferences: DigestPreferences; planning_days: PlanningDay[] }> {
  const response = await fetch("/api/digest/settings", { cache: "no-store" });
  if (!response.ok) await readApiError(response, "Failed to load digest settings");
  return response.json();
}

export async function saveDigestPreferences(preferences: Omit<DigestPreferences, "singleton">) {
  const response = await fetch("/api/digest/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(preferences) });
  if (!response.ok) await readApiError(response, "Failed to save digest preferences");
  return response.json();
}

export async function createPlanningDay(day: Omit<PlanningDay, "id">) {
  const response = await fetch("/api/digest/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(day) });
  if (!response.ok) await readApiError(response, "Failed to add planning day");
  return response.json();
}

export async function updatePlanningDay(id: string, patch: Partial<PlanningDay>) {
  const response = await fetch(`/api/digest/settings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
  if (!response.ok) await readApiError(response, "Failed to update planning day");
  return response.json();
}

export async function deletePlanningDay(id: string) {
  const response = await fetch(`/api/digest/settings/${id}`, { method: "DELETE" });
  if (!response.ok) await readApiError(response, "Failed to delete planning day");
  return response.json();
}

export async function importPlanningDays(payload: unknown): Promise<{ imported: number; created: number; updated: number }> {
  const response = await fetch("/api/digest/settings/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) await readApiError(response, "Failed to import planning-day JSON");
  return response.json();
}
