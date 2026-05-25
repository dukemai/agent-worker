"use client";

import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowUp, BookOpenText, Bug, CalendarPlus, Check, CheckCircle2, Circle, ClipboardList, Copy, ExternalLink, Eye, Link2, MapPinned, MoreHorizontal, Pencil, Plus, Sparkles, Star, Trash2, X, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownEditor } from "@/components/dashboard/markdown-editor";
import {
  createTripKnowledge,
  createTripKnowledgeFavorite,
  createTripDecision,
  createTripItineraryItem,
  createTripOption,
  createTripShare,
  createTripTask,
  deleteTripItineraryItem,
  deleteTripKnowledge,
  deleteTripKnowledgeFavorite,
  deleteTripDecision,
  deleteTripOption,
  deleteTripTask,
  disableTripShare,
  extractTripKnowledgeItem,
  extractTripLogisticsDetails,
  fetchTripDetail,
  fetchTripPreferenceSuggestions,
  fetchTripShares,
  generateTripKnowledgeStarterForTrip,
  previewTripOptionsPromptForTrip,
  suggestTripOptionsForTrip,
  updateTripItineraryItem,
  updateTrip,
  updateTripDecision,
  updateTripKnowledge,
  updateTripOption,
} from "@/components/dashboard/trip-ops-api";
import { TripPreferencesDialog } from "@/components/dashboard/trip-preferences-dialog";
import type { Bucket, Task, Trip, TripDecision, TripItineraryBlock, TripItineraryItem, TripKnowledgeFavorite, TripKnowledgeItem, TripOption, TripPreferenceSuggestion } from "@/types/database";

const optionStatuses: TripOption["status"][] = ["maybe", "shortlisted", "planned", "rejected"];
const decisionStatuses: TripDecision["status"][] = ["open", "waiting", "decided"];
const itineraryBlocks: TripItineraryBlock[] = ["morning", "lunch", "afternoon", "backup", "drop_first"];
const emptyTripPreferenceSuggestions: TripPreferenceSuggestion[] = [];

export function TripDetailDashboard({ tripId }: { tripId: string }) {
  const queryClient = useQueryClient();
  const queryKey = ["trip", tripId];
  const detailQuery = useQuery({ queryKey, queryFn: () => fetchTripDetail(tripId) });
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const detail = detailQuery.data;
  const dayCount = useMemo(() => getDayCount(detail?.trip), [detail?.trip]);

  if (detailQuery.isLoading) {
    return <main className="mx-auto w-full max-w-5xl px-4 py-6 text-sm text-muted-foreground">Loading trip...</main>;
  }
  if (detailQuery.isError || !detail) {
    return <main className="mx-auto w-full max-w-5xl px-4 py-6 text-sm text-destructive">Trip could not be loaded.</main>;
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="px-0">
            <Link href="/trips">
              <ArrowLeft className="size-4" aria-hidden />
              Trips
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">{detail.trip.title}</h2>
            <p className="text-sm text-muted-foreground">{detail.trip.destination || "No destination"} · {formatDates(detail.trip)}</p>
          </div>
        </div>
        <TripShareControl tripId={tripId} tripTitle={detail.trip.title} onError={setError} />
      </div>
      {error ? <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}

      <Tabs defaultValue="logistics" className="space-y-5">
        <TabsList className="flex w-full justify-start overflow-x-auto">
          <TabsTrigger value="logistics">Logistics</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
          <TabsTrigger value="options">Options</TabsTrigger>
          <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
          <TabsTrigger value="work">Work</TabsTrigger>
        </TabsList>

        <TabsContent value="logistics">
          <TripOverview trip={detail.trip} onError={setError} onDone={invalidate} />
        </TabsContent>

        <TabsContent value="knowledge">
          <TripKnowledgePanel
            tripId={tripId}
            knowledge={detail.knowledge}
            favorites={detail.knowledge_favorites}
            onError={setError}
            onDone={invalidate}
          />
        </TabsContent>

        <TabsContent value="options">
          <TripOptionsPanel
            tripId={tripId}
            options={detail.options}
            dayCount={dayCount}
            knowledge={detail.knowledge}
            favorites={detail.knowledge_favorites}
            onError={setError}
            onDone={invalidate}
          />
        </TabsContent>

        <TabsContent value="itinerary">
          <TripItineraryPanel
            tripId={tripId}
            dayCount={dayCount}
            startDate={detail.trip.start_date}
            logisticsDetails={detail.trip.logistics_details}
            itinerary={detail.itinerary}
            options={detail.options}
            onError={setError}
            onDone={invalidate}
          />
        </TabsContent>

        <TabsContent value="work" className="space-y-6">
          <TripDecisionsPanel tripId={tripId} decisions={detail.decisions} onError={setError} onDone={invalidate} />
          <TripTasksPanel tasks={detail.tasks} onError={setError} onDone={invalidate} />
        </TabsContent>
      </Tabs>
    </main>
  );
}

