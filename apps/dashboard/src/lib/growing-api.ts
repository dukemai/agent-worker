import type { Bucket } from "@/types/database";
import type {
  GrowingKnowledgeResponse,
  GrowingProfileForm,
  GrowingSourcesResponse,
  WeeklyGrowingResponse,
} from "@/components/dashboard/growing-dashboard.types";

async function readApiError(response: Response, fallback: string): Promise<never> {
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(json.error ?? fallback);
}

export async function fetchWeeklyGrowing(): Promise<WeeklyGrowingResponse> {
  const response = await fetch("/api/growing/weekly", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load weekly growing suggestions");
  }
  return (await response.json()) as WeeklyGrowingResponse;
}

export async function fetchGrowingSources(): Promise<GrowingSourcesResponse> {
  const response = await fetch("/api/growing/sources", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load growing sources");
  }
  return (await response.json()) as GrowingSourcesResponse;
}

export async function fetchGrowingSource(
  sourceId: string
): Promise<{
  id: string;
  url: string;
  title: string | null;
  channel: string | null;
  description: string | null;
  source_type: string | null;
  status: string;
  error_message: string | null;
  tips_extracted: number;
  created_at: string;
  processed_at: string | null;
  transcript: string | null;
}> {
  const response = await fetch(`/api/growing/sources/${sourceId}`, { cache: "no-store" });
  if (!response.ok) {
    await readApiError(response, "Failed to load source");
  }
  return response.json();
}

export type GrowingKnowledgeFilters = {
  category: string;
  tags: string;
  season: string;
  location: string;
};

export async function fetchGrowingKnowledge(
  filters: GrowingKnowledgeFilters
): Promise<GrowingKnowledgeResponse> {
  const params = new URLSearchParams();
  if (filters.category && filters.category !== "all") {
    params.set("category", filters.category);
  }
  if (filters.tags.trim()) {
    params.set("tags", filters.tags.trim());
  }
  if (filters.season && filters.season !== "all") {
    params.set("season_relevance", filters.season);
  }
  if (filters.location.trim()) {
    params.set("location", filters.location.trim());
  }

  const response = await fetch(`/api/growing/knowledge?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load growing knowledge");
  }
  return (await response.json()) as GrowingKnowledgeResponse;
}

export async function updateGrowingProfile(form: GrowingProfileForm): Promise<{ profile: unknown }> {
  const response = await fetch("/api/growing/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      city: form.city,
      country_code: form.country_code,
      space_type: form.space_type,
      experience_level: form.experience_level,
      interests: form.interestsStr.split(",").map((s) => s.trim()).filter(Boolean),
    }),
  });
  if (!response.ok) {
    await readApiError(response, "Failed to update growing profile");
  }
  return response.json();
}

export async function convertGrowingSuggestion(
  suggestionId: string,
  bucket: Bucket
): Promise<{ success: boolean; task: unknown; bucket: Bucket }> {
  const response = await fetch("/api/growing/convert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ suggestion_id: suggestionId, bucket }),
  });
  if (!response.ok) {
    await readApiError(response, "Failed to convert growing suggestion");
  }
  return response.json();
}

export async function updateSuggestionStatus(
  suggestionId: string,
  status: "dismissed" | "done"
): Promise<{ suggestion: { id: string; status: string; updated_at: string } }> {
  const response = await fetch(`/api/growing/suggestions/${suggestionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    await readApiError(response, "Failed to update suggestion status");
  }
  return response.json();
}

export async function addGrowingSource(url: string, transcript?: string | null): Promise<{ source: unknown }> {
  const response = await fetch("/api/growing/sources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, transcript: transcript ?? null }),
  });
  if (!response.ok) {
    await readApiError(response, "Failed to add YouTube source");
  }
  return response.json();
}

export async function updateSourceTranscript(sourceId: string, transcript: string | null): Promise<{ success: boolean }> {
  const response = await fetch(`/api/growing/sources/${sourceId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript }),
  });
  if (!response.ok) {
    await readApiError(response, "Failed to update transcript");
  }
  return response.json();
}

export async function deleteGrowingSource(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/growing/sources/${id}`, { method: "DELETE" });
  if (!response.ok) {
    await readApiError(response, "Failed to delete source");
  }
  return response.json();
}

export type ProcessGrowingSourceResult = {
  success: boolean;
  tips_extracted?: number;
  error?: string;
};

export async function cleanSourceExtraction(sourceId: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/growing/sources/${sourceId}/clean`, { method: "POST" });
  if (!response.ok) {
    await readApiError(response, "Failed to clean source extraction");
  }
  return response.json();
}

/** Clean extracted knowledge/windows from a source and re-run extraction. */
export async function cleanSourceAndReextract(sourceId: string): Promise<ProcessGrowingSourceResult> {
  await cleanSourceExtraction(sourceId);
  return processGrowingSource(sourceId);
}

export async function processGrowingSource(sourceId: string): Promise<ProcessGrowingSourceResult> {
  const response = await fetch(`/api/growing/sources/${sourceId}`, { method: "POST" });
  const result = (await response.json()) as ProcessGrowingSourceResult;
  if (!response.ok && result.error) {
    throw new Error(result.error);
  }
  return result;
}

export type FetchSourceVideoInfoResult = {
  success: boolean;
  title?: string | null;
  channel?: string | null;
  description?: string | null;
  error?: string;
};

export async function fetchSourceVideoInfo(sourceId: string): Promise<FetchSourceVideoInfoResult> {
  const response = await fetch(`/api/growing/sources/${sourceId}/fetch-info`, { method: "POST" });
  const result = (await response.json()) as FetchSourceVideoInfoResult;
  if (!response.ok) {
    throw new Error(result.error ?? "Failed to fetch video info");
  }
  return result;
}

export async function fetchGrowingWindows(): Promise<{ windows: GrowingWindowItem[] }> {
  const response = await fetch("/api/growing/windows", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load growing windows");
  }
  return (await response.json()) as { windows: GrowingWindowItem[] };
}

export type GrowingWindowItem = {
  id: string;
  source_id: string | null;
  item_key: string;
  item_name: string;
  suggestion_kind: string;
  action_type: string | null;
  start_month: number;
  end_month: number;
  priority: number;
  suggested_bucket: string;
  stockholm_note: string;
  tags: string[];
  verified: boolean;
  created_at: string;
  source: { id: string; url: string | null; title: string | null; channel: string | null } | null;
};

export async function updateGrowingWindowVerified(id: string, verified: boolean): Promise<{ success: boolean }> {
  const response = await fetch(`/api/growing/windows/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ verified }),
  });
  if (!response.ok) {
    await readApiError(response, "Failed to update window");
  }
  return response.json();
}

export async function updateGrowingWindowMonths(
  id: string,
  start_month: number,
  end_month: number
): Promise<{ success: boolean }> {
  const response = await fetch(`/api/growing/windows/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ start_month, end_month }),
  });
  if (!response.ok) {
    await readApiError(response, "Failed to update window months");
  }
  return response.json();
}

export async function deleteGrowingWindow(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/growing/windows/${id}`, { method: "DELETE" });
  if (!response.ok) {
    await readApiError(response, "Failed to delete window");
  }
  return response.json();
}

export async function deleteGrowingKnowledge(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/growing/knowledge/${id}`, { method: "DELETE" });
  if (!response.ok) {
    await readApiError(response, "Failed to delete knowledge");
  }
  return response.json();
}

export async function createTask(payload: {
  title: string;
  bucket: Bucket;
}): Promise<{ task: unknown }> {
  const response = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    await readApiError(response, "Failed to add knowledge as task");
  }
  return response.json();
}
