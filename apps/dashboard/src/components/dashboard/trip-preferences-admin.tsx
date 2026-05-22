"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createTripPreferenceSuggestion,
  deleteTripPreferenceSuggestion,
  fetchTripPreferenceSuggestions,
  updateTripPreferenceSuggestion,
} from "@/components/dashboard/trip-ops-api";
import { TRIP_PREFERENCE_CATEGORIES } from "@/lib/trip-ops";
import type { TripPreferenceCategory, TripPreferenceSuggestion } from "@/types/database";

export function TripPreferencesAdmin() {
  const queryClient = useQueryClient();
  const queryKey = ["trip-preference-suggestions", "admin"];
  const [draft, setDraft] = useState({
    category: "pace" as TripPreferenceCategory,
    label: "",
    description: "",
    preference_text: "",
    tags: "",
  });
  const [error, setError] = useState<string | null>(null);

  const suggestionsQuery = useQuery({
    queryKey,
    queryFn: () => fetchTripPreferenceSuggestions(true),
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const createMutation = useMutation({
    mutationFn: () =>
      createTripPreferenceSuggestion({
        ...draft,
        description: draft.description || null,
        tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        active: true,
      }),
    onSuccess: () => {
      setDraft({ category: "pace", label: "", description: "", preference_text: "", tags: "" });
      setError(null);
      void invalidate();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to create preference"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateTripPreferenceSuggestion(id, { active }),
    onSuccess: () => void invalidate(),
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to update preference"),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteTripPreferenceSuggestion,
    onSuccess: () => void invalidate(),
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to delete preference"),
  });

  const grouped = useMemo(() => {
    const initial = TRIP_PREFERENCE_CATEGORIES.reduce(
      (acc, category) => ({ ...acc, [category]: [] }),
      {} as Record<TripPreferenceCategory, TripPreferenceSuggestion[]>
    );
    for (const suggestion of suggestionsQuery.data ?? []) {
      initial[suggestion.category].push(suggestion);
    }
    return initial;
  }, [suggestionsQuery.data]);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
      <div>
        <Button asChild variant="ghost" className="px-0">
          <Link href="/trips">
            <ArrowLeft className="size-4" aria-hidden />
            Trip Ops
          </Link>
        </Button>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Trip preference catalog</h2>
        <p className="text-sm text-muted-foreground">Curate reusable suggestions for the trip preferences picker.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="size-4" aria-hidden />
            New curated preference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <Select value={draft.category} onValueChange={(value) => setDraft({ ...draft, category: value as TripPreferenceCategory })}>
              <SelectTrigger aria-label="Preference category"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRIP_PREFERENCE_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} placeholder="Label" aria-label="Label" />
            <Input
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              placeholder="Short description"
              aria-label="Description"
              className="md:col-span-2"
            />
            <Textarea
              value={draft.preference_text}
              onChange={(event) => setDraft({ ...draft, preference_text: event.target.value })}
              placeholder="Preference text to apply to a trip"
              aria-label="Preference text"
              className="md:col-span-2"
            />
            <Input value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} placeholder="tags, comma separated" aria-label="Tags" />
            <div className="flex items-center justify-end">
              <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Adding..." : "Add preference"}</Button>
            </div>
          </form>
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      {suggestionsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading preferences...</p> : null}
      <div className="grid gap-4 lg:grid-cols-3">
        {TRIP_PREFERENCE_CATEGORIES.map((category) => (
          <section key={category} className="space-y-3">
            <h3 className="text-sm font-semibold capitalize">{category}</h3>
            {grouped[category].length === 0 ? <p className="text-sm text-muted-foreground">No suggestions</p> : null}
            {grouped[category].map((suggestion) => (
              <Card key={suggestion.id} className={suggestion.active ? "" : "opacity-60"}>
                <CardContent className="space-y-3 p-4">
                  <div>
                    <div className="font-medium">{suggestion.label}</div>
                    <p className="text-sm text-muted-foreground">{suggestion.preference_text}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={suggestion.active ? "outline" : "default"}
                      onClick={() => updateMutation.mutate({ id: suggestion.id, active: !suggestion.active })}
                    >
                      {suggestion.active ? "Pause" : "Activate"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(suggestion.id)}
                      aria-label={`Delete ${suggestion.label}`}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
