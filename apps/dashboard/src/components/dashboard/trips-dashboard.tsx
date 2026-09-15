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
import { cn } from "@/lib/utils";

const statusLabels: Record<Trip["status"], string> = {
  ideas: "Ideas",
  planning: "Planning",
  upcoming: "Upcoming",
  archived: "Archived",
};

export function TripsDashboard() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({
    title: "",
    destination: "",
    start_date: "",
    end_date: "",
    logistics: "",
    participants: "",
    adult_count: "0",
    kid_count: "0",
    kid_ages: "",
    already_done: "",
    preferences: "",
  });
  const [detailsOpen, setDetailsOpen] = useState(false);
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
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-5 py-8 pb-12 sm:px-8 sm:py-9 lg:px-10">
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Trip Ops</p>
        <h1 className="font-serif text-[2rem] leading-none font-medium tracking-tight">Turn logistics into a plan</h1>
        <p className="mt-2 text-sm text-muted-foreground">Fixed logistics become options, decisions, itinerary blocks, and tasks.</p>
      </div>

      <Card className="gap-0 rounded-2xl border bg-card py-0 shadow-[0_1px_2px_rgba(36,31,25,0.04),0_8px_24px_-12px_rgba(36,31,25,0.14)]">
        <CardHeader className="px-6 pt-6 pb-[18px]">
          <CardTitle className="flex items-center gap-2.5 text-[17px]">
            <span className="flex size-8 items-center justify-center rounded-[9px] bg-[#f4e1cf] text-primary"><Plus className="size-4" aria-hidden /></span>
            New trip
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              const kidAges = draft.kid_ages.split(/[,\s]+/).filter(Boolean).map(Number);
              if (kidAges.some((age) => !Number.isInteger(age) || age < 0 || age > 18)) {
                setDetailsOpen(true);
                setError("Enter kid ages as whole numbers from 0 to 18, separated by commas.");
                return;
              }
              setError(null);
              createMutation.mutate({
                ...draft,
                adult_count: Number(draft.adult_count),
                kid_count: Number(draft.kid_count),
                kid_ages: kidAges,
                selected_preferences: [],
                start_date: draft.start_date || null,
                end_date: draft.end_date || null,
              });
            }}
          >
            <label className="grid gap-1.5 text-sm font-medium md:col-span-2" htmlFor="new-trip-title">
              Trip title
              <Input id="new-trip-title" className="h-[42px] rounded-[10px] shadow-none" required maxLength={160} placeholder="e.g. Gotland family trip" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
            </label>
            <details className="md:col-span-2" open={detailsOpen} onToggle={(event) => setDetailsOpen(event.currentTarget.open)} onInvalidCapture={() => setDetailsOpen(true)}>
              <summary className="cursor-pointer text-sm text-muted-foreground">Optional details · destination, dates, participants</summary>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Input
                  className="h-[42px] rounded-[10px] shadow-none"
                  placeholder="Destination"
                  value={draft.destination}
                  onChange={(event) => setDraft({ ...draft, destination: event.target.value })}
                  aria-label="Destination"
                />
                <Input
                  className="h-[42px] rounded-[10px] shadow-none"
                  type="date"
                  value={draft.start_date}
                  onChange={(event) => setDraft({ ...draft, start_date: event.target.value })}
                  aria-label="Start date"
                />
                <Input
                  className="h-[42px] rounded-[10px] shadow-none"
                  type="date"
                  value={draft.end_date}
                  onChange={(event) => setDraft({ ...draft, end_date: event.target.value })}
                  aria-label="End date"
                />
                <fieldset className="grid min-w-0 gap-3 md:col-span-2">
                  <legend className="mb-2 text-sm font-medium">Participants</legend>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="grid gap-1.5 text-sm" htmlFor="new-trip-adults">
                      Adults
                      <Input id="new-trip-adults" type="number" min={0} max={50} value={draft.adult_count} onChange={(event) => setDraft({ ...draft, adult_count: event.target.value })} />
                    </label>
                    <label className="grid gap-1.5 text-sm" htmlFor="new-trip-kids">
                      Kids
                      <Input id="new-trip-kids" type="number" min={0} max={50} value={draft.kid_count} onChange={(event) => setDraft({ ...draft, kid_count: event.target.value })} />
                    </label>
                    <label className="grid gap-1.5 text-sm" htmlFor="new-trip-kid-ages">
                      Kid ages
                      <Input id="new-trip-kid-ages" placeholder="e.g. 5, 8" value={draft.kid_ages} onChange={(event) => setDraft({ ...draft, kid_ages: event.target.value })} />
                    </label>
                  </div>
                  <label className="grid gap-1.5 text-sm" htmlFor="new-trip-participants">
                    Participant notes
                    <Textarea id="new-trip-participants" value={draft.participants} onChange={(event) => setDraft({ ...draft, participants: event.target.value })} placeholder="Who’s coming? Add names or any helpful notes." className="min-h-16 rounded-[10px] shadow-none" />
                  </label>
                </fieldset>
                <Textarea
                  value={draft.logistics}
                  onChange={(event) => setDraft({ ...draft, logistics: event.target.value })}
                  placeholder="Ferry, accommodation, car, arrival/departure"
                  className="min-h-16 rounded-[10px] shadow-none md:col-span-2"
                  aria-label="Known logistics"
                />
                <Textarea
                  value={draft.already_done}
                  onChange={(event) => setDraft({ ...draft, already_done: event.target.value })}
                  placeholder="Already visited / avoid repeating"
                  className="min-h-16 rounded-[10px] shadow-none"
                  aria-label="Already done"
                />
                <Textarea
                  value={draft.preferences}
                  onChange={(event) => setDraft({ ...draft, preferences: event.target.value })}
                  placeholder="Family preferences, kid energy, weather tolerance"
                  className="min-h-16 rounded-[10px] shadow-none"
                  aria-label="Preferences"
                />
              </div>
            </details>
            {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
            <div className="md:col-span-2">
              <Button className="h-10 rounded-[10px] px-4 shadow-none" type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create trip"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {tripsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading trips...</p> : null}
      <div className="grid items-start gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(grouped) as Trip["status"][]).map((status) => (
          <section key={status} className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="font-sans text-[13px] font-bold uppercase tracking-[0.03em]">{statusLabels[status]}</h2>
              <Badge className={cn("min-w-7 justify-center border-0 px-2 py-1 text-xs font-semibold shadow-none", status === "upcoming" ? "bg-[#f4e1cf] text-primary" : "bg-muted text-muted-foreground")}>{grouped[status].length}</Badge>
            </div>
            {grouped[status].length === 0 ? <p className="text-sm text-muted-foreground">No trips</p> : null}
            {grouped[status].map((trip) => (
              <Link key={trip.id} href={`/trips/${trip.id}`} className="block">
                <Card className={cn("gap-0 rounded-[14px] border bg-card py-0 shadow-[0_1px_2px_rgba(36,31,25,0.04),0_8px_24px_-12px_rgba(36,31,25,0.14)] transition-all hover:-translate-y-0.5 hover:border-primary/40", status === "archived" && "opacity-70", status === "upcoming" && daysUntil(trip.start_date) !== null && daysUntil(trip.start_date)! <= 14 && "border-primary")}>
                  <CardContent className="flex flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium leading-snug">{trip.title}</div>
                      {status === "upcoming" && daysUntil(trip.start_date) !== null ? <Badge className={cn("shrink-0 border-0 px-2.5 py-1 text-xs font-semibold shadow-none", daysUntil(trip.start_date)! <= 14 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{formatCountdown(daysUntil(trip.start_date)!)}</Badge> : null}
                    </div>
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
  if (trip.start_date && trip.end_date) return `${formatDate(trip.start_date)} to ${formatDate(trip.end_date)}`;
  if (trip.start_date) return `From ${formatDate(trip.start_date)}`;
  return "Dates not set";
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function daysUntil(value: string | null) {
  if (!value) return null;
  const target = new Date(`${value}T00:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function formatCountdown(days: number) {
  if (days < 0) return "Active";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 14) return `${days} days`;
  const weeks = Math.round(days / 7);
  return `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
}
