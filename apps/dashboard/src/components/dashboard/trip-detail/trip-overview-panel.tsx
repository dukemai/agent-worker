"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Link2, MapPinned, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createTripShare, disableTripShare, fetchTripShares } from "@/components/dashboard/trip-ops-api";
import { formatTripDuration, isEmptyRecord } from "@/components/dashboard/trip-utils";
import { ExtractedLogistics, TripSection } from "@/components/dashboard/trip-detail/trip-detail-shared";
import type { Trip } from "@/types/database";

export function TripOverview({ trip }: { trip: Trip }) {
  return (
    <TripSection title="Known logistics" className="[&_h2]:font-serif [&_h2]:font-medium" icon={<MapPinned className="size-4" aria-hidden />}
      actions={<div className="flex items-center gap-3.5">
        <p className="text-[13px] text-muted-foreground">{formatTripDuration(trip.start_date ?? "", trip.end_date ?? "")}</p>
        <Button asChild variant="outline" size="sm"><Link href={`/trips/${trip.id}/edit`}><Pencil className="size-4" aria-hidden />Edit</Link></Button>
      </div>}>
      <TripLogisticsSummary trip={trip} />
    </TripSection>
  );
}

function TripLogisticsSummary({ trip }: { trip: Trip }) {
  const basics = [
    ["Trip title", trip.title],
    ["Destination", trip.destination],
    ["Start date", trip.start_date],
    ["End date", trip.end_date],
  ].filter((row): row is [string, string] => typeof row[1] === "string" && row[1].trim().length > 0);
  const participants = [
    ["Adults", String(trip.adult_count ?? 0)],
    ["Kids", String(trip.kid_count ?? 0)],
    ["Kid ages", trip.kid_ages?.length ? trip.kid_ages.join(", ") : null],
  ].filter((row): row is [string, string] => typeof row[1] === "string" && row[1].trim().length > 0);
  const preferences = trip.selected_preferences ?? [];

  return (
    <div className="grid gap-3.5 md:grid-cols-2">
      <LogisticsPanel title="Trip basics"><LogisticsRows rows={basics} /></LogisticsPanel>
      <LogisticsPanel title="Participants">
        <LogisticsRows rows={participants} />
        {trip.participants ? <p className="whitespace-pre-wrap text-[13px]">{trip.participants}</p> : null}
      </LogisticsPanel>
      <LogisticsPanel title="Preferences">
        {preferences.length ? (
          <div className="flex flex-wrap gap-1.5">
            {preferences.map((preference) => <Badge key={preference} className="border-0 bg-[#dfe9e6] text-[#3d6e68] dark:bg-teal-950 dark:text-teal-200">{preference}</Badge>)}
          </div>
        ) : <p className="text-[13px] text-muted-foreground">No selected preferences yet.</p>}
      </LogisticsPanel>
      <LogisticsPanel title="Transport and stay">
        <ExtractedLogistics details={trip.logistics_details} />
        {trip.logistics ? <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{trip.logistics}</p> : null}
        {isEmptyRecord(trip.logistics_details) && !trip.logistics ? <p className="text-[13px] text-muted-foreground">No transport or stay details yet.</p> : null}
      </LogisticsPanel>
      <LogisticsPanel title="Planning context" className="md:col-span-2">
        {trip.already_done ? <p className="whitespace-pre-wrap text-[13px] leading-relaxed"><span className="text-muted-foreground">Already done / avoid repeating — </span>{trip.already_done}</p> : null}
        {trip.preferences ? <p className="whitespace-pre-wrap text-[13px] leading-relaxed"><span className="text-muted-foreground">Preference notes — </span>{trip.preferences}</p> : null}
        {!trip.already_done && !trip.preferences ? <p className="text-[13px] text-muted-foreground">No planning context yet.</p> : null}
      </LogisticsPanel>
    </div>
  );
}

function LogisticsPanel({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return <section className={`flex min-w-0 flex-col gap-2.5 rounded-[14px] bg-muted p-4 [overflow-wrap:anywhere] ${className}`}>
    <h3 className="font-sans text-xs font-bold uppercase tracking-[0.05em] text-muted-foreground">{title}</h3>
    {children}
  </section>;
}

function LogisticsRows({ rows }: { rows: [string, string][] }) {
  return <dl className="flex flex-col gap-2.5">
    {rows.map(([label, value]) => <div key={label} className="flex items-baseline justify-between gap-3 text-[13px]">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>)}
  </dl>;
}

export function TripShareControl({
  tripId,
  tripTitle,
  onError,
}: {
  tripId: string;
  tripTitle: string;
  onError: (error: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const [lastCopiedSlug, setLastCopiedSlug] = useState<string | null>(null);
  const sharesQuery = useQuery({ queryKey: ["trip-shares"], queryFn: fetchTripShares });
  const activeShare = (sharesQuery.data ?? []).find((link) => link.trip_id === tripId && !link.disabled_at);

  const createMutation = useMutation({
    mutationFn: () => createTripShare({ tripId, title: tripTitle }),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["trip-shares"] });
      await copyShareUrl(data.link.public_slug);
      onError(null);
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to create share link"),
  });

  const disableMutation = useMutation({
    mutationFn: (id: string) => disableTripShare(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["trip-shares"] });
      setLastCopiedSlug(null);
      onError(null);
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to disable share link"),
  });

  async function copyShareUrl(slug: string) {
    const url = `${window.location.origin}/trips/shared/${slug}`;
    await navigator.clipboard.writeText(url);
    setLastCopiedSlug(slug);
  }

  const disabled = sharesQuery.isLoading || createMutation.isPending || disableMutation.isPending;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {activeShare ? (
        <>
          <Button
            type="button"
            variant="default"
            size="default"
            disabled={disabled}
            onClick={() => void copyShareUrl(activeShare.public_slug)}
          >
            <Copy className="size-4" aria-hidden />
            {lastCopiedSlug === activeShare.public_slug ? "Copied" : "Copy public link"}
          </Button>
          <Button asChild variant="outline" size="icon" title="Open public trip link">
            <Link href={`/trips/shared/${activeShare.public_slug}`} target="_blank">
              <ExternalLink className="size-4" aria-hidden />
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            title="Disable public trip link"
            aria-label={`Disable public link for ${tripTitle}`}
            onClick={() => {
              if (window.confirm(`Disable public link for "${tripTitle}"? Friends with the link will lose access.`)) {
                void disableMutation.mutateAsync(activeShare.id);
              }
            }}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </>
      ) : (
        <Button
          type="button"
          variant="default"
          size="default"
          disabled={disabled}
          onClick={() => void createMutation.mutateAsync()}
        >
          <Link2 className="size-4" aria-hidden />
          {createMutation.isPending ? "Creating..." : "Share"}
        </Button>
      )}
    </div>
  );
}
