"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, Circle, CloudSun, MapPinned, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PublicTripSharePayload } from "@/lib/trip-shares/types";
import type { TripItineraryBlock, TripOption } from "@/types/database";

async function fetchTripShare(slug: string): Promise<PublicTripSharePayload> {
  const response = await fetch(`/api/public/trip-shares/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    const json = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(json.error ?? "Could not load shared trip");
  }
  return response.json() as Promise<PublicTripSharePayload>;
}

export function PublicTripSharePage({ slug }: { slug: string }) {
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isDecisionsOpen, setIsDecisionsOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const shareQuery = useQuery({
    queryKey: ["public-trip-share", slug],
    queryFn: () => fetchTripShare(slug),
  });

  const payload = shareQuery.data;
  const title = payload?.share.title || payload?.trip.title || "Shared trip";
  const shortlistedOptions = useMemo(
    () => (payload?.options ?? []).filter((option) => option.status !== "rejected"),
    [payload?.options],
  );
  const openDecisions = useMemo(
    () => (payload?.decisions ?? []).filter((decision) => decision.status !== "decided"),
    [payload?.decisions],
  );
  const itineraryDays = useMemo(
    () => groupItineraryByDay(payload?.itinerary ?? []),
    [payload?.itinerary],
  );

  if (shareQuery.isLoading) {
    return <main className="mx-auto w-full max-w-5xl px-4 py-6 text-sm text-muted-foreground">Loading trip...</main>;
  }

  if (shareQuery.error || !payload) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Share not available</CardTitle>
            <CardDescription>
              {shareQuery.error instanceof Error ? shareQuery.error.message : "Could not load this trip share."}
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Read-only trip</Badge>
          <Badge variant="outline">{formatStatus(payload.trip.status)}</Badge>
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MapPinned className="size-4" aria-hidden />
              {payload.trip.destination || "No destination"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden />
              {formatDates(payload.trip.start_date, payload.trip.end_date)}
            </span>
          </p>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <InfoCard label="Participants" value={formatParticipants(payload)} />
        <InfoCard label="Trip length" value={formatTripDuration(payload.trip.start_date, payload.trip.end_date)} />
        <InfoCard label="Open decisions" value={String(openDecisions.length)} />
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => setIsOptionsOpen(true)}>
          <MapPinned className="size-4" aria-hidden />
          Options
          <Badge variant="secondary">{shortlistedOptions.length}</Badge>
        </Button>
        <Button type="button" variant="outline" onClick={() => setIsDecisionsOpen(true)}>
          <CheckCircle2 className="size-4" aria-hidden />
          Decisions
          <Badge variant="secondary">{payload.decisions.length}</Badge>
        </Button>
        {payload.knowledge_favorites.length > 0 ? (
          <Button type="button" variant="outline" onClick={() => setIsFavoritesOpen(true)}>
            <Star className="size-4" aria-hidden />
            Favorites
            <Badge variant="secondary">{payload.knowledge_favorites.length}</Badge>
          </Button>
        ) : null}
      </div>

      {payload.trip.selected_preferences.length > 0 || payload.trip.preferences ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {payload.trip.selected_preferences.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {payload.trip.selected_preferences.map((preference) => (
                  <Badge key={preference} variant="secondary" className="whitespace-normal text-left">
                    {preference}
                  </Badge>
                ))}
              </div>
            ) : null}
            {payload.trip.preferences ? <p className="whitespace-pre-wrap text-sm">{payload.trip.preferences}</p> : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Itinerary</CardTitle>
        </CardHeader>
        <CardContent>
          {payload.itinerary.length === 0 ? (
            <p className="text-sm text-muted-foreground">No itinerary blocks shared yet.</p>
          ) : (
            <div className="space-y-6">
              {itineraryDays.map((day) => (
                <section key={day.dayNumber} className="space-y-3 border-b pb-6 last:border-b-0 last:pb-0">
                  <h2 className="text-sm font-semibold">Day {day.dayNumber}</h2>
                  <ul className="grid gap-3 md:grid-cols-2">
                    {day.items.map((item) => (
                      <li key={item.id} className="rounded-md bg-muted/40 p-3">
                        <p className="text-xs font-medium text-muted-foreground">
                          {formatBlock(item.block)}
                        </p>
                        <h3 className="mt-1 font-medium leading-snug">{item.title}</h3>
                        {item.notes ? <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{item.notes}</p> : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {payload.trip.already_done ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CloudSun className="size-5" aria-hidden />
              Already Done
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{payload.trip.already_done}</p>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={isOptionsOpen} onOpenChange={setIsOptionsOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Options</DialogTitle>
          </DialogHeader>
          <OptionsList options={shortlistedOptions} />
        </DialogContent>
      </Dialog>

      <Dialog open={isDecisionsOpen} onOpenChange={setIsDecisionsOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Decisions</DialogTitle>
          </DialogHeader>
          <DecisionsList decisions={payload.decisions} />
        </DialogContent>
      </Dialog>

      <Dialog open={isFavoritesOpen} onOpenChange={setIsFavoritesOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Favorites</DialogTitle>
          </DialogHeader>
          <FavoritesList favorites={payload.knowledge_favorites} />
        </DialogContent>
      </Dialog>
    </main>
  );
}

function OptionsList({ options }: { options: PublicTripSharePayload["options"] }) {
  if (options.length === 0) {
    return <p className="text-sm text-muted-foreground">No shared options yet.</p>;
  }

  return (
    <ul className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
      {options.map((option) => (
        <li key={option.id} className="rounded-md border p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-medium leading-snug">{option.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatOptionMeta(option)}
              </p>
            </div>
            <Badge variant={option.status === "planned" ? "default" : "outline"}>
              {formatStatus(option.status)}
            </Badge>
          </div>
          {option.why ? <p className="mt-2 whitespace-pre-wrap text-sm">{option.why}</p> : null}
          {option.notes ? <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{option.notes}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function groupItineraryByDay(items: PublicTripSharePayload["itinerary"]) {
  const groups = new Map<number, PublicTripSharePayload["itinerary"]>();
  for (const item of items) {
    const dayItems = groups.get(item.day_number) ?? [];
    dayItems.push(item);
    groups.set(item.day_number, dayItems);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([dayNumber, dayItems]) => ({
      dayNumber,
      items: [...dayItems].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)),
    }));
}

function DecisionsList({ decisions }: { decisions: PublicTripSharePayload["decisions"] }) {
  if (decisions.length === 0) {
    return <p className="text-sm text-muted-foreground">No decisions shared yet.</p>;
  }

  return (
    <ul className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
      {decisions.map((decision) => (
        <li key={decision.id} className="space-y-1 rounded-md border p-3">
          <div className="flex items-start gap-2">
            {decision.status === "decided" ? (
              <CheckCircle2 className="mt-0.5 size-4 text-primary" aria-hidden />
            ) : (
              <Circle className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
            )}
            <div className="min-w-0">
              <p className="font-medium leading-snug">{decision.title}</p>
              <p className="text-xs text-muted-foreground">
                {formatStatus(decision.status)}
                {decision.owner ? ` · ${decision.owner}` : ""}
                {decision.due_date ? ` · due ${decision.due_date}` : ""}
              </p>
            </div>
          </div>
          {decision.outcome ? <p className="whitespace-pre-wrap text-sm">{decision.outcome}</p> : null}
          {decision.notes ? <p className="whitespace-pre-wrap text-xs text-muted-foreground">{decision.notes}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function FavoritesList({ favorites }: { favorites: PublicTripSharePayload["knowledge_favorites"] }) {
  if (favorites.length === 0) {
    return <p className="text-sm text-muted-foreground">No favorites shared yet.</p>;
  }

  return (
    <ul className="flex max-h-[70vh] flex-wrap gap-1.5 overflow-y-auto pr-1">
      {favorites.map((favorite) => (
        <li key={favorite.id}>
          <Badge variant="secondary" className="whitespace-normal text-left">
            {favorite.name}
            {favorite.area ? ` · ${favorite.area}` : ""}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm font-medium">{value}</p>
      </CardContent>
    </Card>
  );
}

function formatParticipants(payload: PublicTripSharePayload) {
  const parts = [`${payload.trip.adult_count} adults`, `${payload.trip.kid_count} kids`];
  if (payload.trip.kid_ages.length > 0) {
    parts.push(`ages ${payload.trip.kid_ages.join(", ")}`);
  }
  return parts.join(" · ");
}

function formatDates(startDate: string | null, endDate: string | null) {
  if (startDate && endDate) return `${startDate} to ${endDate}`;
  if (startDate) return `from ${startDate}`;
  return "dates not set";
}

function formatTripDuration(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) return "Dates not set";
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return "Dates not set";
  const days = Math.round((end - start) / 86400000) + 1;
  const nights = Math.max(0, days - 1);
  return `${days} ${days === 1 ? "day" : "days"} / ${nights} ${nights === 1 ? "night" : "nights"}`;
}

function formatOptionMeta(option: TripOption) {
  return [
    formatStatus(option.option_type),
    option.location,
    option.effort ? `${option.effort} effort` : null,
    option.weather_fit ? `${option.weather_fit} weather` : null,
    option.kid_fit ? `${option.kid_fit} kid fit` : null,
    option.booking_needed ? "booking needed" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function formatBlock(block: TripItineraryBlock) {
  return formatStatus(block);
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
