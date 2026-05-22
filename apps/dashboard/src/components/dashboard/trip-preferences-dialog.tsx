"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Settings2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fetchTripPreferenceSuggestions } from "@/components/dashboard/trip-ops-api";
import { TRIP_PREFERENCE_CATEGORIES } from "@/lib/trip-ops";
import type { TripPreferenceCategory } from "@/types/database";

export function TripPreferencesDialog({
  selected,
  onApply,
}: {
  selected: string[];
  onApply: (preferences: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(selected);
  const suggestionsQuery = useQuery({
    queryKey: ["trip-preference-suggestions"],
    queryFn: () => fetchTripPreferenceSuggestions(false),
    enabled: open,
  });

  const grouped = useMemo(() => {
    const initial = TRIP_PREFERENCE_CATEGORIES.reduce(
      (acc, category) => ({ ...acc, [category]: [] }),
      {} as Record<TripPreferenceCategory, string[]>
    );
    for (const suggestion of suggestionsQuery.data ?? []) {
      initial[suggestion.category].push(suggestion.preference_text);
    }
    return initial;
  }, [suggestionsQuery.data]);

  function togglePreference(text: string) {
    setDraft((current) => current.includes(text) ? current.filter((item) => item !== text) : [...current, text]);
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (nextOpen) setDraft(selected);
    }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Sparkles className="size-4" aria-hidden />
          Suggest preferences
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Suggested preferences</DialogTitle>
          <DialogDescription>
            Pick reusable planning constraints for this trip.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="outline">{draft.length} selected</Badge>
            <Button asChild type="button" variant="ghost" size="sm">
              <Link href="/trips/preferences">
                <Settings2 className="size-4" aria-hidden />
                Manage catalog
              </Link>
            </Button>
          </div>
          {suggestionsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading suggestions...</p> : null}
          <div className="grid gap-4 md:grid-cols-2">
            {TRIP_PREFERENCE_CATEGORIES.map((category) => (
              <section key={category} className="space-y-2">
                <h3 className="text-sm font-semibold capitalize">{category}</h3>
                {(grouped[category] ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active suggestions</p>
                ) : null}
                {(grouped[category] ?? []).map((text) => {
                  const active = draft.includes(text);
                  return (
                    <button
                      key={text}
                      type="button"
                      onClick={() => togglePreference(text)}
                      className={`w-full rounded-md border p-3 text-left text-sm transition ${
                        active ? "border-primary bg-primary/5" : "hover:border-primary/40"
                      }`}
                    >
                      {text}
                    </button>
                  );
                })}
              </section>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="button" onClick={() => {
            onApply(draft);
            setOpen(false);
          }}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
