"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createTrip, fetchTrips } from "@/components/dashboard/trip-ops-api";
import type { Trip } from "@/types/database";

const statusLabels: Record<Trip["status"], string> = {
  ideas: "Ideas",
  planning: "Planning",
  upcoming: "Upcoming",
  archived: "Archived",
};

export function TripsDashboard() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({
    title: "Gotland family trip",
    destination: "Gotland",
    start_date: "",
    end_date: "",
    logistics: "",
    participants: "",
    already_done: "",
    preferences: "",
  });
  const [error, setError] = useState<string | null>(null);

  const tripsQuery = useQuery({ queryKey: ["trips"], queryFn: fetchTrips });
  const createMutation = useMutation({
    mutationFn: createTrip,
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to create trip"),
  });

  const trips = tripsQuery.data ?? [];
  const grouped = trips.reduce<Record<Trip["status"], Trip[]>>(
    (acc, trip) => {
      acc[trip.status].push(trip);
      return acc;
    },
    { ideas: [], planning: [], upcoming: [], archived: [] }
  );

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Trip Ops</h2>
          <p className="text-sm text-muted-foreground">Turn fixed logistics into options, decisions, itinerary blocks, and tasks.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="size-4" aria-hidden />
            New trip
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate({
                ...draft,
                start_date: draft.start_date || null,
                end_date: draft.end_date || null,
              });
            }}
          >
            <Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} aria-label="Trip title" />
            <Input
              value={draft.destination}
              onChange={(event) => setDraft({ ...draft, destination: event.target.value })}
              aria-label="Destination"
            />
            <Input
              type="date"
              value={draft.start_date}
              onChange={(event) => setDraft({ ...draft, start_date: event.target.value })}
              aria-label="Start date"
            />
            <Input
              type="date"
              value={draft.end_date}
              onChange={(event) => setDraft({ ...draft, end_date: event.target.value })}
              aria-label="End date"
            />
            <Textarea
              value={draft.logistics}
              onChange={(event) => setDraft({ ...draft, logistics: event.target.value })}
              placeholder="Ferry, accommodation, car, arrival/departure"
              className="md:col-span-2"
              aria-label="Known logistics"
            />
            <Textarea
              value={draft.already_done}
              onChange={(event) => setDraft({ ...draft, already_done: event.target.value })}
              placeholder="Already visited / avoid repeating"
              aria-label="Already done"
            />
            <Textarea
              value={draft.preferences}
              onChange={(event) => setDraft({ ...draft, preferences: event.target.value })}
              placeholder="Family preferences, kid energy, weather tolerance"
              aria-label="Preferences"
            />
            {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
            <div className="md:col-span-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create trip"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {tripsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading trips...</p> : null}
      <div className="grid gap-4 lg:grid-cols-4">
        {(Object.keys(grouped) as Trip["status"][]).map((status) => (
          <section key={status} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{statusLabels[status]}</h3>
              <Badge variant="outline">{grouped[status].length}</Badge>
            </div>
            {grouped[status].length === 0 ? <p className="text-sm text-muted-foreground">No trips</p> : null}
            {grouped[status].map((trip) => (
              <Link key={trip.id} href={`/trips/${trip.id}`} className="block">
                <Card className="transition hover:border-primary/40">
                  <CardContent className="space-y-2 p-4">
                    <div className="font-medium">{trip.title}</div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="size-3.5" aria-hidden />
                      <span>{trip.destination || "No destination"}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <CalendarDays className="size-3.5" aria-hidden />
                      <span>{formatTripDates(trip)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}

function formatTripDates(trip: Trip) {
  if (trip.start_date && trip.end_date) return `${trip.start_date} to ${trip.end_date}`;
  if (trip.start_date) return `From ${trip.start_date}`;
  return "Dates not set";
}
