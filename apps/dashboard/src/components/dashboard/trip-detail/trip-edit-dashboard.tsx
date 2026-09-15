"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, FileText, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TripPreferencesDialog } from "@/components/dashboard/trip-preferences-dialog";
import { fetchTripDetail, previewTripLogistics, updateTrip } from "@/components/dashboard/trip-ops-api";
import { formatTripDuration, isEmptyRecord } from "@/components/dashboard/trip-utils";
import { ExtractedLogistics, LabeledField } from "./trip-detail-shared";
import type { Trip } from "@/types/database";

export function TripEditDashboard({ tripId }: { tripId: string }) {
  const query = useQuery({ queryKey: ["trip", tripId], queryFn: () => fetchTripDetail(tripId) });
  if (!query.data) return <main className="mx-auto max-w-[1080px] px-5 py-10" role="status">{query.isError ? "Trip could not be loaded." : "Loading trip…"}</main>;
  return <TripEditForm key={tripId} trip={query.data.trip} />;
}

function TripEditForm({ trip }: { trip: Trip }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [initial] = useState(() => ({
    title: trip.title, destination: trip.destination, start_date: trip.start_date ?? "", end_date: trip.end_date ?? "",
    adult_count: String(trip.adult_count ?? 0), kid_count: String(trip.kid_count ?? 0), kid_ages: (trip.kid_ages ?? []).join(", "),
    participants: trip.participants ?? "", selected_preferences: trip.selected_preferences ?? [],
    already_done: trip.already_done ?? "", preferences: trip.preferences ?? "", logistics: trip.logistics ?? "",
    logistics_details: trip.logistics_details,
  }));
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const allowLeave = useRef(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const backHref = `/trips/${trip.id}`;
  const payload = () => ({ ...draft, adult_count: Number(draft.adult_count), kid_count: Number(draft.kid_count),
    kid_ages: draft.kid_ages.split(/[,\s]+/).filter(Boolean).map(Number), start_date: draft.start_date || null, end_date: draft.end_date || null });

  // Guard both full-page departures and in-app links, including the shared header.
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { if (!allowLeave.current) { event.preventDefault(); event.returnValue = ""; } };
    const click = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.("a[href]");
      if (!link || allowLeave.current || event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (!window.confirm("Discard your unsaved changes?")) { event.preventDefault(); event.stopPropagation(); }
      else allowLeave.current = true;
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", click, true); };
  }, [dirty]);

  const save = useMutation({
    mutationFn: () => updateTrip(trip.id, payload()),
    onSuccess: async () => {
      allowLeave.current = true;
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["trip", trip.id] }), queryClient.invalidateQueries({ queryKey: ["trips"] })]);
      router.push(backHref);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to save trip"),
  });
  const extract = useMutation({
    mutationFn: () => previewTripLogistics(trip.id, payload()),
    onSuccess: (details) => { setDraft(current => ({ ...current, logistics_details: details })); setDetailsOpen(true); setError(null); },
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to extract logistics"),
  });
  const busy = save.isPending || extract.isPending;
  function cancel() {
    if (busy || (dirty && !window.confirm("Discard your unsaved changes?"))) return;
    allowLeave.current = true;
    router.push(backHref);
  }
  function field(key: keyof typeof draft) {
    return {
      value: String(draft[key] ?? ""),
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = event.target.value;
        setDraft(current => ({
          ...current,
          [key]: value,
          ...(key === "title" || key === "destination" || key === "start_date" || key === "end_date" || key === "logistics"
            ? { logistics_details: {} }
            : {}),
        }));
        if (key === "logistics") setDetailsOpen(false);
      },
    };
  }

  return <main className="mx-auto w-full max-w-[1080px] px-5 pt-7 pb-32 sm:px-10">
    <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-primary"><ArrowLeft className="size-4" aria-hidden />{trip.title}</Link>
    <header className="mt-6 mb-7"><h1 className="font-serif text-4xl font-medium tracking-tight">Edit trip</h1><p className="mt-2 text-muted-foreground">Update the details for your family trip.</p></header>
    <form onSubmit={event => {
      event.preventDefault(); setError(null);
      if (!draft.title.trim()) return setError("Enter a trip title.");
      if (draft.start_date && draft.end_date && draft.end_date < draft.start_date) return setError("End date must be on or after the start date.");
      if (payload().kid_ages.some(age => !Number.isFinite(age) || age < 0 || age > 18)) return setError("Kid ages must be numbers between 0 and 18.");
      save.mutate();
    }}>
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-5">
        <EditSection title="Trip basics" description="Give your trip a name, set the destination and dates.">
          <LabeledField label="Trip title" htmlFor="trip-title"><Input id="trip-title" required maxLength={160} {...field("title")} /></LabeledField>
          <div className="grid gap-4 sm:grid-cols-3">
            <LabeledField label="Destination" htmlFor="trip-destination"><Input id="trip-destination" maxLength={160} {...field("destination")} /></LabeledField>
            <LabeledField label="Start date" htmlFor="trip-start-date"><Input id="trip-start-date" type="date" {...field("start_date")} /></LabeledField>
            <LabeledField label="End date" htmlFor="trip-end-date"><Input id="trip-end-date" type="date" min={draft.start_date || undefined} {...field("end_date")} /></LabeledField>
          </div>
          <p className="text-right text-sm text-muted-foreground">{formatTripDuration(draft.start_date, draft.end_date)}</p>
        </EditSection>
        <EditSection title="Participants" description="Tell us who’s going and add any helpful notes.">
          <div className="grid gap-4 sm:grid-cols-3">
            <LabeledField label="Adults" htmlFor="trip-adults"><Input id="trip-adults" type="number" required min={0} max={50} {...field("adult_count")} /></LabeledField>
            <LabeledField label="Kids" htmlFor="trip-kids"><Input id="trip-kids" type="number" required min={0} max={50} {...field("kid_count")} /></LabeledField>
            <LabeledField label="Kid ages" htmlFor="trip-kid-ages"><Input id="trip-kid-ages" placeholder="e.g. 5, 8" {...field("kid_ages")} /></LabeledField>
          </div>
          <LabeledField label="Participant notes" htmlFor="trip-participants"><Textarea id="trip-participants" rows={3} {...field("participants")} /></LabeledField>
        </EditSection>
        <EditSection title="Preferences and planning" description="Choose what your family likes, and note anything to avoid or keep in mind.">
          <div className="flex flex-col gap-2"><p className="text-sm font-medium">Selected preferences</p>
            <div className="flex flex-wrap items-center gap-2">
              {draft.selected_preferences.map(preference => <Badge key={preference} variant="secondary" className="gap-2 py-1.5 pl-3 pr-1.5">
                {preference}<button type="button" aria-label={`Remove ${preference}`} className="rounded-full p-1 hover:bg-background focus-visible:outline-2" onClick={() => setDraft(current => ({ ...current, selected_preferences: current.selected_preferences.filter(item => item !== preference) }))}><X className="size-3.5" aria-hidden /></button>
              </Badge>)}
              <TripPreferencesDialog triggerLabel="Choose preferences" selected={draft.selected_preferences} onApply={selected_preferences => setDraft(current => ({ ...current, selected_preferences }))} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <LabeledField label="Already done / avoid repeating" htmlFor="trip-already-done"><Textarea id="trip-already-done" rows={3} {...field("already_done")} /></LabeledField>
            <LabeledField label="Preference notes" htmlFor="trip-preferences"><Textarea id="trip-preferences" rows={3} {...field("preferences")} /></LabeledField>
          </div>
        </EditSection>
        <EditSection title="Transport and stay" description="Add any travel and accommodation details. We can help turn these into structured details.">
          <LabeledField label="Logistics notes" htmlFor="trip-logistics"><Textarea id="trip-logistics" rows={4} {...field("logistics")} /></LabeledField>
          <div className="flex flex-wrap items-center gap-3"><Button type="button" variant="outline" disabled={busy || !draft.logistics.trim()} onClick={() => extract.mutate()}><Sparkles className="size-4" aria-hidden />{extract.isPending ? "Extracting…" : "Extract logistics"}</Button><p className="text-sm text-muted-foreground">Turn your notes into structured travel details.</p></div>
          <details open={detailsOpen} onToggle={event => setDetailsOpen(event.currentTarget.open)} className="rounded-lg bg-muted p-4">
            <summary className="flex cursor-pointer list-none items-center gap-3"><FileText className="size-5" aria-hidden /><span className="flex-1 text-sm">Extracted details<span className="block text-xs text-muted-foreground">Review transport and accommodation</span></span><ChevronDown className="size-4" aria-hidden /></summary>
            <div className="mt-4">{isEmptyRecord(draft.logistics_details) ? <p className="text-sm text-muted-foreground">No extracted details yet.</p> : <ExtractedLogistics details={draft.logistics_details} />}</div>
          </details>
        </EditSection>
      </fieldset>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-10">
          <div className="min-w-0 flex-1">{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : <p className="hidden text-xs text-muted-foreground sm:block">Changes are saved when you select Save changes.</p>}</div>
          <div className="flex gap-2"><Button type="button" variant="outline" onClick={cancel} disabled={busy}>Cancel</Button><Button type="submit" disabled={busy}>{save.isPending ? "Saving…" : "Save changes"}</Button></div>
        </div>
      </div>
    </form>
  </main>;
}

function EditSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="flex min-w-0 flex-col gap-4 rounded-2xl border bg-card p-5 sm:p-7">
    <header><h2 className="font-serif text-2xl font-medium">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></header>
    {children}
  </section>;
}
