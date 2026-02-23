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

export type GrowingKnowledgeFilters = {
  category: string;
  tags: string;
  season: string;
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

export async function addGrowingSource(url: string): Promise<{ source: unknown }> {
  const response = await fetch("/api/growing/sources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) {
    await readApiError(response, "Failed to add YouTube source");
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

export async function processGrowingSource(sourceId: string): Promise<ProcessGrowingSourceResult> {
  const response = await fetch(`/api/growing/sources/${sourceId}`, { method: "POST" });
  const result = (await response.json()) as ProcessGrowingSourceResult;
  if (!response.ok && result.error) {
    throw new Error(result.error);
  }
  return result;
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
