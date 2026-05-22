import type {
  Bucket,
  Task,
  Trip,
  TripDecision,
  TripItineraryItem,
  TripKnowledgeFavorite,
  TripKnowledgeItem,
  TripOption,
  TripPreferenceSuggestion,
} from "@/types/database";
import { readApiError } from "@/components/dashboard/tasks/api";

export type TripDetail = {
  trip: Trip;
  options: TripOption[];
  decisions: TripDecision[];
  itinerary: TripItineraryItem[];
  knowledge: TripKnowledgeItem[];
  knowledge_favorites: TripKnowledgeFavorite[];
  tasks: Task[];
};

export type CreateTripPayload = {
  title: string;
  destination?: string;
  start_date?: string | null;
  end_date?: string | null;
  logistics?: string | null;
  participants?: string | null;
  adult_count?: number;
  kid_count?: number;
  kid_ages?: number[];
  already_done?: string | null;
  preferences?: string | null;
  selected_preferences?: string[];
};

export async function fetchTrips(): Promise<Trip[]> {
  const response = await fetch("/api/trips", { cache: "no-store" });
  if (!response.ok) await readApiError(response, "Failed to fetch trips");
  const json = (await response.json()) as { trips: Trip[] };
  return json.trips ?? [];
}

export async function createTrip(payload: CreateTripPayload): Promise<Trip> {
  const response = await fetch("/api/trips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readApiError(response, "Failed to create trip");
  const json = (await response.json()) as { trip: Trip };
  return json.trip;
}

export async function fetchTripDetail(id: string): Promise<TripDetail> {
  const response = await fetch(`/api/trips/${id}`, { cache: "no-store" });
  if (!response.ok) await readApiError(response, "Failed to fetch trip");
  return (await response.json()) as TripDetail;
}

export async function updateTrip(id: string, payload: Partial<CreateTripPayload & Pick<Trip, "status" | "notes">>): Promise<Trip> {
  const response = await fetch(`/api/trips/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readApiError(response, "Failed to update trip");
  const json = (await response.json()) as { trip: Trip };
  return json.trip;
}

export async function extractTripLogisticsDetails(id: string, logistics: string): Promise<Trip> {
  const response = await fetch(`/api/trips/${id}/extract-logistics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ logistics }),
  });
  if (!response.ok) await readApiError(response, "Failed to extract logistics");
  const json = (await response.json()) as { trip: Trip };
  return json.trip;
}

export async function addGotlandStarter(id: string): Promise<void> {
  const response = await fetch(`/api/trips/${id}/starter`, { method: "POST" });
  if (!response.ok) await readApiError(response, "Failed to add Gotland starter");
}

export async function createTripOption(tripId: string, payload: Partial<TripOption> & { title: string }): Promise<TripOption> {
  const response = await fetch(`/api/trips/${tripId}/options`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readApiError(response, "Failed to create trip option");
  const json = (await response.json()) as { option: TripOption };
  return json.option;
}

export async function previewTripOptionsPromptForTrip(tripId: string): Promise<string> {
  const response = await fetch(`/api/trips/${tripId}/suggest-options`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "preview" }),
  });
  if (!response.ok) await readApiError(response, "Failed to build option prompt");
  const json = (await response.json()) as { prompt: string };
  return json.prompt ?? "";
}

export async function suggestTripOptionsForTrip(tripId: string, prompt?: string): Promise<TripOption[]> {
  const response = await fetch(`/api/trips/${tripId}/suggest-options`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "generate", prompt }),
  });
  if (!response.ok) await readApiError(response, "Failed to suggest trip options");
  const json = (await response.json()) as { options: TripOption[] };
  return json.options ?? [];
}

