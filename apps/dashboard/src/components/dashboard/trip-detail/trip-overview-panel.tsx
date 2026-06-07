"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Link2, MapPinned, Pencil, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TripPreferencesDialog } from "@/components/dashboard/trip-preferences-dialog";
import { emptyTripPreferenceSuggestions } from "@/components/dashboard/trip-constants";
import { createTripShare, disableTripShare, extractTripLogisticsDetails, fetchTripPreferenceSuggestions, fetchTripShares, updateTrip } from "@/components/dashboard/trip-ops-api";
import { formatTripDuration, groupSelectedPreferences, isEmptyRecord } from "@/components/dashboard/trip-utils";
import { ExtractedLogistics, FieldGroup, LabeledField, SelectedPreferencesList, SummaryGroup, SummaryValue, TripSection } from "@/components/dashboard/trip-detail/trip-detail-shared";
import type { Trip, TripPreferenceSuggestion } from "@/types/database";

export function TripOverview({ trip, onError, onDone }: { trip: Trip; onError: (error: string | null) => void; onDone: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const suggestionsQuery = useQuery({
    queryKey: ["trip-preference-suggestions"],
    queryFn: () => fetchTripPreferenceSuggestions(false),
  });
  const buildDraft = () => ({
    title: trip.title,
    destination: trip.destination,
    start_date: trip.start_date ?? "",
    end_date: trip.end_date ?? "",
    logistics: trip.logistics ?? "",
    adult_count: String(trip.adult_count ?? 0),
    kid_count: String(trip.kid_count ?? 0),
    kid_ages: (trip.kid_ages ?? []).join(", "),
    already_done: trip.already_done ?? "",
    preferences: trip.preferences ?? "",
    selected_preferences: trip.selected_preferences ?? [],
    participants: trip.participants ?? "",
  });
  const [draft, setDraft] = useState(buildDraft);
  const preferenceCatalog = suggestionsQuery.data ?? emptyTripPreferenceSuggestions;
  const draftPreferenceGroups = useMemo(
    () => groupSelectedPreferences(draft.selected_preferences, preferenceCatalog),
    [draft.selected_preferences, preferenceCatalog]
  );
  const mutation = useMutation({
    mutationFn: () => updateTrip(trip.id, {
      ...draft,
      adult_count: Number(draft.adult_count || 0),
      kid_count: Number(draft.kid_count || 0),
      kid_ages: draft.kid_ages.split(/[,\s]+/).filter(Boolean).map((age) => Number(age)),
      start_date: draft.start_date || null,
      end_date: draft.end_date || null,
    }),
    onSuccess: () => {
      onError(null);
      setIsEditing(false);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to save trip"),
  });
  const extractMutation = useMutation({
    mutationFn: () => extractTripLogisticsDetails(trip.id, draft.logistics),
    onSuccess: () => {
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to extract logistics"),
  });

  return (
    <TripSection
      title="Known logistics"
      icon={<MapPinned className="size-4" aria-hidden />}
      className="border-0 pt-0"
      meta={(
        <p className="text-sm text-muted-foreground">
          {formatTripDuration(isEditing ? draft.start_date : trip.start_date ?? "", isEditing ? draft.end_date : trip.end_date ?? "")}
        </p>
      )}
      actions={!isEditing ? (
          <Button type="button" variant="outline" size="sm" onClick={() => {
            setDraft(buildDraft());
            setIsEditing(true);
          }}>
            <Pencil className="size-4" aria-hidden />
            Edit
          </Button>
        ) : null}
    >
        {!isEditing ? (
          <TripLogisticsSummary trip={trip} preferenceCatalog={preferenceCatalog} />
        ) : (
          <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <FieldGroup title="Trip basics">
            <LabeledField label="Trip title" htmlFor="trip-title">
              <Input id="trip-title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
            </LabeledField>
            <LabeledField label="Destination" htmlFor="trip-destination">
              <Input id="trip-destination" value={draft.destination} onChange={(event) => setDraft({ ...draft, destination: event.target.value })} />
            </LabeledField>
            <LabeledField label="Start date" htmlFor="trip-start-date">
              <Input id="trip-start-date" type="date" value={draft.start_date} onChange={(event) => setDraft({ ...draft, start_date: event.target.value })} />
            </LabeledField>
            <LabeledField label="End date" htmlFor="trip-end-date">
              <Input id="trip-end-date" type="date" value={draft.end_date} onChange={(event) => setDraft({ ...draft, end_date: event.target.value })} />
            </LabeledField>
          </FieldGroup>

          <FieldGroup title="Transport and stay">
            <LabeledField label="Logistics notes" htmlFor="trip-logistics" className="md:col-span-2">
              <Textarea id="trip-logistics" value={draft.logistics} onChange={(event) => setDraft({ ...draft, logistics: event.target.value })} placeholder="Ferry, base, car, timing" />
            </LabeledField>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button type="button" variant="outline" onClick={() => extractMutation.mutate()} disabled={extractMutation.isPending || !draft.logistics.trim()}>
                <Sparkles className="size-4" aria-hidden />
                {extractMutation.isPending ? "Extracting..." : "Extract logistics"}
              </Button>
            </div>
            <ExtractedLogistics details={trip.logistics_details} />
          </FieldGroup>

          <FieldGroup title="Participants">
            <LabeledField label="Participant notes" htmlFor="trip-participants" className="md:col-span-2">
              <Textarea id="trip-participants" value={draft.participants} onChange={(event) => setDraft({ ...draft, participants: event.target.value })} placeholder="Names, families, special needs" />
            </LabeledField>
            <LabeledField label="Adults" htmlFor="trip-adults">
              <Input id="trip-adults" type="number" min={0} max={50} value={draft.adult_count} onChange={(event) => setDraft({ ...draft, adult_count: event.target.value })} />
            </LabeledField>
            <LabeledField label="Kids" htmlFor="trip-kids">
              <Input id="trip-kids" type="number" min={0} max={50} value={draft.kid_count} onChange={(event) => setDraft({ ...draft, kid_count: event.target.value })} />
            </LabeledField>
            <LabeledField label="Kid ages" htmlFor="trip-kid-ages" className="md:col-span-2">
              <Input id="trip-kid-ages" value={draft.kid_ages} onChange={(event) => setDraft({ ...draft, kid_ages: event.target.value })} placeholder="Comma separated, e.g. 5, 8" />
            </LabeledField>
          </FieldGroup>

          <FieldGroup title="Planning context">
            <LabeledField label="Already done / avoid repeating" htmlFor="trip-already-done">
              <Textarea id="trip-already-done" value={draft.already_done} onChange={(event) => setDraft({ ...draft, already_done: event.target.value })} placeholder="Places, activities, patterns to avoid" />
            </LabeledField>
            <LabeledField label="Preference notes" htmlFor="trip-preferences">
              <Textarea id="trip-preferences" value={draft.preferences} onChange={(event) => setDraft({ ...draft, preferences: event.target.value })} placeholder="Extra notes that are not covered by selected preferences" />
            </LabeledField>
            <SelectedPreferencesList
              groups={draftPreferenceGroups}
              onRemove={(preference) => {
                setDraft({
                  ...draft,
                  selected_preferences: draft.selected_preferences.filter((item) => item !== preference),
                });
              }}
            />
          </FieldGroup>

          <div className="flex flex-wrap gap-2">
            <TripPreferencesDialog
              selected={draft.selected_preferences}
              onApply={(preferences) => {
                setDraft({
                  ...draft,
                  selected_preferences: preferences,
                });
              }}
            />
            <Button type="button" variant="outline" onClick={() => {
              setDraft(buildDraft());
              setIsEditing(false);
            }}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save logistics"}</Button>
          </div>
          </form>
        )}
    </TripSection>
  );
}

function TripLogisticsSummary({ trip, preferenceCatalog }: { trip: Trip; preferenceCatalog: TripPreferenceSuggestion[] }) {
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
  const preferenceGroups = groupSelectedPreferences(trip.selected_preferences ?? [], preferenceCatalog);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <SummaryGroup title="Trip basics" rows={basics} compact />
      <SummaryGroup
        title="Participants"
        rows={[...participants, ...(trip.participants ? [["Participant notes", trip.participants] as [string, string]] : [])]}
        compact
      />
      <section className="space-y-2 rounded-md border bg-background p-2.5">
        <SelectedPreferencesList groups={preferenceGroups} />
        {preferenceGroups.length === 0 ? <p className="text-sm text-muted-foreground">No selected preferences yet.</p> : null}
      </section>
      <section className="space-y-2 rounded-md border bg-background p-2.5">
        <h3 className="text-sm font-semibold text-muted-foreground">Transport and stay</h3>
        <ExtractedLogistics details={trip.logistics_details} />
        {isEmptyRecord(trip.logistics_details) ? (
          <p className="text-sm text-muted-foreground">No extracted logistics yet.</p>
        ) : null}
      </section>
      <section className="space-y-2 rounded-md border bg-background p-2.5">
        <h3 className="text-sm font-semibold text-muted-foreground">Planning context</h3>
        <div className="grid gap-2">
          {trip.already_done ? <SummaryValue label="Already done / avoid repeating" value={trip.already_done} /> : null}
          {trip.preferences ? <SummaryValue label="Preference notes" value={trip.preferences} /> : null}
        </div>
        {!trip.already_done && !trip.preferences && !trip.selected_preferences?.length ? (
          <p className="text-sm text-muted-foreground">No planning context yet.</p>
        ) : null}
      </section>
    </div>
  );
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
            variant="secondary"
            size="sm"
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
          variant="outline"
          size="sm"
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
