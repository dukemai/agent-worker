import type {
  ActivitySource,
  ActivitySourceMapping,
  ActivityStatus,
  LocalActivity,
  SeasonalActivityInstance,
  SeasonalActivityStatus,
} from "@/types/database";

async function readApiError(response: Response, fallback: string): Promise<never> {
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(json.error ?? fallback);
}

export type ActivitiesSummaryResponse = {
  today: string;
  week_end: string;
  finder_items: Array<SeasonalActivityInstance | LocalActivity>;
  today_items: SeasonalActivityInstance[];
  this_week: SeasonalActivityInstance[];
  rainy_day: Array<SeasonalActivityInstance | LocalActivity>;
  needs_booking: SeasonalActivityInstance[];
  evergreen: LocalActivity[];
};

export async function fetchActivitiesSummary(): Promise<ActivitiesSummaryResponse> {
  const response = await fetch("/api/activities/summary", { cache: "no-store" });
  if (!response.ok) await readApiError(response, "Failed to load activity summary");
  return response.json();
}

export async function fetchActivitySources(): Promise<{ sources: ActivitySource[] }> {
  const response = await fetch("/api/activities/sources", { cache: "no-store" });
  if (!response.ok) await readApiError(response, "Failed to load activity sources");
  return response.json();
}

export async function fetchActivitySourceMappings(): Promise<{ mappings: ActivitySourceMapping[] }> {
  const response = await fetch("/api/activities/source-mappings", { cache: "no-store" });
  if (!response.ok) await readApiError(response, "Failed to load activity source mappings");
  return response.json();
}

export async function importActivitySourceMappings(payload: unknown): Promise<{ imported: number; domains: string[] }> {
  const response = await fetch("/api/activities/source-mappings/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readApiError(response, "Failed to import source directory JSON");
  return response.json();
}

export type ActivitySourceMappingPayload = Pick<
  ActivitySourceMapping,
  | "source_domain"
  | "source_name"
  | "homepage_url"
  | "activity_listing_url"
  | "gathering_notes"
  | "collection_focus"
  | "collection_instructions"
  | "check_frequency"
  | "last_checked_at"
  | "season_target"
  | "is_core"
  | "source_category"
  | "source_scope"
  | "source_trust"
  | "source_language"
>;

export async function markActivitySourceMappingChecked(id: string): Promise<{ mapping: ActivitySourceMapping }> {
  const response = await fetch(`/api/activities/source-mappings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ last_checked_at: new Date().toISOString() }),
  });
  if (!response.ok) await readApiError(response, "Failed to mark source as checked");
  return response.json();
}

export async function resetActivitySourceMappingChecked(id: string): Promise<{ mapping: ActivitySourceMapping }> {
  const response = await fetch(`/api/activities/source-mappings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ last_checked_at: null }),
  });
  if (!response.ok) await readApiError(response, "Failed to reset source check");
  return response.json();
}

export async function createActivitySourceMapping(
  payload: ActivitySourceMappingPayload
): Promise<{ mapping: ActivitySourceMapping }> {
  const response = await fetch("/api/activities/source-mappings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readApiError(response, "Failed to create activity source mapping");
  return response.json();
}

export async function updateActivitySourceMapping(
  id: string,
  payload: ActivitySourceMappingPayload
): Promise<{ mapping: ActivitySourceMapping }> {
  const response = await fetch(`/api/activities/source-mappings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readApiError(response, "Failed to update activity source mapping");
  return response.json();
}

export async function deleteActivitySourceMapping(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/activities/source-mappings/${id}`, { method: "DELETE" });
  if (!response.ok) await readApiError(response, "Failed to remove activity source mapping");
  return response.json();
}

export async function fetchActivitySource(id: string): Promise<{ source: ActivitySource }> {
  const response = await fetch(`/api/activities/sources/${id}`, { cache: "no-store" });
  if (!response.ok) await readApiError(response, "Failed to load activity source");
  return response.json();
}

export async function createActivitySource(payload: {
  title: string;
  source_url: string | null;
  raw_markdown: string;
  capture_html?: string | null;
  capture_metadata?: Record<string, unknown> | null;
  capture_template_id?: string | null;
  capture_template_version?: number | null;
}): Promise<{ source: ActivitySource }> {
  const response = await fetch("/api/activities/sources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readApiError(response, "Failed to create activity source");
  return response.json();
}

export async function updateActivitySource(
  id: string,
  payload: {
    title: string;
    source_url: string | null;
    raw_markdown: string;
  }
): Promise<{ source: ActivitySource }> {
  const response = await fetch(`/api/activities/sources/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readApiError(response, "Failed to update activity source");
  return response.json();
}

export async function deleteActivitySource(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/activities/sources/${id}`, { method: "DELETE" });
  if (!response.ok) await readApiError(response, "Failed to remove activity source");
  return response.json();
}

export async function extractActivitySource(sourceId: string): Promise<{
  success: boolean;
  reusable_activities: number;
  seasonal_instances: number;
}> {
  const response = await fetch(`/api/activities/sources/${sourceId}/extract`, { method: "POST" });
  if (!response.ok) await readApiError(response, "Failed to extract activity source");
  return response.json();
}

export async function fetchLocalActivities(): Promise<{ activities: LocalActivity[] }> {
  const response = await fetch("/api/activities/local", { cache: "no-store" });
  if (!response.ok) await readApiError(response, "Failed to load local activities");
  return response.json();
}

export async function updateLocalActivityStatus(
  id: string,
  status: ActivityStatus
): Promise<{ activity: { id: string; status: ActivityStatus; favorite: boolean; updated_at: string } }> {
  const response = await fetch(`/api/activities/local/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) await readApiError(response, "Failed to update local activity");
  return response.json();
}

export async function updateLocalActivityFavorite(
  id: string,
  favorite: boolean
): Promise<{ activity: { id: string; status: ActivityStatus; favorite: boolean; updated_at: string } }> {
  const response = await fetch(`/api/activities/local/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ favorite }),
  });
  if (!response.ok) await readApiError(response, "Failed to update local activity");
  return response.json();
}

export async function fetchSeasonalActivities(): Promise<{ instances: SeasonalActivityInstance[] }> {
  const response = await fetch("/api/activities/seasonal", { cache: "no-store" });
  if (!response.ok) await readApiError(response, "Failed to load seasonal activities");
  return response.json();
}

export async function updateSeasonalActivityStatus(
  id: string,
  status: SeasonalActivityStatus
): Promise<{ instance: { id: string; status: SeasonalActivityStatus; favorite: boolean; updated_at: string } }> {
  const response = await fetch(`/api/activities/seasonal/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) await readApiError(response, "Failed to update seasonal activity");
  return response.json();
}

export async function updateSeasonalActivityFavorite(
  id: string,
  favorite: boolean
): Promise<{ instance: { id: string; status: SeasonalActivityStatus; favorite: boolean; updated_at: string } }> {
  const response = await fetch(`/api/activities/seasonal/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ favorite }),
  });
  if (!response.ok) await readApiError(response, "Failed to update seasonal activity");
  return response.json();
}