export async function createTripKnowledge(
  tripId: string,
  payload: Pick<TripKnowledgeItem, "title" | "raw_markdown"> & Partial<Pick<TripKnowledgeItem, "source_url">>
): Promise<TripKnowledgeItem> {
  const response = await fetch(`/api/trips/${tripId}/knowledge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readApiError(response, "Failed to create trip knowledge");
  const json = (await response.json()) as { knowledge: TripKnowledgeItem };
  return json.knowledge;
}

export async function generateTripKnowledgeStarterForTrip(tripId: string): Promise<TripKnowledgeItem> {
  const response = await fetch(`/api/trips/${tripId}/knowledge/starter`, { method: "POST" });
  if (!response.ok) await readApiError(response, "Failed to generate trip knowledge starter");
  const json = (await response.json()) as { knowledge: TripKnowledgeItem };
  return json.knowledge;
}

export async function updateTripKnowledge(
  id: string,
  payload: Partial<Pick<TripKnowledgeItem, "title" | "source_url" | "raw_markdown">>
): Promise<TripKnowledgeItem> {
  const response = await fetch(`/api/trip-knowledge-items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readApiError(response, "Failed to update trip knowledge");
  const json = (await response.json()) as { knowledge: TripKnowledgeItem };
  return json.knowledge;
}

export async function extractTripKnowledgeItem(id: string): Promise<TripKnowledgeItem> {
  const response = await fetch(`/api/trip-knowledge-items/${id}/extract`, { method: "POST" });
  if (!response.ok) await readApiError(response, "Failed to extract trip knowledge");
  const json = (await response.json()) as { knowledge: TripKnowledgeItem };
  return json.knowledge;
}

export async function deleteTripKnowledge(id: string): Promise<void> {
  const response = await fetch(`/api/trip-knowledge-items/${id}`, { method: "DELETE" });
  if (!response.ok) await readApiError(response, "Failed to delete trip knowledge");
}

export async function createTripKnowledgeFavorite(
  tripId: string,
  payload: Pick<TripKnowledgeFavorite, "item_type" | "name" | "area">
): Promise<TripKnowledgeFavorite> {
  const response = await fetch(`/api/trips/${tripId}/knowledge/favorites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readApiError(response, "Failed to save knowledge favorite");
  const json = (await response.json()) as { favorite: TripKnowledgeFavorite };
  return json.favorite;
}

export async function deleteTripKnowledgeFavorite(id: string): Promise<void> {
  const response = await fetch(`/api/trip-knowledge-favorites/${id}`, { method: "DELETE" });
  if (!response.ok) await readApiError(response, "Failed to delete knowledge favorite");
}

export async function updateTripOption(id: string, payload: Partial<TripOption>): Promise<TripOption> {
  const response = await fetch(`/api/trip-options/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readApiError(response, "Failed to update trip option");
  const json = (await response.json()) as { option: TripOption };
  return json.option;
}

export async function deleteTripOption(id: string): Promise<void> {
  const response = await fetch(`/api/trip-options/${id}`, { method: "DELETE" });
  if (!response.ok) await readApiError(response, "Failed to delete trip option");
}

export async function createTripDecision(tripId: string, payload: Partial<TripDecision> & { title: string }): Promise<TripDecision> {
  const response = await fetch(`/api/trips/${tripId}/decisions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readApiError(response, "Failed to create trip decision");
  const json = (await response.json()) as { decision: TripDecision };
  return json.decision;
}

export async function updateTripDecision(id: string, payload: Partial<TripDecision>): Promise<TripDecision> {
  const response = await fetch(`/api/trip-decisions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readApiError(response, "Failed to update trip decision");
  const json = (await response.json()) as { decision: TripDecision };
  return json.decision;
}

export async function deleteTripDecision(id: string): Promise<void> {
  const response = await fetch(`/api/trip-decisions/${id}`, { method: "DELETE" });
  if (!response.ok) await readApiError(response, "Failed to delete trip decision");
}

export async function createTripItineraryItem(
  tripId: string,
  payload: Partial<TripItineraryItem> & { title: string; day_number: number; block: TripItineraryItem["block"] }
): Promise<TripItineraryItem> {
  const response = await fetch(`/api/trips/${tripId}/itinerary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readApiError(response, "Failed to create itinerary item");
  const json = (await response.json()) as { item: TripItineraryItem };
  return json.item;
}

export async function deleteTripItineraryItem(id: string): Promise<void> {
  const response = await fetch(`/api/trip-itinerary-items/${id}`, { method: "DELETE" });
  if (!response.ok) await readApiError(response, "Failed to delete itinerary item");
}

export async function updateTripItineraryItem(id: string, payload: Partial<Pick<TripItineraryItem, "day_number" | "block" | "notes" | "sort_order">>): Promise<TripItineraryItem> {
  const response = await fetch(`/api/trip-itinerary-items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readApiError(response, "Failed to update itinerary item");
  const json = (await response.json()) as { item: TripItineraryItem };
  return json.item;
}

export async function createTripTask(
  tripId: string,
  payload: {
    title: string;
    bucket: Bucket;
    category?: string;
    original_body?: string | null;
    source_item_id?: string | null;
    source_item_type?: string | null;
  }
): Promise<Task> {
  const response = await fetch(`/api/trips/${tripId}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readApiError(response, "Failed to create trip task");
  const json = (await response.json()) as { task: Task };
  return json.task;
}

export async function deleteTripTask(taskId: string): Promise<void> {
  const response = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
  if (!response.ok) await readApiError(response, "Failed to delete trip task");
}

export async function fetchTripPreferenceSuggestions(includeInactive = false): Promise<TripPreferenceSuggestion[]> {
  const response = await fetch(`/api/trip-preference-suggestions${includeInactive ? "?includeInactive=1" : ""}`, {
    cache: "no-store",
  });
  if (!response.ok) await readApiError(response, "Failed to fetch trip preference suggestions");
  const json = (await response.json()) as { suggestions: TripPreferenceSuggestion[] };
  return json.suggestions ?? [];
}

export type TripPreferenceSuggestionPayload = Pick<
  TripPreferenceSuggestion,
  "category" | "label" | "preference_text"
> &
  Partial<Pick<TripPreferenceSuggestion, "description" | "tags" | "sort_order" | "active">>;

export async function createTripPreferenceSuggestion(
  payload: TripPreferenceSuggestionPayload
): Promise<TripPreferenceSuggestion> {
  const response = await fetch("/api/trip-preference-suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readApiError(response, "Failed to create trip preference suggestion");
  const json = (await response.json()) as { suggestion: TripPreferenceSuggestion };
  return json.suggestion;
}

export async function updateTripPreferenceSuggestion(
  id: string,
  payload: Partial<TripPreferenceSuggestionPayload>
): Promise<TripPreferenceSuggestion> {
  const response = await fetch(`/api/trip-preference-suggestions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readApiError(response, "Failed to update trip preference suggestion");
  const json = (await response.json()) as { suggestion: TripPreferenceSuggestion };
  return json.suggestion;
}

export async function deleteTripPreferenceSuggestion(id: string): Promise<void> {
  const response = await fetch(`/api/trip-preference-suggestions/${id}`, { method: "DELETE" });
  if (!response.ok) await readApiError(response, "Failed to delete trip preference suggestion");
}