function TripOverview({ trip, onError, onDone }: { trip: Trip; onError: (error: string | null) => void; onDone: () => void }) {
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

function TripShareControl({
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

function SummaryGroup({ title, rows, empty, compact = false }: { title: string; rows: [string, string][]; empty?: string; compact?: boolean }) {
  return (
    <section className={`${compact ? "space-y-2 p-2.5" : "space-y-3 p-3"} rounded-md border bg-background`}>
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      {rows.length > 0 ? (
        <div className={compact ? "space-y-2" : "grid gap-3 md:grid-cols-2"}>
          {rows.map(([label, value]) => <SummaryValue key={label} label={label} value={value} />)}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{empty ?? "No information yet."}</p>
      )}
    </section>
  );
}

function TripSection({
  title,
  icon,
  meta,
  actions,
  children,
  className = "",
  contentClassName = "space-y-4",
}: {
  title: ReactNode;
  icon?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={className}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            {icon}
            {title}
          </h2>
          {meta}
        </div>
        {actions}
      </div>
      <div className={`mt-4 ${contentClassName}`}>{children}</div>
    </section>
  );
}

function SummaryValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="whitespace-pre-wrap text-sm">{value}</div>
    </div>
  );
}

type SelectedPreferenceGroup = {
  category: string;
  preferences: string[];
};

function SelectedPreferencesList({
  groups,
  onRemove,
}: {
  groups: SelectedPreferenceGroup[];
  onRemove?: (preference: string) => void;
}) {
  if (groups.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground">Selected preferences</h3>
      <div className="space-y-3">
        {groups.map((group) => (
          <section key={group.category} className="space-y-2">
            <div className="text-xs font-medium capitalize text-muted-foreground">{group.category}</div>
            <ul className="space-y-2">
              {group.preferences.map((preference) => (
                <li key={preference} className="flex items-start justify-between gap-3 text-sm">
                  <span>{preference}</span>
                  {onRemove ? (
                    <button
                      type="button"
                      className="mt-0.5 rounded-full p-0.5 hover:bg-muted"
                      aria-label={`Remove ${preference}`}
                      onClick={() => onRemove(preference)}
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function isEmptyRecord(value: unknown) {
  return !value || typeof value !== "object" || Object.keys(value).length === 0;
}

function ExtractedLogistics({ details }: { details: Record<string, unknown> | null | undefined }) {
  if (!details || Object.keys(details).length === 0) {
    return null;
  }
  const accommodations = getAccommodationLogistics(details);

  const scalarRows = [
    ["Transport", details.transport_mode],
    ["Outbound depart", joinParts(details.outbound_departure_location, details.outbound_departure_time)],
    ["Outbound arrive", joinParts(details.outbound_arrival_location, details.outbound_arrival_time)],
    ["Return depart", joinParts(details.return_departure_location, details.return_departure_time)],
    ["Return arrive", joinParts(details.return_arrival_location, details.return_arrival_time)],
    ["Base area", details.base_area],
    ["Local transport", details.local_transport],
    ["Parking", details.parking_notes],
  ].filter((row): row is [string, string] => typeof row[1] === "string" && row[1].trim().length > 0);

  const listRows = [
    ["Booking refs", details.booking_references],
    ["Links", details.important_links],
    ["Constraints", details.constraints],
    ["Review notes", details.confidence_notes],
  ].filter((row): row is [string, string[]] => Array.isArray(row[1]) && row[1].length > 0);

  if (scalarRows.length === 0 && listRows.length === 0 && accommodations.length === 0) return null;

  return (
    <div className="space-y-3 md:col-span-2">
      {scalarRows.length > 0 ? (
        <dl className="grid gap-2 md:grid-cols-2">
          {scalarRows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
              <dd className="text-sm">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {accommodations.length > 0 ? (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Accommodations</div>
          <div className="space-y-2">
            {accommodations.map((accommodation, index) => (
              <div key={`${accommodation.name ?? "stay"}-${index}`} className="rounded-md bg-muted/30 p-2">
                <div className="text-sm font-medium">{accommodation.name ?? `Accommodation ${index + 1}`}</div>
                <dl className="mt-1 grid gap-1 text-sm md:grid-cols-2">
                  {accommodation.address ? <SummaryValue label="Address" value={accommodation.address} /> : null}
                  {accommodation.area ? <SummaryValue label="Area" value={accommodation.area} /> : null}
                  {formatAccommodationTiming("Check-in", accommodation.check_in_date, accommodation.check_in_time)}
                  {formatAccommodationTiming("Check-out", accommodation.check_out_date, accommodation.check_out_time)}
                  {accommodation.booking_reference ? <SummaryValue label="Booking ref" value={accommodation.booking_reference} /> : null}
                </dl>
                {accommodation.notes ? <p className="mt-1 text-sm text-muted-foreground">{accommodation.notes}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {listRows.map(([label, values]) => (
        <div key={label}>
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <ul className="mt-1 list-inside list-disc text-sm">
            {values.map((value) => <li key={value}>{value}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}

function joinParts(...parts: unknown[]) {
  const text = parts.filter((part): part is string => typeof part === "string" && part.trim().length > 0).join(" · ");
  return text || null;
}

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value;
}

function groupSelectedPreferences(selected: string[], catalog: TripPreferenceSuggestion[]): SelectedPreferenceGroup[] {
  const categoryByPreference = new Map(
    catalog.flatMap((suggestion) => [
      [suggestion.preference_text, suggestion.category],
      [suggestion.label, suggestion.category],
    ])
  );
  const groups = new Map<string, string[]>();

  for (const preference of selected) {
    const category = categoryByPreference.get(preference) ?? "other";
    const current = groups.get(category) ?? [];
    current.push(preference);
    groups.set(category, current);
  }

  return Array.from(groups.entries()).map(([category, preferences]) => ({ category, preferences }));
}

function buildKnowledgeOverview(knowledge: TripKnowledgeItem[], favorites: TripKnowledgeFavorite[]): KnowledgeOverview {
  const places = new Map<string, KnowledgeOverviewItem>();
  const activities = new Map<string, KnowledgeOverviewItem>();
  const favoriteByKey = new Map(favorites.map((favorite) => [getFavoriteKey(favorite.item_type, favorite.name, favorite.area), favorite.id]));

  for (const item of knowledge) {
    if (item.status !== "processed") continue;
    for (const place of getKnowledgePlaceRows(item.extraction?.places)) {
      const area = getCanonicalAreaLabel(place.area);
      mergeOverviewItem(places, {
        itemType: "place",
        name: place.name,
        area,
        meta: joinParts(place.approx_location, place.time_needed),
        detail: place.why,
        sourceTitles: [item.title],
        sourceLinks: getKnowledgeSourceLinks(item),
        favoriteId: favoriteByKey.get(getFavoriteKey("place", place.name, area)) ?? null,
      });
    }
    for (const activity of getKnowledgeActivityRows(item.extraction?.activities)) {
      const area = getCanonicalAreaLabel(activity.area);
      mergeOverviewItem(activities, {
        itemType: "activity",
        name: activity.name,
        area,
        meta: joinParts(activity.happens_at, activity.approx_location, activity.time_needed),
        detail: activity.why,
        sourceTitles: [item.title],
        sourceLinks: getKnowledgeSourceLinks(item),
        favoriteId: favoriteByKey.get(getFavoriteKey("activity", activity.name, area)) ?? null,
      });
    }
  }

  return {
    places: sortOverviewItems(Array.from(places.values())),
    activities: sortOverviewItems(Array.from(activities.values())),
  };
}

function buildKnowledgeStories(knowledge: TripKnowledgeItem[]): KnowledgeStoryItem[] {
  const stories = new Map<string, KnowledgeStoryItem>();

  for (const item of knowledge) {
    if (item.status !== "processed") continue;
    for (const story of getKnowledgeStoryRows(item.extraction?.stories)) {
      const area = getCanonicalAreaLabel(story.area);
      const key = `${normalizeKnowledgeName(story.title)}::${normalizeKnowledgeName(story.related_place ?? "")}`;
      const existing = stories.get(key);
      if (existing) {
        stories.set(key, {
          ...existing,
          summary: existing.summary ?? story.summary,
          story: existing.story ?? story.story,
          why_it_matters: existing.why_it_matters ?? story.why_it_matters,
          what_to_notice: mergeUniqueStrings(existing.what_to_notice, story.what_to_notice),
          good_for: mergeUniqueStrings(existing.good_for, story.good_for),
          sourceTitles: mergeUniqueStrings(existing.sourceTitles, [item.title]),
          sourceLinks: mergeSourceLinks(existing.sourceLinks, getKnowledgeSourceLinks(item)),
        });
      } else {
        stories.set(key, {
          ...story,
          area,
          sourceTitles: [item.title],
          sourceLinks: getKnowledgeSourceLinks(item),
        });
      }
    }
  }

  return Array.from(stories.values()).sort((a, b) => a.area.localeCompare(b.area) || a.title.localeCompare(b.title));
}

const UNKNOWN_AREA_LABEL = "Unknown area";

const GOTLAND_AREA_BUCKETS = [
  {
    label: "Visby",
    aliases: ["visby", "visby old town", "old town", "innerstaden"],
  },
  {
    label: "Fårö",
    aliases: ["faro", "faroe", "farö", "faaroe"],
  },
  {
    label: "North Gotland",
    aliases: ["north gotland", "northern gotland", "north coast", "northern coast", "norra gotland", "north"],
  },
  {
    label: "East coast",
    aliases: ["east coast", "eastern coast", "east gotland", "eastern gotland", "ostkusten", "ostra gotland", "east"],
  },
  {
    label: "South Gotland",
    aliases: ["south gotland", "southern gotland", "south coast", "southern coast", "sodra gotland", "sudret", "south"],
  },
  {
    label: "West coast",
    aliases: ["west coast", "western coast", "west gotland", "western gotland", "vastkusten", "vastra gotland", "west"],
  },
  {
    label: "Inland",
    aliases: ["inland", "central gotland", "middle gotland", "central", "interior"],
  },
] as const;

function getCanonicalAreaLabel(value: string | null | undefined) {
  const normalized = normalizeAreaText(value);
  if (!normalized) return UNKNOWN_AREA_LABEL;

  for (const bucket of GOTLAND_AREA_BUCKETS) {
    if (bucket.aliases.some((alias) => normalized === alias || normalized.includes(alias))) {
      return bucket.label;
    }
  }

  return toTitleCaseArea(value?.trim() ?? UNKNOWN_AREA_LABEL);
}

function mergeOverviewItem(target: Map<string, KnowledgeOverviewItem>, item: KnowledgeOverviewItem) {
  const key = normalizeKnowledgeName(item.name);
  const existing = target.get(key);
  if (!existing) {
    target.set(key, item);
    return;
  }

  existing.area = existing.area === "Unknown area" ? item.area : existing.area;
  existing.meta = existing.meta ?? item.meta;
  existing.detail = existing.detail ?? item.detail;
  existing.favoriteId = existing.favoriteId ?? item.favoriteId;
  existing.sourceTitles = Array.from(new Set([...existing.sourceTitles, ...item.sourceTitles]));
  existing.sourceLinks = mergeSourceLinks(existing.sourceLinks, item.sourceLinks);
}

function sortOverviewItems(items: KnowledgeOverviewItem[]) {
  return items.sort((a, b) => getAreaSortIndex(a.area) - getAreaSortIndex(b.area) || a.area.localeCompare(b.area) || a.name.localeCompare(b.name));
}

function normalizeKnowledgeName(value: string) {
  return value.trim().toLocaleLowerCase("sv-SE");
}

function normalizeAreaText(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLocaleLowerCase("sv-SE")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getAreaSortIndex(area: string) {
  if (area === UNKNOWN_AREA_LABEL) return Number.MAX_SAFE_INTEGER;
  const index = GOTLAND_AREA_BUCKETS.findIndex((bucket) => bucket.label === area);
  return index === -1 ? GOTLAND_AREA_BUCKETS.length : index;
}

function toTitleCaseArea(value: string) {
  return value
    .split(/\s+/)
    .map((part) => part.charAt(0).toLocaleUpperCase("sv-SE") + part.slice(1).toLocaleLowerCase("sv-SE"))
    .join(" ");
}

function getFavoriteKey(itemType: "place" | "activity", name: string, area: string) {
  return `${itemType}:${normalizeKnowledgeName(getCanonicalAreaLabel(area))}:${normalizeKnowledgeName(name)}`;
}

function getKnowledgeSourceLinks(item: TripKnowledgeItem): KnowledgeSourceLink[] {
  const url = normalizeSourceUrl(item.source_url);
  return url ? [{ title: item.title, url }] : [];
}

function normalizeSourceUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
  return null;
}

function mergeSourceLinks(current: KnowledgeSourceLink[], next: KnowledgeSourceLink[]) {
  const links = new Map(current.map((link) => [link.url, link]));
  for (const link of next) {
    links.set(link.url, link);
  }
  return Array.from(links.values());
}

function mergeUniqueStrings(current: string[], next: string[]) {
  return Array.from(new Set([...current, ...next].map((value) => value.trim()).filter(Boolean)));
}

type KnowledgePlaceRow = {
  name: string;
  area: string | null;
  approx_location: string | null;
  why: string | null;
  time_needed: string | null;
};

type KnowledgeActivityRow = {
  name: string;
  happens_at: string | null;
  area: string | null;
  approx_location: string | null;
  why: string | null;
  time_needed: string | null;
};

type KnowledgeStoryRow = {
  title: string;
  story_type: string | null;
  area: string | null;
  related_place: string | null;
  summary: string | null;
  story: string | null;
  why_it_matters: string | null;
  what_to_notice: string[];
  good_for: string[];
};

function getKnowledgePlaceRows(value: unknown): KnowledgePlaceRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): KnowledgePlaceRow | null => {
      if (typeof item === "string") {
        const name = item.trim();
        return name ? { name, area: null, approx_location: null, why: null, time_needed: null } : null;
      }
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const name = getKnowledgeString(record.name);
      if (!name) return null;
      return {
        name,
        area: getKnowledgeString(record.area),
        approx_location: getKnowledgeString(record.approx_location),
        why: getKnowledgeString(record.why),
        time_needed: getKnowledgeString(record.time_needed),
      };
    })
    .filter((item): item is KnowledgePlaceRow => item !== null);
}

function getKnowledgeActivityRows(value: unknown): KnowledgeActivityRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): KnowledgeActivityRow | null => {
      if (typeof item === "string") {
        const name = item.trim();
        return name ? { name, happens_at: null, area: null, approx_location: null, why: null, time_needed: null } : null;
      }
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const name = getKnowledgeString(record.name);
      if (!name) return null;
      return {
        name,
        happens_at: getKnowledgeString(record.happens_at),
        area: getKnowledgeString(record.area),
        approx_location: getKnowledgeString(record.approx_location),
        why: getKnowledgeString(record.why),
        time_needed: getKnowledgeString(record.time_needed),
      };
    })
    .filter((item): item is KnowledgeActivityRow => item !== null);
}

function getKnowledgeStoryRows(value: unknown): KnowledgeStoryRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): KnowledgeStoryRow | null => {
      if (typeof item === "string") {
        const title = item.trim();
        return title
          ? {
              title,
              story_type: null,
              area: null,
              related_place: null,
              summary: null,
              story: null,
              why_it_matters: null,
              what_to_notice: [],
              good_for: [],
            }
          : null;
      }
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const title = getKnowledgeString(record.title);
      if (!title) return null;
      return {
        title,
        story_type: getKnowledgeString(record.story_type),
        area: getKnowledgeString(record.area),
        related_place: getKnowledgeString(record.related_place),
        summary: getKnowledgeString(record.summary),
        story: getKnowledgeString(record.story),
        why_it_matters: getKnowledgeString(record.why_it_matters),
        what_to_notice: getStringArray(record.what_to_notice),
        good_for: getStringArray(record.good_for),
      };
    })
    .filter((item): item is KnowledgeStoryRow => item !== null);
}

function getKnowledgeString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

function LabeledField({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

function TripKnowledgePanel({
  tripId,
  knowledge,
  favorites,
  onError,
  onDone,
}: PanelProps & { knowledge: TripKnowledgeItem[]; favorites: TripKnowledgeFavorite[] }) {
  const [draft, setDraft] = useState({ title: "", source_url: "", raw_markdown: "" });
  const overview = useMemo(() => buildKnowledgeOverview(knowledge, favorites), [knowledge, favorites]);
  const stories = useMemo(() => buildKnowledgeStories(knowledge), [knowledge]);
  const createMutation = useMutation({
    mutationFn: () => createTripKnowledge(tripId, {
      title: draft.title,
      source_url: draft.source_url || null,
      raw_markdown: draft.raw_markdown,
    }),
    onSuccess: () => {
      setDraft({ title: "", source_url: "", raw_markdown: "" });
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to add trip knowledge"),
  });
  const extractMutation = useMutation({
    mutationFn: extractTripKnowledgeItem,
    onSuccess: () => {
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to extract trip knowledge"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Pick<TripKnowledgeItem, "title" | "source_url" | "raw_markdown">> }) =>
      updateTripKnowledge(id, payload),
    onSuccess: () => {
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to update trip knowledge"),
  });
  const starterMutation = useMutation({
    mutationFn: () => generateTripKnowledgeStarterForTrip(tripId),
    onSuccess: () => {
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to generate trip knowledge starter"),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteTripKnowledge,
    onSuccess: () => {
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to delete trip knowledge"),
  });
  const favoriteMutation = useMutation({
    mutationFn: (payload: Pick<TripKnowledgeFavorite, "item_type" | "name" | "area">) =>
      createTripKnowledgeFavorite(tripId, payload),
    onSuccess: () => {
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to save knowledge favorite"),
  });
  const unfavoriteMutation = useMutation({
    mutationFn: deleteTripKnowledgeFavorite,
    onSuccess: () => {
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to remove knowledge favorite"),
  });
  const queuedCount = knowledge.filter((item) => item.status === "queued").length;

  return (
    <TripSection
      title={(
        <>
          Knowledge
          <Badge variant="secondary">{overview.places.length} places</Badge>
          <Badge variant="secondary">{overview.activities.length} activities</Badge>
          <Badge variant="secondary">{stories.length} stories</Badge>
        </>
      )}
      icon={<BookOpenText className="size-4" aria-hidden />}
      className="border-0 pt-0"
      actions={(
        <Button type="button" variant="outline" size="sm" onClick={() => starterMutation.mutate()} disabled={starterMutation.isPending}>
          <Sparkles className="size-4" aria-hidden />
          {starterMutation.isPending ? "Generating..." : "Starter places"}
        </Button>
      )}
      contentClassName=""
    >
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 sm:w-fit">
              <TabsTrigger value="overview">
                Overview
              </TabsTrigger>
              <TabsTrigger value="stories">Stories</TabsTrigger>
              <TabsTrigger value="queue">
                Queue
                <Badge variant="secondary" className="ml-2">{queuedCount > 0 ? `${queuedCount} queued` : knowledge.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {overview.places.length === 0 && overview.activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No refined knowledge yet. Add sources in the queue or generate starter places.</p>
              ) : (
                <TripKnowledgeOverview
                  overview={overview}
                  onFavorite={(item) => favoriteMutation.mutate({ item_type: item.itemType, name: item.name, area: item.area })}
                  onUnfavorite={(favoriteId) => unfavoriteMutation.mutate(favoriteId)}
                  isFavoritePending={favoriteMutation.isPending || unfavoriteMutation.isPending}
                />
              )}
            </TabsContent>

            <TabsContent value="stories" className="space-y-4">
              {stories.length === 0 ? (
                <p className="text-sm text-muted-foreground">No stories yet. Extract knowledge from sources that include history, culture, nature, or local context.</p>
              ) : (
                <TripKnowledgeStories stories={stories} />
              )}
            </TabsContent>

            <TabsContent value="queue" className="space-y-4">
              <form
                className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
                onSubmit={(event) => {
                  event.preventDefault();
                  createMutation.mutate();
                }}
              >
                <div className="space-y-3">
                  <LabeledField label="Title" htmlFor="knowledge-title">
                    <Input
                      id="knowledge-title"
                      value={draft.title}
                      onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Gotland hidden gems"
                    />
                  </LabeledField>
                  <LabeledField label="Source URL" htmlFor="knowledge-source-url">
                    <Input
                      id="knowledge-source-url"
                      value={draft.source_url}
                      onChange={(event) => setDraft((current) => ({ ...current, source_url: event.target.value }))}
                      placeholder="https://..."
                    />
                  </LabeledField>
                </div>
                <LabeledField label="Markdown inspiration" htmlFor="knowledge-raw-markdown">
                  <MarkdownEditor
                    id="knowledge-raw-markdown"
                    value={draft.raw_markdown}
                    onChange={(raw_markdown) => setDraft((current) => ({ ...current, raw_markdown }))}
                    placeholder="Paste notes, guide excerpts, ideas, or source markdown..."
                  />
                </LabeledField>
                <div className="lg:col-span-2">
                  <Button type="submit" disabled={createMutation.isPending}>
                    <Plus className="size-4" aria-hidden />
                    Add knowledge
                  </Button>
                </div>
              </form>

              {knowledge.length === 0 ? <p className="text-sm text-muted-foreground">No trip knowledge yet.</p> : null}
              {knowledge.length > 0 ? (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[52rem] border-collapse text-sm">
                    <thead className="bg-muted/50 text-left text-xs font-medium uppercase text-muted-foreground">
                      <tr>
                        <th className="w-12 px-3 py-2">Status</th>
                        <th className="px-3 py-2">Title</th>
                        <th className="px-3 py-2">Extracted</th>
                        <th className="px-3 py-2">Source</th>
                        <th className="px-3 py-2">Updated</th>
                        <th className="w-12 px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {knowledge.map((item) => (
                        <TripKnowledgeCard
                          key={item.id}
                          item={item}
                          onUpdate={(payload) => updateMutation.mutate({ id: item.id, payload })}
                          onExtract={() => extractMutation.mutate(item.id)}
                          onDelete={() => deleteMutation.mutate(item.id)}
                          isUpdating={updateMutation.isPending}
                          isExtracting={extractMutation.isPending}
                          isDeleting={deleteMutation.isPending}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </TabsContent>
          </Tabs>
      </TripSection>
  );
}

function TripKnowledgeCard({
  item,
  onUpdate,
  onExtract,
  onDelete,
  isUpdating,
  isExtracting,
  isDeleting,
}: {
  item: TripKnowledgeItem;
  onUpdate: (payload: Partial<Pick<TripKnowledgeItem, "title" | "source_url" | "raw_markdown">>) => void;
  onExtract: () => void;
  onDelete: () => void;
  isUpdating: boolean;
  isExtracting: boolean;
  isDeleting: boolean;
}) {
  const [showFull, setShowFull] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({
    title: item.title,
    source_url: item.source_url ?? "",
    raw_markdown: item.raw_markdown,
  });
  const extraction = item.extraction ?? {};
  const summary = typeof extraction.summary === "string" ? extraction.summary : null;
  const places = getKnowledgePlaceRows(extraction.places);
  const activities = getKnowledgeActivityRows(extraction.activities);
  const stories = getKnowledgeStoryRows(extraction.stories);
  const candidateTitles = getStringArray(extraction.candidate_option_titles);
  const extractedSummary = item.status === "queued"
    ? "Not extracted"
    : `${places.length} places · ${activities.length} activities · ${stories.length} stories · ${candidateTitles.length} candidates`;

  function resetDraft() {
    setDraft({
      title: item.title,
      source_url: item.source_url ?? "",
      raw_markdown: item.raw_markdown,
    });
  }

  return (
    <tr className="border-t align-top">
      <td className="px-3 py-3">
        <KnowledgeStatusIcon status={item.status} />
      </td>
      <td className="max-w-[16rem] px-3 py-3">
        <div className="font-medium">{item.title}</div>
        {summary ? <div className="mt-1 text-xs text-muted-foreground">{truncateText(summary, 90)}</div> : null}
        {item.error_message ? <div className="mt-1 text-xs text-destructive">{item.error_message}</div> : null}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{extractedSummary}</td>
      <td className="max-w-[14rem] px-3 py-3">
        {item.source_url ? (
          <a href={item.source_url} target="_blank" rel="noreferrer" className="break-all text-muted-foreground underline-offset-4 hover:underline">
            {truncateText(item.source_url, 42)}
          </a>
        ) : (
          <span className="text-muted-foreground">No source</span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{item.updated_at.slice(0, 10)}</td>
      <td className="px-3 py-3">
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="icon" variant="ghost" aria-label={`Actions for ${item.title}`}>
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Knowledge actions</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => setShowFull(true)}>
                <Eye className="size-4" aria-hidden />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setShowDebug(true)}>
                <Bug className="size-4" aria-hidden />
                Debug
              </DropdownMenuItem>
              {item.status === "queued" ? (
                <DropdownMenuItem onSelect={() => {
                  resetDraft();
                  setIsEditing(true);
                }}>
                  <Pencil className="size-4" aria-hidden />
                  Edit
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem disabled={isExtracting} onSelect={onExtract}>
                <Sparkles className="size-4" aria-hidden />
                {item.status === "processed" ? "Re-extract" : "Extract"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={isDeleting}
                className="text-destructive focus:text-destructive"
                onSelect={onDelete}
              >
                <Trash2 className="size-4" aria-hidden />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
      <Dialog open={isEditing} onOpenChange={(open) => {
        setIsEditing(open);
        if (open) resetDraft();
      }}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit knowledge</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              onUpdate({
                title: draft.title,
                source_url: draft.source_url || null,
                raw_markdown: draft.raw_markdown,
              });
              setIsEditing(false);
            }}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <LabeledField label="Title" htmlFor={`knowledge-edit-title-${item.id}`}>
                <Input
                  id={`knowledge-edit-title-${item.id}`}
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                />
              </LabeledField>
              <LabeledField label="Source URL" htmlFor={`knowledge-edit-source-${item.id}`}>
                <Input
                  id={`knowledge-edit-source-${item.id}`}
                  value={draft.source_url}
                  onChange={(event) => setDraft((current) => ({ ...current, source_url: event.target.value }))}
                />
              </LabeledField>
            </div>
            <LabeledField label="Markdown inspiration" htmlFor={`knowledge-edit-markdown-${item.id}`}>
              <MarkdownEditor
                id={`knowledge-edit-markdown-${item.id}`}
                value={draft.raw_markdown}
                onChange={(raw_markdown) => setDraft((current) => ({ ...current, raw_markdown }))}
                placeholder="Paste notes, guide excerpts, ideas, or source markdown..."
              />
            </LabeledField>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button type="submit" disabled={isUpdating}>{isUpdating ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={showFull} onOpenChange={setShowFull}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{item.title}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            {summary ? <p className="text-sm text-muted-foreground">{summary}</p> : null}
            {places.length > 0 ? (
              <KnowledgeRows
                title="Places"
                rows={places.map((place) => ({
                  title: place.name,
                  meta: joinParts(place.area, place.approx_location, place.time_needed),
                  detail: place.why,
                }))}
              />
            ) : null}
            {activities.length > 0 ? (
              <KnowledgeRows
                title="Activities"
                rows={activities.map((activity) => ({
                  title: activity.name,
                  meta: joinParts(activity.happens_at, activity.area, activity.approx_location, activity.time_needed),
                  detail: activity.why,
                }))}
              />
            ) : null}
            {stories.length > 0 ? (
              <KnowledgeRows
                title="Stories"
                rows={stories.map((story) => ({
                  title: story.title,
                  meta: joinParts(story.story_type?.replace(/_/g, " "), story.related_place, story.area),
                  detail: story.summary ?? story.why_it_matters ?? story.story,
                }))}
              />
            ) : null}
            {candidateTitles.length > 0 ? (
              <div className="space-y-1">
                <div className="text-xs font-medium uppercase text-muted-foreground">Candidate options</div>
                <ul className="space-y-2 text-sm">
                  {candidateTitles.map((title) => (
                    <li key={title} className="rounded-md bg-muted/30 px-3 py-2">{title}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {!summary && places.length === 0 && activities.length === 0 && stories.length === 0 && candidateTitles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No extracted knowledge yet.</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showDebug} onOpenChange={setShowDebug}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Debug: {item.title}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Raw markdown</h3>
              <MarkdownEditor
                id={`knowledge-detail-markdown-${item.id}`}
                value={item.raw_markdown}
                onChange={() => undefined}
                placeholder="No markdown"
                readOnly
              />
            </section>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Extracted data</h3>
              <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(item.extraction ?? {}, null, 2)}
              </pre>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </tr>
  );
}

function KnowledgeStatusIcon({ status }: { status: TripKnowledgeItem["status"] }) {
  if (status === "processed") {
    return (
      <span className="inline-flex size-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700" aria-label="Processed" title="Processed">
        <CheckCircle2 className="size-4" aria-hidden />
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex size-8 items-center justify-center rounded-full bg-destructive/10 text-destructive" aria-label="Failed" title="Failed">
        <XCircle className="size-4" aria-hidden />
      </span>
    );
  }
  return (
    <span className="inline-flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-label="Queued" title="Queued">
      <Circle className="size-4" aria-hidden />
    </span>
  );
}

type KnowledgeOverview = {
  places: KnowledgeOverviewItem[];
  activities: KnowledgeOverviewItem[];
};

type KnowledgeStoryItem = KnowledgeStoryRow & {
  area: string;
  sourceTitles: string[];
  sourceLinks: KnowledgeSourceLink[];
};

type KnowledgeOverviewItem = {
  itemType: "place" | "activity";
  name: string;
  area: string;
  meta: string | null;
  detail: string | null;
  sourceTitles: string[];
  sourceLinks: KnowledgeSourceLink[];
  favoriteId: string | null;
};

type KnowledgeSourceLink = {
  title: string;
  url: string;
};

function TripKnowledgeOverview({
  overview,
  onFavorite,
  onUnfavorite,
  isFavoritePending,
}: {
  overview: KnowledgeOverview;
  onFavorite: (item: KnowledgeOverviewItem) => void;
  onUnfavorite: (favoriteId: string) => void;
  isFavoritePending: boolean;
}) {
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  if (overview.places.length === 0 && overview.activities.length === 0) return null;
  const areaNames = Array.from(new Set([...overview.places, ...overview.activities].map((item) => item.area)));
  const selectedPlaces = selectedArea ? overview.places.filter((item) => item.area === selectedArea) : [];
  const selectedActivities = selectedArea ? overview.activities.filter((item) => item.area === selectedArea) : [];

  return (
    <section className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        {areaNames.map((area) => {
          const places = overview.places.filter((item) => item.area === area);
          const activities = overview.activities.filter((item) => item.area === area);
          const sourceCount = new Set([...places, ...activities].flatMap((item) => item.sourceTitles)).size;
          const favoriteCount = [...places, ...activities].filter((item) => item.favoriteId).length;
          return (
            <section key={area} className="space-y-3 rounded-md border bg-background p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold">{area}</h4>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Badge variant="outline">{places.length} places</Badge>
                    <Badge variant="outline">{activities.length} activities</Badge>
                    <Badge variant="outline">{favoriteCount} favorite{favoriteCount === 1 ? "" : "s"}</Badge>
                    <Badge variant="secondary">{sourceCount} source{sourceCount === 1 ? "" : "s"}</Badge>
                  </div>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => setSelectedArea(area)}>
                  <Eye className="size-4" aria-hidden />
                  View
                </Button>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                {places.slice(0, 3).map((place) => <div key={`place-${place.name}`}>{place.name}</div>)}
                {activities.slice(0, 3).map((activity) => <div key={`activity-${activity.name}`}>{activity.name}</div>)}
              </div>
            </section>
          );
        })}
      </div>
      <Dialog open={selectedArea !== null} onOpenChange={(open) => {
        if (!open) setSelectedArea(null);
      }}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedArea ?? "Area"} knowledge</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            {selectedPlaces.length > 0 ? (
              <OverviewList
                title="Places"
                items={selectedPlaces}
                onFavorite={onFavorite}
                onUnfavorite={onUnfavorite}
                isFavoritePending={isFavoritePending}
              />
            ) : null}
            {selectedActivities.length > 0 ? (
              <OverviewList
                title="Activities"
                items={selectedActivities}
                onFavorite={onFavorite}
                onUnfavorite={onUnfavorite}
                isFavoritePending={isFavoritePending}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function TripKnowledgeStories({ stories }: { stories: KnowledgeStoryItem[] }) {
  const [selectedStory, setSelectedStory] = useState<KnowledgeStoryItem | null>(null);
  const areaNames = Array.from(new Set(stories.map((story) => story.area)));

  return (
    <section className="space-y-4">
      {areaNames.map((area) => {
        const areaStories = stories.filter((story) => story.area === area);
        return (
          <section key={area} className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">{area}</h3>
              <Badge variant="outline">{areaStories.length} stor{areaStories.length === 1 ? "y" : "ies"}</Badge>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {areaStories.map((story) => (
                <article key={`${story.area}-${story.related_place ?? ""}-${story.title}`} className="space-y-2 rounded-md border bg-background p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="font-medium">{story.title}</div>
                      <div className="flex flex-wrap gap-2">
                        {story.story_type ? <Badge variant="outline">{story.story_type.replace(/_/g, " ")}</Badge> : null}
                        {story.related_place ? <Badge variant="secondary">{story.related_place}</Badge> : null}
                      </div>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={() => setSelectedStory(story)}>
                      <Eye className="size-4" aria-hidden />
                      Read
                    </Button>
                  </div>
                  {story.summary ? <p className="text-sm text-muted-foreground">{truncateText(story.summary, 160)}</p> : null}
                  {story.what_to_notice.length > 0 ? (
                    <div className="text-xs text-muted-foreground">Notice: {story.what_to_notice.slice(0, 3).join(", ")}</div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        );
      })}
      <Dialog open={selectedStory !== null} onOpenChange={(open) => {
        if (!open) setSelectedStory(null);
      }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedStory?.title ?? "Story"}</DialogTitle>
          </DialogHeader>
          {selectedStory ? (
            <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{selectedStory.area}</Badge>
                {selectedStory.story_type ? <Badge variant="outline">{selectedStory.story_type.replace(/_/g, " ")}</Badge> : null}
                {selectedStory.related_place ? <Badge variant="outline">{selectedStory.related_place}</Badge> : null}
                {selectedStory.good_for.map((value) => <Badge key={value} variant="outline">{value}</Badge>)}
              </div>
              {selectedStory.summary ? <SummaryValue label="Summary" value={selectedStory.summary} /> : null}
              {selectedStory.story ? <SummaryValue label="Story" value={selectedStory.story} /> : null}
              {selectedStory.why_it_matters ? <SummaryValue label="Why it matters" value={selectedStory.why_it_matters} /> : null}
              {selectedStory.what_to_notice.length > 0 ? (
                <div>
                  <div className="text-xs font-medium text-muted-foreground">What to notice</div>
                  <ul className="mt-1 list-inside list-disc text-sm">
                    {selectedStory.what_to_notice.map((value) => <li key={value}>{value}</li>)}
                  </ul>
                </div>
              ) : null}
              <div className="text-xs text-muted-foreground">
                Sources: {selectedStory.sourceLinks.length > 0 ? (
                  selectedStory.sourceLinks.map((source, index) => (
                    <span key={source.url}>
                      <a className="underline underline-offset-2 hover:text-foreground" href={source.url} target="_blank" rel="noreferrer">
                        {source.title}
                      </a>
                      {index < selectedStory.sourceLinks.length - 1 ? ", " : null}
                    </span>
                  ))
                ) : selectedStory.sourceTitles.join(", ")}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function OverviewList({
  title,
  items,
  onFavorite,
  onUnfavorite,
  isFavoritePending,
}: {
  title: string;
  items: KnowledgeOverviewItem[];
  onFavorite: (item: KnowledgeOverviewItem) => void;
  onUnfavorite: (favoriteId: string) => void;
  isFavoritePending: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase text-muted-foreground">{title}</div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={`${title}-${item.name}`} className="rounded-md bg-muted/30 px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">{item.name}</div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{item.sourceTitles.length} source{item.sourceTitles.length === 1 ? "" : "s"}</Badge>
                <Button
                  type="button"
                  size="sm"
                  variant={item.favoriteId ? "default" : "outline"}
                  onClick={() => item.favoriteId ? onUnfavorite(item.favoriteId) : onFavorite(item)}
                  disabled={isFavoritePending}
                  aria-label={`${item.favoriteId ? "Unfavorite" : "Favorite"} ${item.name}`}
                >
                  <Star className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
            {item.meta ? <div className="text-xs text-muted-foreground">{item.meta}</div> : null}
            {item.detail ? <p className="mt-1 text-muted-foreground">{truncateText(item.detail, 140)}</p> : null}
            <div className="mt-1 flex flex-wrap gap-1 text-xs text-muted-foreground">
              <span>Sources:</span>
              {item.sourceLinks.length > 0 ? (
                item.sourceLinks.map((source, index) => (
                  <span key={source.url}>
                    <a className="underline underline-offset-2 hover:text-foreground" href={source.url} target="_blank" rel="noreferrer">
                      {source.title}
                    </a>
                    {index < item.sourceLinks.length - 1 ? "," : null}
                  </span>
                ))
              ) : (
                <span>{item.sourceTitles.join(", ")}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function KnowledgeRows({ title, rows }: { title: string; rows: { title: string; meta: string | null; detail: string | null }[] }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase text-muted-foreground">{title}</div>
      <ul className="space-y-2 text-sm">
        {rows.map((row) => (
          <li key={`${title}-${row.title}`} className="rounded-md bg-muted/30 px-3 py-2">
            <div className="font-medium">{row.title}</div>
            {row.meta ? <div className="text-xs text-muted-foreground">{row.meta}</div> : null}
            {row.detail ? <div className="mt-1 text-muted-foreground">{row.detail}</div> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TripOptionsPanel({
  tripId,
  options,
  dayCount,
  knowledge,
  favorites,
  onError,
  onDone,
}: PanelProps & { options: TripOption[]; dayCount: number; knowledge: TripKnowledgeItem[]; favorites: TripKnowledgeFavorite[] }) {
  const [title, setTitle] = useState("");
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false);
  const [isKnowledgeDialogOpen, setIsKnowledgeDialogOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<TripOption | null>(null);
  const [planningOption, setPlanningOption] = useState<TripOption | null>(null);
  const [planDraft, setPlanDraft] = useState({ day_number: 1, block: "morning" as TripItineraryBlock, notes: "" });
  const [optionPrompt, setOptionPrompt] = useState("");
  const [statusFilter, setStatusFilter] = useState<TripOption["status"] | "all">("all");
  const knowledgeOverview = useMemo(() => buildKnowledgeOverview(knowledge, favorites), [knowledge, favorites]);
  const knowledgeCandidates = useMemo(
    () => [...knowledgeOverview.places, ...knowledgeOverview.activities],
    [knowledgeOverview]
  );
  const existingOptionTitles = useMemo(
    () => new Set(options.map((option) => normalizeKnowledgeName(option.title))),
    [options]
  );
  const optionStatusCounts = useMemo(
    () => Object.fromEntries(optionStatuses.map((status) => [status, options.filter((option) => option.status === status).length])) as Record<TripOption["status"], number>,
    [options]
  );
  const visibleOptions = statusFilter === "all" ? options : options.filter((option) => option.status === statusFilter);
  const createMutation = useMutation({
    mutationFn: (payload: Partial<TripOption> & { title: string }) => createTripOption(tripId, payload),
    onSuccess: (_, payload) => {
      setTitle("");
      if (payload.notes?.startsWith("Created from trip knowledge")) setIsKnowledgeDialogOpen(false);
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to add option"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TripOption["status"] }) => updateTripOption(id, { status }),
    onSuccess: () => onDone(),
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to update option"),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteTripOption,
    onSuccess: () => onDone(),
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to delete option"),
  });
  const promptPreviewMutation = useMutation({
    mutationFn: () => previewTripOptionsPromptForTrip(tripId),
    onSuccess: (prompt) => {
      setOptionPrompt(prompt);
      onError(null);
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to build option prompt"),
  });
  const suggestMutation = useMutation({
    mutationFn: () => suggestTripOptionsForTrip(tripId, optionPrompt),
    onSuccess: (newOptions) => {
      onError(null);
      if (newOptions.length === 0) {
        onError("No new option suggestions were returned.");
      }
      setIsPromptDialogOpen(false);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to suggest options"),
  });
  const planMutation = useMutation({
    mutationFn: async ({ option, draft }: { option: TripOption; draft: typeof planDraft }) => {
      await createTripItineraryItem(tripId, {
        title: option.title,
        day_number: draft.day_number,
        block: draft.block,
        option_id: option.id,
        notes: draft.notes || null,
      });
      if (option.status !== "planned") {
        await updateTripOption(option.id, { status: "planned" });
      }
    },
    onSuccess: () => {
      setPlanningOption(null);
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to plan option"),
  });
  const taskMutation = useTripTaskMutation(tripId, onError, onDone);

  function openPlanDialog(option: TripOption) {
    setPlanDraft({
      day_number: 1,
      block: getDefaultItineraryBlock(option),
      notes: buildDefaultPlanNotes(option),
    });
    setPlanningOption(option);
  }

  return (
    <TripSection
      title={(
        <>
          Options
          <Badge variant="secondary">{options.length === 1 ? "1 option" : `${options.length} options`}</Badge>
        </>
      )}
      className="border-0 pt-0"
      meta={(
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant={statusFilter === "all" ? "default" : "outline"} onClick={() => setStatusFilter("all")}>
            all: {options.length}
          </Button>
          {optionStatuses.map((status) => (
            <Button key={status} type="button" size="sm" variant={statusFilter === status ? "default" : "outline"} onClick={() => setStatusFilter(status)} disabled={optionStatusCounts[status] === 0}>
              {status}: {optionStatusCounts[status]}
            </Button>
          ))}
        </div>
      )}
      actions={(
        <Button type="button" variant="outline" size="sm" onClick={() => {
            setIsPromptDialogOpen(true);
            promptPreviewMutation.mutate();
          }} disabled={promptPreviewMutation.isPending || suggestMutation.isPending}>
          <Sparkles className="size-4" aria-hidden />
          {promptPreviewMutation.isPending ? "Building..." : "Suggest options"}
        </Button>
      )}
      contentClassName="space-y-3"
    >
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate({ title, option_type: "activity", status: "maybe" });
          }}
        >
          <Input className="min-w-64 flex-1" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add activity, food stop, backup..." aria-label="Option title" />
          <Button type="submit" size="icon" disabled={createMutation.isPending} aria-label="Add option">
            <Plus className="size-4" aria-hidden />
          </Button>
          <Button type="button" variant="outline" onClick={() => setIsKnowledgeDialogOpen(true)}>
            <BookOpenText className="size-4" aria-hidden />
            From knowledge
          </Button>
        </form>
        {options.length === 0 ? <p className="text-sm text-muted-foreground">Create your first option or add one from knowledge.</p> : null}
        {options.length > 0 && visibleOptions.length === 0 ? <p className="text-sm text-muted-foreground">No options match this status.</p> : null}
        {visibleOptions.map((option) => (
          <div key={option.id} className={getOptionCardClassName(option.status)}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-medium">{option.title}</div>
                <div className="text-sm text-muted-foreground">{option.best_for || option.option_type}</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {option.location ? <Badge variant="secondary">{option.location}</Badge> : null}
                  <Badge variant="outline">{option.option_type}</Badge>
                </div>
              </div>
              <Badge variant={option.status === "planned" || option.status === "shortlisted" ? "default" : "outline"}>{option.status}</Badge>
            </div>
            {option.why ? <p className="text-sm text-muted-foreground">{option.why}</p> : null}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Status</span>
                {optionStatuses.map((status) => (
                  <Button key={status} type="button" size="sm" variant={option.status === status ? "default" : "outline"} onClick={() => updateMutation.mutate({ id: option.id, status })}>
                    {status}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Actions</span>
                <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedOption(option)}>
                  <Eye className="size-4" aria-hidden />
                  View
                </Button>
                <Button type="button" size="sm" variant={option.status === "shortlisted" ? "outline" : "ghost"} onClick={() => openPlanDialog(option)}>
                  <CalendarPlus className="size-4" aria-hidden />
                  Plan
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => taskMutation.mutate({ title: `Check ${option.title}`, bucket: "this_week", category: "research", original_body: option.why, source_item_id: option.id, source_item_type: "option" })}
                >
                  <ClipboardList className="size-4" aria-hidden />
                  Task
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate(option.id)}
                  disabled={deleteMutation.isPending}
                  aria-label={`Delete ${option.title}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
          </div>
        ))}
      <Dialog open={isPromptDialogOpen} onOpenChange={setIsPromptDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Review option prompt</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={optionPrompt}
              onChange={(event) => setOptionPrompt(event.target.value)}
              className="min-h-[26rem] font-mono text-xs"
              placeholder={promptPreviewMutation.isPending ? "Building prompt..." : "Prompt will appear here."}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => promptPreviewMutation.mutate()} disabled={promptPreviewMutation.isPending || suggestMutation.isPending}>
                {promptPreviewMutation.isPending ? "Refreshing..." : "Refresh prompt"}
              </Button>
              <Button type="button" onClick={() => suggestMutation.mutate()} disabled={suggestMutation.isPending || optionPrompt.trim().length === 0}>
                <Sparkles className="size-4" aria-hidden />
                {suggestMutation.isPending ? "Generating..." : "Generate options"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isKnowledgeDialogOpen} onOpenChange={setIsKnowledgeDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Select from knowledge</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            {knowledgeCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No processed places or activities yet.</p>
            ) : (
              knowledgeCandidates.map((item) => {
                const alreadyAdded = existingOptionTitles.has(normalizeKnowledgeName(item.name));
                return (
                  <div key={`${item.itemType}-${item.area}-${item.name}`} className="space-y-2 rounded-md border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium">{item.name}</div>
                          <Badge variant="outline">{item.itemType}</Badge>
                          <Badge variant="secondary">{item.area}</Badge>
                          {item.favoriteId ? <Badge variant="default">favorite</Badge> : null}
                        </div>
                        {item.meta ? <div className="text-xs text-muted-foreground">{item.meta}</div> : null}
                        {item.detail ? <p className="text-sm text-muted-foreground">{truncateText(item.detail, 180)}</p> : null}
                        <div className="text-xs text-muted-foreground">Sources: {item.sourceTitles.join(", ")}</div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => createMutation.mutate(buildOptionFromKnowledgeItem(item))}
                        disabled={createMutation.isPending || alreadyAdded}
                      >
                        <Plus className="size-4" aria-hidden />
                        {alreadyAdded ? "Added" : "Add option"}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
      <OptionDetailDialog option={selectedOption} onOpenChange={(open) => {
        if (!open) setSelectedOption(null);
      }} />
      <Dialog open={planningOption !== null} onOpenChange={(open) => {
        if (!open) setPlanningOption(null);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Plan option</DialogTitle>
          </DialogHeader>
          {planningOption ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                planMutation.mutate({ option: planningOption, draft: planDraft });
              }}
            >
              <div className="space-y-1">
                <div className="font-medium">{planningOption.title}</div>
                <div className="flex flex-wrap gap-2">
                  {planningOption.location ? <Badge variant="secondary">{planningOption.location}</Badge> : null}
                  <Badge variant="outline">{planningOption.option_type}</Badge>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                <LabeledField label="Day" htmlFor="option-plan-day">
                  <Input
                    id="option-plan-day"
                    type="number"
                    min={1}
                    max={Math.max(1, dayCount)}
                    value={planDraft.day_number}
                    onChange={(event) => setPlanDraft((current) => ({ ...current, day_number: Number(event.target.value) }))}
                  />
                </LabeledField>
                <LabeledField label="Block" htmlFor="option-plan-block">
                  <Select value={planDraft.block} onValueChange={(value) => setPlanDraft((current) => ({ ...current, block: value as TripItineraryBlock }))}>
                    <SelectTrigger id="option-plan-block"><SelectValue /></SelectTrigger>
                    <SelectContent>{itineraryBlocks.map((block) => <SelectItem key={block} value={block}>{block}</SelectItem>)}</SelectContent>
                  </Select>
                </LabeledField>
              </div>
              <LabeledField label="Notes" htmlFor="option-plan-notes">
                <Textarea
                  id="option-plan-notes"
                  value={planDraft.notes}
                  onChange={(event) => setPlanDraft((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Timing, pairing, source reminders..."
                />
              </LabeledField>
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPlanningOption(null)}>Cancel</Button>
                <Button type="submit" disabled={planMutation.isPending}>
                  <CalendarPlus className="size-4" aria-hidden />
                  {planMutation.isPending ? "Planning..." : "Add to itinerary"}
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </TripSection>
  );
}

function OptionDetailDialog({ option, onOpenChange }: { option: TripOption | null; onOpenChange: (open: boolean) => void }) {
  const sourceLinks = useMemo(() => extractLinksFromText(option?.notes), [option?.notes]);

  return (
    <Dialog open={option !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{option?.title ?? "Option detail"}</DialogTitle>
        </DialogHeader>
        {option ? (
          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            <div className="flex flex-wrap gap-2">
              <Badge variant={option.status === "planned" ? "default" : "outline"}>{option.status}</Badge>
              <Badge variant="secondary">{option.option_type}</Badge>
              {option.location ? <Badge variant="outline">{option.location}</Badge> : null}
              {option.booking_needed ? <Badge variant="outline">booking needed</Badge> : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {option.effort ? <SummaryValue label="Effort" value={option.effort} /> : null}
              {option.weather_fit ? <SummaryValue label="Weather fit" value={option.weather_fit} /> : null}
              {option.kid_fit ? <SummaryValue label="Kid fit" value={option.kid_fit} /> : null}
            </div>
            {option.best_for ? <SummaryValue label="Best for" value={option.best_for} /> : null}
            {option.why ? <SummaryValue label="Why" value={option.why} /> : null}
            {option.notes ? <SummaryValue label="Notes" value={option.notes} /> : null}
            {sourceLinks.length > 0 ? (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Source links</div>
                <ul className="space-y-1 text-sm">
                  {sourceLinks.map((url) => (
                    <li key={url}>
                      <a className="break-all underline underline-offset-2 hover:text-foreground" href={url} target="_blank" rel="noreferrer">
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function getOptionCardClassName(status: TripOption["status"]) {
  const base = "space-y-3 rounded-md border p-3";
  if (status === "planned") return `${base} border-primary bg-primary/5 shadow-sm`;
  if (status === "shortlisted") return `${base} border-primary/60 bg-muted/40 shadow-sm`;
  return base;
}

function getDefaultItineraryBlock(option: TripOption): TripItineraryBlock {
  if (option.option_type === "food") return "lunch";
  if (option.option_type === "rainy_day") return "backup";
  if (option.option_type === "logistics") return "morning";
  return option.effort === "high" ? "morning" : "afternoon";
}

function buildDefaultPlanNotes(option: TripOption) {
  return [
    option.location ? `Location: ${option.location}` : null,
    option.best_for ? `Best for: ${option.best_for}` : null,
    option.why ? `Why: ${option.why}` : null,
    option.notes,
  ].filter((line): line is string => Boolean(line)).join("\n\n");
}

function buildManualItineraryNotes(location: string, notes: string) {
  const trimmedLocation = location.trim();
  const trimmedNotes = notes.trim();
  return [
    trimmedLocation ? `Location: ${trimmedLocation}` : null,
    trimmedNotes || null,
  ].filter((line): line is string => Boolean(line)).join("\n\n") || null;
}

function buildOptionItineraryNotes(option: TripOption, notes: string) {
  const baseNotes = buildDefaultPlanNotes(option);
  const trimmedNotes = notes.trim();
  return [baseNotes || null, trimmedNotes || null].filter((line): line is string => Boolean(line)).join("\n\n") || null;
}

function buildLogisticsPresetNotes(payload: ItineraryPresetDraft) {
  return [
    payload.time.trim() ? `Time: ${payload.time.trim()}` : null,
    payload.location.trim() ? `Location: ${payload.location.trim()}` : null,
    payload.notes.trim() || null,
  ].filter((line): line is string => Boolean(line)).join("\n\n") || null;
}

function buildLogisticsPresetDraft(
  kind: ItineraryPresetKind,
  dayCount: number,
  startDate: string | null,
  details: Record<string, unknown> | null,
  accommodation?: AccommodationLogistics
): ItineraryPresetDraft {
  const arrival = kind === "arrival";
  const departure = kind === "departure";
  const checkIn = kind === "check_in";
  const notes = arrival
    ? [
        getLogisticsLine("Transport", details?.transport_mode),
        getLogisticsLine("Depart from", joinParts(details?.outbound_departure_location, details?.outbound_departure_time)),
        getLogisticsLine("Arrive at", joinParts(details?.outbound_arrival_location, details?.outbound_arrival_time)),
        getLogisticsListLine("Booking refs", details?.booking_references),
        getLogisticsListLine("Links", details?.important_links),
        getLogisticsListLine("Constraints", details?.constraints),
      ]
    : departure
      ? [
        getLogisticsLine("Transport", details?.transport_mode),
        getLogisticsLine("Depart from", joinParts(details?.return_departure_location, details?.return_departure_time)),
        getLogisticsLine("Arrive at", joinParts(details?.return_arrival_location, details?.return_arrival_time)),
        getLogisticsLine("Parking", details?.parking_notes),
        getLogisticsListLine("Booking refs", details?.booking_references),
        getLogisticsListLine("Links", details?.important_links),
        getLogisticsListLine("Constraints", details?.constraints),
      ]
      : [
        getLogisticsLine("Accommodation", joinParts(accommodation?.name, accommodation?.address)),
        getLogisticsLine("Area", accommodation?.area),
        getLogisticsLine(checkIn ? "Check-in" : "Check-out", joinParts(checkIn ? accommodation?.check_in_date : accommodation?.check_out_date, checkIn ? accommodation?.check_in_time : accommodation?.check_out_time)),
        getLogisticsLine("Booking ref", accommodation?.booking_reference),
        getLogisticsLine("Notes", accommodation?.notes),
      ];
  const accommodationDate = checkIn ? accommodation?.check_in_date : accommodation?.check_out_date;
  const accommodationDay = getTripDayFromDate(startDate, accommodationDate);

  return {
    kind,
    title: getPresetTitle(kind, accommodation),
    day_number: arrival ? 1 : departure ? dayCount : Math.min(dayCount, Math.max(1, accommodationDay ?? (checkIn ? 1 : dayCount))),
    block: arrival ? "morning" : departure ? "drop_first" : checkIn ? "afternoon" : "morning",
    time: getLogisticsString(arrival ? details?.outbound_arrival_time : departure ? details?.return_departure_time : checkIn ? accommodation?.check_in_time : accommodation?.check_out_time) ?? "",
    location: getLogisticsString(arrival ? details?.outbound_arrival_location : departure ? details?.return_departure_location : accommodation?.address) ?? getLogisticsString(accommodation?.area) ?? getLogisticsString(details?.base_area) ?? "",
    notes: notes.filter((line): line is string => Boolean(line)).join("\n"),
  };
}

function getPresetTitle(kind: ItineraryPresetKind, accommodation?: AccommodationLogistics) {
  if (kind === "arrival") return "Arrival";
  if (kind === "departure") return "Departure";
  const stay = accommodation?.name?.trim();
  return `${kind === "check_in" ? "Check-in" : "Check-out"}${stay ? `: ${stay}` : ""}`;
}

function getLogisticsLine(label: string, value: unknown) {
  const text = getLogisticsString(value);
  return text ? `${label}: ${text}` : null;
}

function getLogisticsListLine(label: string, value: unknown) {
  if (!Array.isArray(value)) return null;
  const values = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return values.length > 0 ? `${label}: ${values.join(", ")}` : null;
}

function getLogisticsString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getAccommodationLogistics(details: Record<string, unknown> | null | undefined): AccommodationLogistics[] {
  if (!details) return [];
  const rows = Array.isArray(details.accommodations)
    ? details.accommodations
        .map((item) => normalizeAccommodationLogistics(item))
        .filter((item): item is AccommodationLogistics => item !== null)
    : [];
  if (rows.length > 0) return rows;
  const fallback = normalizeAccommodationLogistics({
    name: details.accommodation_name,
    address: details.accommodation_address,
    area: details.base_area,
    check_in_time: details.check_in_time,
    check_out_time: details.check_out_time,
    booking_reference: Array.isArray(details.booking_references) ? details.booking_references[0] : null,
  });
  return fallback ? [fallback] : [];
}

function normalizeAccommodationLogistics(value: unknown): AccommodationLogistics | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const accommodation = {
    name: getLogisticsString(row.name),
    address: getLogisticsString(row.address),
    area: getLogisticsString(row.area),
    check_in_date: getLogisticsString(row.check_in_date),
    check_in_time: getLogisticsString(row.check_in_time),
    check_out_date: getLogisticsString(row.check_out_date),
    check_out_time: getLogisticsString(row.check_out_time),
    booking_reference: getLogisticsString(row.booking_reference),
    notes: getLogisticsString(row.notes),
  };
  return Object.values(accommodation).some(Boolean) ? accommodation : null;
}

function formatAccommodationTiming(label: string, date: string | null, time: string | null) {
  const value = joinParts(date, time);
  return value ? <SummaryValue label={label} value={value} /> : null;
}

function getItineraryNoteField(notes: string | null, field: string) {
  return notes?.match(new RegExp(`^${field}:\\s*(.+)$`, "im"))?.[1]?.trim() ?? null;
}

function getItineraryAnchorLocation(item: TripItineraryItem, option: TripOption | null) {
  const noteLocation = getItineraryNoteField(item.notes, "Location");
  if (noteLocation) return noteLocation;
  if (option?.location) return option.location;
  return noteLocation || null;
}

function setLocationInNotes(notes: string | null, location: string) {
  const trimmedLocation = location.trim();
  const remainingNotes = (notes ?? "")
    .split("\n")
    .filter((line) => !/^Location:\s*/i.test(line.trim()))
    .join("\n")
    .trim();

  return [
    trimmedLocation ? `Location: ${trimmedLocation}` : null,
    remainingNotes || null,
  ].filter((line): line is string => Boolean(line)).join("\n\n") || null;
}

function getFollowupOptions({
  anchor,
  area,
  options,
  plannedOptionIds,
}: {
  anchor: TripOption | null;
  area: string | null;
  options: TripOption[];
  plannedOptionIds: Set<string>;
}) {
  if (!area) return [];
  const areaKey = normalizeAreaText(area);
  return options
    .filter((option) => option.id !== anchor?.id)
    .filter((option) => !plannedOptionIds.has(option.id))
    .filter((option) => isAreaMatch(option.location, areaKey))
    .sort(compareFollowupOptions);
}

function isAreaMatch(location: string | null, areaKey: string) {
  const locationKey = normalizeAreaText(location);
  return locationKey === areaKey || locationKey.includes(areaKey) || areaKey.includes(locationKey);
}

function compareFollowupOptions(a: TripOption, b: TripOption) {
  return getFollowupOptionRank(a) - getFollowupOptionRank(b) || a.title.localeCompare(b.title);
}

function getFollowupOptionRank(option: TripOption) {
  if (option.status === "shortlisted") return 0;
  if (option.option_type === "food") return 1;
  if (option.option_type === "rainy_day") return 2;
  if (option.status === "maybe") return 3;
  return 4;
}

function sortItineraryItems(items: TripItineraryItem[]) {
  return [...items].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
}

function getSortOrderForPosition(position: string, dayItems: TripItineraryItem[]) {
  if (dayItems.length === 0) return 10;
  if (position === "start") return dayItems[0].sort_order - 10;
  if (position.startsWith("after:")) {
    const id = position.slice("after:".length);
    const index = dayItems.findIndex((item) => item.id === id);
    if (index >= 0) {
      const current = dayItems[index];
      const next = dayItems[index + 1];
      return next ? Math.round((current.sort_order + next.sort_order) / 2) : current.sort_order + 10;
    }
  }
  return dayItems[dayItems.length - 1].sort_order + 10;
}

function extractLinksFromText(value: string | null | undefined) {
  const matches = value?.match(/https?:\/\/[^\s)]+/g) ?? [];
  return Array.from(new Set(matches.map((match) => match.replace(/[.,;:]+$/, ""))));
}

function buildOptionFromKnowledgeItem(item: KnowledgeOverviewItem): Partial<TripOption> & { title: string } {
  const sourceLines = item.sourceLinks.length > 0
    ? item.sourceLinks.map((source) => `- ${source.title}: ${source.url}`)
    : item.sourceTitles.map((title) => `- ${title}`);

  return {
    title: item.name,
    option_type: item.itemType === "activity" ? "activity" : "scenic_stop",
    status: "maybe",
    location: item.area,
    best_for: item.favoriteId ? "Favorite from knowledge" : `From ${item.area} knowledge`,
    why: item.detail ?? `Candidate from ${item.area} trip knowledge.`,
    notes: [
      "Created from trip knowledge.",
      item.meta ? `Context: ${item.meta}` : null,
      sourceLines.length > 0 ? ["Sources:", ...sourceLines].join("\n") : null,
    ].filter((line): line is string => Boolean(line)).join("\n\n"),
  };
}

function TripDecisionsPanel({ tripId, decisions, onError, onDone }: PanelProps & { decisions: TripDecision[] }) {
  const [title, setTitle] = useState("");
  const createMutation = useMutation({
    mutationFn: () => createTripDecision(tripId, { title, status: "open" }),
    onSuccess: () => {
      setTitle("");
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to add decision"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TripDecision["status"] }) => updateTripDecision(id, { status }),
    onSuccess: () => onDone(),
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to update decision"),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteTripDecision,
    onSuccess: () => onDone(),
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to delete decision"),
  });
  const taskMutation = useTripTaskMutation(tripId, onError, onDone);

  return (
    <TripSection title="Decisions" className="border-0 pt-0" contentClassName="space-y-3">
        <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); createMutation.mutate(); }}>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Decision to make..." aria-label="Decision title" />
          <Button type="submit" size="icon" disabled={createMutation.isPending} aria-label="Add decision">
            <Plus className="size-4" aria-hidden />
          </Button>
        </form>
        {decisions.length === 0 ? <p className="text-sm text-muted-foreground">No open decisions.</p> : null}
        {decisions.map((decision) => (
          <div key={decision.id} className="space-y-3 rounded-md border p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium">{decision.title}</div>
                <div className="text-sm text-muted-foreground">{decision.owner || "No owner"} {decision.due_date ? `· ${decision.due_date}` : ""}</div>
              </div>
              <Badge variant={decision.status === "decided" ? "default" : "outline"}>{decision.status}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {decisionStatuses.map((status) => (
                <Button key={status} type="button" size="sm" variant={decision.status === status ? "default" : "outline"} onClick={() => updateMutation.mutate({ id: decision.id, status })}>
                  {status === "decided" ? <Check className="size-4" aria-hidden /> : null}
                  {status}
                </Button>
              ))}
              <Button type="button" size="sm" variant="ghost" onClick={() => taskMutation.mutate({ title: decision.title, bucket: "this_week", category: "other", source_item_id: decision.id, source_item_type: "decision" })}>
                <ClipboardList className="size-4" aria-hidden />
                Task
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => deleteMutation.mutate(decision.id)}
                disabled={deleteMutation.isPending}
                aria-label={`Delete ${decision.title}`}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        ))}
    </TripSection>
  );
}

function TripItineraryPanel({
  tripId,
  dayCount,
  startDate,
  logisticsDetails,
  itinerary,
  options,
  onError,
  onDone,
}: PanelProps & { dayCount: number; startDate: string | null; logisticsDetails: Record<string, unknown> | null; itinerary: TripItineraryItem[]; options: TripOption[] }) {
  const [draft, setDraft] = useState({ title: "", day_number: 1, block: "morning" as TripItineraryBlock, option_id: "custom", notes: "", position: "end" });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [movingItem, setMovingItem] = useState<TripItineraryItem | null>(null);
  const [followupItem, setFollowupItem] = useState<TripItineraryItem | null>(null);
  const [detailItem, setDetailItem] = useState<TripItineraryItem | null>(null);
  const [followupAreaOverride, setFollowupAreaOverride] = useState("");
  const [presetDraft, setPresetDraft] = useState<ItineraryPresetDraft | null>(null);
  const [moveDraft, setMoveDraft] = useState({ day_number: 1, block: "morning" as TripItineraryBlock, location: "" });
  const optionById = useMemo(() => new Map(options.map((option) => [option.id, option])), [options]);
  const accommodations = useMemo(() => getAccommodationLogistics(logisticsDetails), [logisticsDetails]);
  const plannedOptionIds = useMemo(
    () => new Set(itinerary.map((item) => item.option_id).filter((id): id is string => typeof id === "string" && id.length > 0)),
    [itinerary]
  );
  const selectedDayItems = useMemo(() => sortItineraryItems(itinerary.filter((item) => item.day_number === draft.day_number)), [draft.day_number, itinerary]);
  const selectedOption = draft.option_id === "custom" ? null : optionById.get(draft.option_id) ?? null;
  const createMutation = useMutation({
    mutationFn: async () => {
      await createTripItineraryItem(tripId, {
        title: draft.title || selectedOption?.title || "",
        day_number: draft.day_number,
        block: draft.block,
        option_id: selectedOption?.id ?? null,
        notes: selectedOption ? buildOptionItineraryNotes(selectedOption, draft.notes) : buildManualItineraryNotes("", draft.notes),
        sort_order: getSortOrderForPosition(draft.position, selectedDayItems),
      });
      if (selectedOption && selectedOption.status !== "planned") {
        await updateTripOption(selectedOption.id, { status: "planned" });
      }
    },
    onSuccess: () => {
      setDraft({ ...draft, title: "", option_id: "custom", notes: "", position: "end" });
      setIsAddDialogOpen(false);
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to add itinerary item"),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteTripItineraryItem,
    onSuccess: () => {
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to delete itinerary item"),
  });
  const moveMutation = useMutation({
    mutationFn: ({ item, payload }: { item: TripItineraryItem; payload: typeof moveDraft }) =>
      updateTripItineraryItem(item.id, {
        day_number: payload.day_number,
        block: payload.block,
        notes: setLocationInNotes(item.notes, payload.location),
      }),
    onSuccess: () => {
      setMovingItem(null);
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to move itinerary item"),
  });
  const reorderMutation = useMutation({
    mutationFn: async ({ item, direction }: { item: TripItineraryItem; direction: "up" | "down" }) => {
      const dayItems = sortItineraryItems(itinerary.filter((candidate) => candidate.day_number === item.day_number));
      const currentIndex = dayItems.findIndex((candidate) => candidate.id === item.id);
      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= dayItems.length) return;
      const nextItems = [...dayItems];
      [nextItems[currentIndex], nextItems[targetIndex]] = [nextItems[targetIndex], nextItems[currentIndex]];
      await Promise.all(nextItems.map((candidate, index) => updateTripItineraryItem(candidate.id, { sort_order: (index + 1) * 10 })));
    },
    onSuccess: () => {
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to reorder itinerary item"),
  });
  const followupMutation = useMutation({
    mutationFn: async ({ option, anchor }: { option: TripOption; anchor: TripItineraryItem }) => {
      await createTripItineraryItem(tripId, {
        title: option.title,
        day_number: anchor.day_number,
        block: getDefaultItineraryBlock(option),
        option_id: option.id,
        notes: buildDefaultPlanNotes(option),
      });
      if (option.status !== "planned") {
        await updateTripOption(option.id, { status: "planned" });
      }
    },
    onSuccess: () => {
      setFollowupItem(null);
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to add follow-up option"),
  });
  const presetMutation = useMutation({
    mutationFn: (payload: ItineraryPresetDraft) => createTripItineraryItem(tripId, {
      title: payload.title,
      day_number: payload.day_number,
      block: payload.block,
      notes: buildLogisticsPresetNotes(payload),
      sort_order: payload.kind === "arrival" ? -100 : payload.kind === "departure" ? 1000 : payload.kind === "check_in" ? 5 : 900,
    }),
    onSuccess: () => {
      setPresetDraft(null);
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to add logistics block"),
  });

  function openMoveDialog(item: TripItineraryItem) {
    setMoveDraft({
      day_number: item.day_number,
      block: item.block,
      location: getItineraryAnchorLocation(item, optionById.get(item.option_id ?? "") ?? null) ?? "",
    });
    setMovingItem(item);
  }

  function openPresetDialog(kind: ItineraryPresetKind, accommodation?: AccommodationLogistics) {
    setPresetDraft(buildLogisticsPresetDraft(kind, dayCount, startDate, logisticsDetails, accommodation));
  }

  const followupAnchor = followupItem ? optionById.get(followupItem.option_id ?? "") ?? null : null;
  const inferredFollowupArea = followupItem ? getItineraryAnchorLocation(followupItem, followupAnchor) : null;
  const followupArea = followupAreaOverride.trim() || inferredFollowupArea;
  const followupOptions = followupItem
    ? getFollowupOptions({
        anchor: followupAnchor,
        area: followupArea,
        options,
        plannedOptionIds,
      })
    : [];
  const detailOption = detailItem ? optionById.get(detailItem.option_id ?? "") ?? null : null;
  const detailDate = detailItem ? formatItineraryDayDate(startDate, detailItem.day_number) : null;
  const detailLocation = detailItem ? getItineraryAnchorLocation(detailItem, detailOption) : null;
  const detailTime = detailItem ? getItineraryNoteField(detailItem.notes, "Time") : null;

  return (
    <TripSection
      title="Itinerary blocks"
      icon={<CalendarPlus className="size-4" aria-hidden />}
      className="border-0 pt-0"
      actions={(
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="size-4" aria-hidden />
            Add block
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => openPresetDialog("arrival")}>
            <CalendarPlus className="size-4" aria-hidden />
            Add arrival
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => openPresetDialog("departure")}>
            <CalendarPlus className="size-4" aria-hidden />
            Add departure
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" variant="outline" disabled={accommodations.length === 0}>
                <CalendarPlus className="size-4" aria-hidden />
                Add stay timing
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Accommodation blocks</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {accommodations.map((accommodation, index) => (
                <Fragment key={`${accommodation.name ?? "stay"}-${index}`}>
                  <DropdownMenuItem onClick={() => openPresetDialog("check_in", accommodation)}>
                    Check-in: {truncateText(accommodation.name ?? `Accommodation ${index + 1}`, 34)}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openPresetDialog("check_out", accommodation)}>
                    Check-out: {truncateText(accommodation.name ?? `Accommodation ${index + 1}`, 34)}
                  </DropdownMenuItem>
                  {index < accommodations.length - 1 ? <DropdownMenuSeparator /> : null}
                </Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      contentClassName="space-y-4"
    >
        <div className="space-y-6">
          {Array.from({ length: dayCount }, (_, index) => index + 1).map((day) => {
            const dateLabel = formatItineraryDayDate(startDate, day);
            const dayItems = sortItineraryItems(itinerary.filter((item) => item.day_number === day));
            return (
              <section key={day} className="space-y-3 border-b pb-6 last:border-b-0 last:pb-0">
                <h3 className="text-sm font-semibold">
                  Day {day}
                  {dateLabel ? <span className="ml-1 text-muted-foreground">· {dateLabel}</span> : null}
                </h3>
                {dayItems.length === 0 ? <p className="text-sm text-muted-foreground">No blocks</p> : null}
                <div className="grid gap-3 lg:grid-cols-2">
                  {dayItems.map((item) => {
                    const timeLabel = getItineraryNoteField(item.notes, "Time");
                    const itemOption = optionById.get(item.option_id ?? "") ?? null;
                    const locationLabel = getItineraryAnchorLocation(item, itemOption);
                    const itemIndex = dayItems.findIndex((candidate) => candidate.id === item.id);
                    return (
                      <div key={item.id} className="rounded-md border p-3">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => reorderMutation.mutate({ item, direction: "up" })}
                            disabled={reorderMutation.isPending || itemIndex === 0}
                            aria-label={`Move ${item.title} earlier`}
                          >
                            <ArrowUp className="size-4" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => reorderMutation.mutate({ item, direction: "down" })}
                            disabled={reorderMutation.isPending || itemIndex === dayItems.length - 1}
                            aria-label={`Move ${item.title} later`}
                          >
                            <ArrowDown className="size-4" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setDetailItem(item)}
                            aria-label={`View ${item.title}`}
                          >
                            <Eye className="size-4" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const anchor = optionById.get(item.option_id ?? "") ?? null;
                              setFollowupAreaOverride(getItineraryAnchorLocation(item, anchor) ?? "");
                              setFollowupItem(item);
                            }}
                            aria-label={`Find follow-ups for ${item.title}`}
                          >
                            <Sparkles className="size-4" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => openMoveDialog(item)}
                            disabled={moveMutation.isPending}
                            aria-label={`Move ${item.title}`}
                          >
                            <Pencil className="size-4" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate(item.id)}
                            disabled={deleteMutation.isPending}
                            aria-label={`Delete ${item.title}`}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        </div>
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{item.block}</Badge>
                            {timeLabel ? <Badge variant="secondary">{timeLabel}</Badge> : null}
                            {locationLabel ? <Badge variant="secondary">{locationLabel}</Badge> : null}
                          </div>
                          {!itemOption ? <div className="mt-2 font-medium">{item.title}</div> : null}
                        </div>
                        <ItineraryBlockDescription item={item} option={itemOption} compact />
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add itinerary block</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
              <LabeledField label="Day" htmlFor="add-itinerary-day">
                <Input
                  id="add-itinerary-day"
                  type="number"
                  min={1}
                  max={30}
                  value={draft.day_number}
                  onChange={(event) => setDraft({ ...draft, day_number: Number(event.target.value), position: "end" })}
                />
              </LabeledField>
              <LabeledField label="Block" htmlFor="add-itinerary-block">
                <Select value={draft.block} onValueChange={(value) => setDraft({ ...draft, block: value as TripItineraryBlock })}>
                  <SelectTrigger id="add-itinerary-block"><SelectValue /></SelectTrigger>
                  <SelectContent>{itineraryBlocks.map((block) => <SelectItem key={block} value={block}>{block}</SelectItem>)}</SelectContent>
                </Select>
              </LabeledField>
            </div>
            <LabeledField label="Position" htmlFor="add-itinerary-position">
              <Select value={draft.position} onValueChange={(value) => setDraft({ ...draft, position: value })}>
                <SelectTrigger id="add-itinerary-position"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="end">End of day</SelectItem>
                  <SelectItem value="start">Start of day</SelectItem>
                  {selectedDayItems.map((item) => (
                    <SelectItem key={item.id} value={`after:${item.id}`}>After {truncateText(item.title, 40)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </LabeledField>
            <LabeledField label="Source option" htmlFor="add-itinerary-option">
              <Select
                value={draft.option_id}
                onValueChange={(value) => {
                  const option = value === "custom" ? null : optionById.get(value) ?? null;
                  setDraft({
                    ...draft,
                    option_id: value,
                    title: option ? option.title : draft.title,
                    block: option ? getDefaultItineraryBlock(option) : draft.block,
                  });
                }}
              >
                <SelectTrigger id="add-itinerary-option"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom block</SelectItem>
                  {options.map((option) => (
                    <SelectItem key={option.id} value={option.id}>{truncateText(option.title, 52)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </LabeledField>
            <LabeledField label="Title" htmlFor="add-itinerary-title">
              <Input
                id="add-itinerary-title"
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                placeholder="Plan block..."
              />
            </LabeledField>
            <LabeledField label="Notes" htmlFor="add-itinerary-notes">
              <Textarea
                id="add-itinerary-notes"
                value={draft.notes}
                onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                placeholder="Optional details, timing, reminders..."
              />
            </LabeledField>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding..." : "Add block"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={movingItem !== null} onOpenChange={(open) => {
        if (!open) setMovingItem(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move itinerary block</DialogTitle>
          </DialogHeader>
          {movingItem ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                moveMutation.mutate({ item: movingItem, payload: moveDraft });
              }}
            >
              <div>
                <div className="font-medium">{movingItem.title}</div>
                <div className="text-sm text-muted-foreground">Current: Day {movingItem.day_number} · {movingItem.block}</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                <LabeledField label="Day" htmlFor="move-itinerary-day">
                  <Input
                    id="move-itinerary-day"
                    type="number"
                    min={1}
                    max={Math.max(1, dayCount)}
                    value={moveDraft.day_number}
                    onChange={(event) => setMoveDraft((current) => ({ ...current, day_number: Number(event.target.value) }))}
                  />
                </LabeledField>
                <LabeledField label="Block" htmlFor="move-itinerary-block">
                  <Select value={moveDraft.block} onValueChange={(value) => setMoveDraft((current) => ({ ...current, block: value as TripItineraryBlock }))}>
                    <SelectTrigger id="move-itinerary-block"><SelectValue /></SelectTrigger>
                    <SelectContent>{itineraryBlocks.map((block) => <SelectItem key={block} value={block}>{block}</SelectItem>)}</SelectContent>
                  </Select>
                </LabeledField>
              </div>
              <LabeledField label="Location / area" htmlFor="move-itinerary-location">
                <Input
                  id="move-itinerary-location"
                  value={moveDraft.location}
                  onChange={(event) => setMoveDraft((current) => ({ ...current, location: event.target.value }))}
                  placeholder="Visby, Fårö, East coast..."
                />
              </LabeledField>
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setMovingItem(null)}>Cancel</Button>
                <Button type="submit" disabled={moveMutation.isPending}>
                  {moveMutation.isPending ? "Saving..." : "Save block"}
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={detailItem !== null} onOpenChange={(open) => {
        if (!open) setDetailItem(null);
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detailItem?.title ?? "Itinerary block"}</DialogTitle>
          </DialogHeader>
          {detailItem ? (
            <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Day {detailItem.day_number}</Badge>
                {detailDate ? <Badge variant="outline">{detailDate}</Badge> : null}
                <Badge variant="outline">{detailItem.block}</Badge>
                {detailTime ? <Badge variant="secondary">{detailTime}</Badge> : null}
                {detailLocation ? <Badge variant="secondary">{detailLocation}</Badge> : null}
              </div>
              <ItineraryBlockDescription item={detailItem} option={detailOption} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={presetDraft !== null} onOpenChange={(open) => {
        if (!open) setPresetDraft(null);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{presetDraft ? `Add ${presetDraft.title.toLowerCase()} block` : "Add logistics block"}</DialogTitle>
          </DialogHeader>
          {presetDraft ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                presetMutation.mutate(presetDraft);
              }}
            >
              <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                <LabeledField label="Day" htmlFor="preset-itinerary-day">
                  <Input
                    id="preset-itinerary-day"
                    type="number"
                    min={1}
                    max={Math.max(1, dayCount)}
                    value={presetDraft.day_number}
                    onChange={(event) => setPresetDraft((current) => current ? { ...current, day_number: Number(event.target.value) } : current)}
                  />
                </LabeledField>
                <LabeledField label="Block" htmlFor="preset-itinerary-block">
                  <Select value={presetDraft.block} onValueChange={(value) => setPresetDraft((current) => current ? { ...current, block: value as TripItineraryBlock } : current)}>
                    <SelectTrigger id="preset-itinerary-block"><SelectValue /></SelectTrigger>
                    <SelectContent>{itineraryBlocks.map((block) => <SelectItem key={block} value={block}>{block}</SelectItem>)}</SelectContent>
                  </Select>
                </LabeledField>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <LabeledField label="Time" htmlFor="preset-itinerary-time">
                  <Input
                    id="preset-itinerary-time"
                    value={presetDraft.time}
                    onChange={(event) => setPresetDraft((current) => current ? { ...current, time: event.target.value } : current)}
                    placeholder="14:35"
                  />
                </LabeledField>
                <LabeledField label="Location / area" htmlFor="preset-itinerary-location">
                  <Input
                    id="preset-itinerary-location"
                    value={presetDraft.location}
                    onChange={(event) => setPresetDraft((current) => current ? { ...current, location: event.target.value } : current)}
                    placeholder="Visby ferry terminal"
                  />
                </LabeledField>
              </div>
              <LabeledField label="Notes" htmlFor="preset-itinerary-notes">
                <Textarea
                  id="preset-itinerary-notes"
                  value={presetDraft.notes}
                  onChange={(event) => setPresetDraft((current) => current ? { ...current, notes: event.target.value } : current)}
                  placeholder="Ferry booking, check-in, car pickup..."
                />
              </LabeledField>
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPresetDraft(null)}>Cancel</Button>
                <Button type="submit" disabled={presetMutation.isPending}>
                  {presetMutation.isPending ? "Adding..." : "Add block"}
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={followupItem !== null} onOpenChange={(open) => {
        if (!open) {
          setFollowupItem(null);
          setFollowupAreaOverride("");
        }
      }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Find follow-ups</DialogTitle>
          </DialogHeader>
          {followupItem ? (
            <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
              <section className="space-y-2 rounded-md bg-muted/30 p-3">
                <div className="text-sm font-medium">{followupItem.title}</div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Day {followupItem.day_number}</Badge>
                  <Badge variant="outline">{followupItem.block}</Badge>
                  {followupArea ? <Badge variant="secondary">{followupArea}</Badge> : null}
                </div>
              </section>
              <LabeledField label="Search area" htmlFor="followup-search-area">
                <Input
                  id="followup-search-area"
                  value={followupAreaOverride}
                  onChange={(event) => setFollowupAreaOverride(event.target.value)}
                  placeholder="Visby, Fårö, East coast..."
                />
              </LabeledField>
              {!followupArea ? (
                <p className="text-sm text-muted-foreground">No location is known for this block yet. Link it to an option or add a Location line in notes.</p>
              ) : null}
              {followupArea && followupOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No unplanned options found in {followupArea} yet.</p>
              ) : null}
              {followupOptions.length > 0 ? (
                <div className="space-y-3">
                  {followupOptions.map((option) => (
                    <div key={option.id} className="space-y-2 rounded-md border p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="font-medium">{option.title}</div>
                          <div className="flex flex-wrap gap-2">
                            {option.location ? <Badge variant="secondary">{option.location}</Badge> : null}
                            <Badge variant="outline">{option.option_type}</Badge>
                            <Badge variant={option.status === "shortlisted" ? "default" : "outline"}>{option.status}</Badge>
                            <Badge variant="outline">{getDefaultItineraryBlock(option)}</Badge>
                          </div>
                          {option.best_for ? <div className="text-sm text-muted-foreground">{option.best_for}</div> : null}
                          {option.why ? <p className="text-sm text-muted-foreground">{truncateText(option.why, 180)}</p> : null}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => followupMutation.mutate({ option, anchor: followupItem })}
                          disabled={followupMutation.isPending}
                        >
                          <CalendarPlus className="size-4" aria-hidden />
                          Add to day
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </TripSection>
  );
}

function ItineraryBlockDescription({ item, option, compact = false }: { item: TripItineraryItem; option: TripOption | null; compact?: boolean }) {
  const notesSectionClassName = compact ? "space-y-2 rounded-md bg-muted/30 p-2.5" : "space-y-3 rounded-md bg-muted/30 p-3";
  const wrapperClassName = compact ? "mt-3 space-y-2" : "space-y-4";

  return (
    <div className={wrapperClassName}>
      {option ? (
        <section className="space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="font-medium">{option.title}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{option.option_type}</Badge>
              <Badge variant={option.status === "planned" ? "default" : "outline"}>{option.status}</Badge>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {option.location ? <SummaryValue label="Option location" value={option.location} /> : null}
            {option.best_for ? <SummaryValue label="Best for" value={option.best_for} /> : null}
          </div>
          {option.why ? <SummaryValue label="Why" value={option.why} /> : null}
        </section>
      ) : null}
      <section className={notesSectionClassName}>
        <h3 className="text-sm font-semibold text-muted-foreground">Block notes</h3>
        {item.notes ? <div className="whitespace-pre-wrap text-sm">{item.notes}</div> : <p className="text-sm text-muted-foreground">No notes yet.</p>}
      </section>
    </div>
  );
}

type ItineraryPresetDraft = {
  kind: ItineraryPresetKind;
  title: string;
  day_number: number;
  block: TripItineraryBlock;
  time: string;
  location: string;
  notes: string;
};

type ItineraryPresetKind = "arrival" | "departure" | "check_in" | "check_out";

type AccommodationLogistics = {
  name: string | null;
  address: string | null;
  area: string | null;
  check_in_date: string | null;
  check_in_time: string | null;
  check_out_date: string | null;
  check_out_time: string | null;
  booking_reference: string | null;
  notes: string | null;
};

function TripTasksPanel({ tasks, onError, onDone }: { tasks: Task[]; onError: (error: string | null) => void; onDone: () => void }) {
  const deleteMutation = useMutation({
    mutationFn: deleteTripTask,
    onSuccess: () => {
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to delete trip task"),
  });

  return (
    <TripSection
      title={(
        <>
          Trip tasks
          <Badge variant="secondary">{tasks.length === 1 ? "1 task" : `${tasks.length} tasks`}</Badge>
        </>
      )}
      icon={<ClipboardList className="size-4" aria-hidden />}
      className="border-0 pt-0"
      contentClassName="grid gap-2 md:grid-cols-2"
    >
        {tasks.length === 0 ? <p className="text-sm text-muted-foreground">No trip tasks yet.</p> : null}
        {tasks.map((task) => (
          <div key={task.id} className="rounded-md border p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-medium">{task.title}</div>
                <div className="text-sm text-muted-foreground">{task.due_date ? task.due_date.slice(0, 10) : "No due date"}</div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => deleteMutation.mutate(task.id)}
                disabled={deleteMutation.isPending}
                aria-label={`Delete ${task.title}`}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        ))}
    </TripSection>
  );
}

type PanelProps = {
  tripId: string;
  onError: (error: string | null) => void;
  onDone: () => void;
};

function useTripTaskMutation(tripId: string, onError: (error: string | null) => void, onDone: () => void) {
  return useMutation({
    mutationFn: (payload: { title: string; bucket: Bucket; category?: string; original_body?: string | null; source_item_id?: string; source_item_type?: string }) =>
      createTripTask(tripId, payload),
    onSuccess: () => {
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to create task"),
  });
}

function formatDates(trip: Trip) {
  if (trip.start_date && trip.end_date) return `${trip.start_date} to ${trip.end_date}`;
  if (trip.start_date) return `from ${trip.start_date}`;
  return "dates not set";
}

function getDayCount(trip?: Trip) {
  if (!trip?.start_date || !trip.end_date) return 4;
  const start = new Date(`${trip.start_date}T00:00:00Z`).getTime();
  const end = new Date(`${trip.end_date}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 4;
  return Math.min(30, Math.max(1, Math.round((end - start) / 86400000) + 1));
}

function formatItineraryDayDate(startDate: string | null, dayNumber: number) {
  if (!startDate) return null;
  const start = new Date(`${startDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return null;
  const date = new Date(start);
  date.setUTCDate(start.getUTCDate() + dayNumber - 1);
  return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(date);
}

function getTripDayFromDate(startDate: string | null, value: string | null | undefined) {
  if (!startDate || !value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const target = new Date(`${value}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(target) || target < start) return null;
  return Math.round((target - start) / 86400000) + 1;
}

function formatTripDuration(startDate: string, endDate: string) {
  if (!startDate || !endDate) return "Set dates to calculate trip length.";
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return "Set dates to calculate trip length.";
  if (end < start) return "End date is before start date.";
  const days = Math.round((end - start) / 86400000) + 1;
  const nights = Math.max(0, days - 1);
  return `${days} ${days === 1 ? "day" : "days"} / ${nights} ${nights === 1 ? "night" : "nights"}`;
}
