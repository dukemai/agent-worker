"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CalendarRange, CircleSlash2, GraduationCap, Moon, Sprout, Users, Wheat, type LucideIcon } from "lucide-react";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createPlanningDay, deletePlanningDay, fetchDigestSettings, importPlanningDays, saveDigestPreferences, updatePlanningDay, type DigestPreferences, type PlanningDay } from "@/lib/digest-api";

const DEFAULTS: Omit<DigestPreferences, "singleton"> = { red_day_lead_days: 21, high_growth_start: "04-01", high_growth_end: "07-31", harvest_start: "08-01", harvest_end: "10-15" };
const EMPTY_DAY: Omit<PlanningDay, "id"> = { title: "", category: "school", starts_on: "", ends_on: null, enabled: true, notes: null };
const CATEGORY_GROUPS: Array<{ category: PlanningDay["category"]; label: string; icon: LucideIcon; iconClass: string }> = [
  { category: "red_day", label: "Red days", icon: CalendarDays, iconClass: "text-red-600" },
  { category: "school", label: "School", icon: GraduationCap, iconClass: "text-blue-600" },
  { category: "family", label: "Family", icon: Users, iconClass: "text-violet-600" },
  { category: "closure", label: "Closures", icon: CircleSlash2, iconClass: "text-amber-600" },
  { category: "other", label: "Other", icon: CalendarRange, iconClass: "text-muted-foreground" },
];

export function DigestSettingsCard() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["digest", "settings"], queryFn: fetchDigestSettings });
  const [preferencesDirty, setPreferencesDirty] = useState<Omit<DigestPreferences, "singleton"> | null>(null);
  const [newDay, setNewDay] = useState(EMPTY_DAY);
  const [newDateShape, setNewDateShape] = useState<"single" | "period">("single");
  const [importError, setImportError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const preferences = preferencesDirty ?? (query.data?.preferences ? {
    red_day_lead_days: query.data.preferences.red_day_lead_days,
    high_growth_start: query.data.preferences.high_growth_start,
    high_growth_end: query.data.preferences.high_growth_end,
    harvest_start: query.data.preferences.harvest_start,
    harvest_end: query.data.preferences.harvest_end,
  } : DEFAULTS);
  const refresh = async () => {
    await Promise.all([client.invalidateQueries({ queryKey: ["digest", "settings"] }), client.invalidateQueries({ queryKey: ["digest", "preview"] })]);
  };
  const preferencesMutation = useMutation({ mutationFn: saveDigestPreferences, onSuccess: async () => { setPreferencesDirty(null); await refresh(); } });
  const createMutation = useMutation({ mutationFn: createPlanningDay, onSuccess: async () => { setNewDay(EMPTY_DAY); setNewDateShape("single"); await refresh(); } });
  const updateMutation = useMutation({ mutationFn: ({ id, patch }: { id: string; patch: Partial<PlanningDay> }) => updatePlanningDay(id, patch), onSuccess: refresh });
  const deleteMutation = useMutation({ mutationFn: deletePlanningDay, onSuccess: refresh });
  const importMutation = useMutation({ mutationFn: importPlanningDays, onSuccess: async (result) => { setImportError(null); setImportedCount(result.imported); await refresh(); } });
  const error = query.error ?? preferencesMutation.error ?? createMutation.error ?? updateMutation.error ?? deleteMutation.error ?? importMutation.error;

  function addDay(event: FormEvent) {
    event.preventDefault();
    if (!newDay.title.trim() || !newDay.starts_on) return;
    createMutation.mutate({ ...newDay, ends_on: newDay.category === "red_day" || newDateShape === "single" ? null : newDay.ends_on });
  }

  async function uploadPlanningDays(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImportError(null);
    setImportedCount(null);
    try {
      importMutation.mutate(JSON.parse(await file.text()) as unknown);
    } catch {
      setImportError("File must contain valid JSON");
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">Digest settings</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Digest settings</DialogTitle>
          <DialogDescription>Control planning-day reminders and when growing content changes focus.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
        {error instanceof Error ? <p className="text-sm text-red-600">{error.message}</p> : null}
        <GrowingSeasonTimeline preferences={preferences} />
        <form className="grid gap-3 md:grid-cols-5" onSubmit={(event) => { event.preventDefault(); preferencesMutation.mutate(preferences); }}>
          <Field label="Red-day lead (days)"><Input type="number" min={1} max={90} value={preferences.red_day_lead_days} onChange={(e) => setPreferencesDirty({ ...preferences, red_day_lead_days: Number(e.target.value) })} /></Field>
          <Field label="High growth starts"><Input placeholder="MM-DD" value={preferences.high_growth_start} onChange={(e) => setPreferencesDirty({ ...preferences, high_growth_start: e.target.value })} /></Field>
          <Field label="High growth ends"><Input placeholder="MM-DD" value={preferences.high_growth_end} onChange={(e) => setPreferencesDirty({ ...preferences, high_growth_end: e.target.value })} /></Field>
          <Field label="Harvest starts"><Input placeholder="MM-DD" value={preferences.harvest_start} onChange={(e) => setPreferencesDirty({ ...preferences, harvest_start: e.target.value })} /></Field>
          <Field label="Harvest ends"><Input placeholder="MM-DD" value={preferences.harvest_end} onChange={(e) => setPreferencesDirty({ ...preferences, harvest_end: e.target.value })} /></Field>
          <div className="md:col-span-5"><Button type="submit" disabled={preferencesMutation.isPending}>Save growing periods</Button></div>
        </form>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="mr-auto font-semibold">Planning days</h3>
            <Button type="button" variant="outline" size="sm" asChild><a href="/templates/digest-planning-days.json" download>JSON template</a></Button>
            <Button type="button" variant="outline" size="sm" asChild><label className="cursor-pointer">{importMutation.isPending ? "Importing…" : "Upload JSON"}<input type="file" accept="application/json,.json" className="sr-only" onChange={uploadPlanningDays} disabled={importMutation.isPending} /></label></Button>
          </div>
          {importError ? <p className="text-sm text-red-600">{importError}</p> : null}
          {importedCount !== null ? <p className="text-sm text-emerald-700">Imported {importedCount} planning {importedCount === 1 ? "day" : "days"}.</p> : null}
          <div className="space-y-4">
            {CATEGORY_GROUPS.map((group) => {
              const days = query.data?.planning_days.filter((day) => day.category === group.category) ?? [];
              if (days.length === 0) return null;
              const Icon = group.icon;
              return (
                <section key={group.category} className="space-y-2 rounded-lg bg-muted/30 p-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`size-4 ${group.iconClass}`} aria-hidden />
                    <h4 className="font-semibold">{group.label}</h4>
                    <span className="text-xs text-muted-foreground">{days.length}</span>
                  </div>
                  <div className="space-y-2">
                    {days.map((day) => (
                      <PlanningDayRow key={day.id} day={day} saving={updateMutation.isPending} onSave={(patch) => updateMutation.mutate({ id: day.id, patch })} onDelete={() => deleteMutation.mutate(day.id)} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        <form className="grid gap-3 md:grid-cols-5" onSubmit={addDay}>
          <Field label="Name"><Input value={newDay.title} onChange={(e) => setNewDay({ ...newDay, title: e.target.value })} placeholder="School starts" /></Field>
          <Field label="Category"><select className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" value={newDay.category} onChange={(e) => { const category = e.target.value as PlanningDay["category"]; setNewDay({ ...newDay, category, ends_on: category === "red_day" ? null : newDay.ends_on }); if (category === "red_day") setNewDateShape("single"); }}><option value="school">School</option><option value="red_day">Red day</option><option value="family">Family</option><option value="closure">Closure</option><option value="other">Other</option></select></Field>
          <Field label="Date type"><select className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" value={newDay.category === "red_day" ? "single" : newDateShape} disabled={newDay.category === "red_day"} onChange={(e) => { const shape = e.target.value as "single" | "period"; setNewDateShape(shape); if (shape === "single") setNewDay({ ...newDay, ends_on: null }); }}><option value="single">Single day</option><option value="period">Period</option></select></Field>
          <Field label={newDateShape === "period" && newDay.category !== "red_day" ? "Starts" : "Date"}><Input type="date" value={newDay.starts_on} onChange={(e) => setNewDay({ ...newDay, starts_on: e.target.value })} /></Field>
          {newDateShape === "period" && newDay.category !== "red_day" ? <Field label="Ends"><Input type="date" min={newDay.starts_on || undefined} value={newDay.ends_on ?? ""} onChange={(e) => setNewDay({ ...newDay, ends_on: e.target.value || null })} required /></Field> : null}
          <div className="flex items-end"><Button type="submit" disabled={createMutation.isPending}>Add date</Button></div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-1 text-sm"><span className="font-medium">{label}</span>{children}</label>;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthDayPercent(value: string): number | null {
  const match = /^(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const date = new Date(Date.UTC(2024, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  const yearStart = Date.UTC(2024, 0, 1);
  const yearEnd = Date.UTC(2025, 0, 1);
  return ((date.getTime() - yearStart) / (yearEnd - yearStart)) * 100;
}

function timelineSegments(start: string, end: string): Array<{ left: number; width: number }> {
  const startPercent = monthDayPercent(start);
  const endPercent = monthDayPercent(end);
  if (startPercent === null || endPercent === null) return [];
  const inclusiveEnd = Math.min(100, endPercent + 100 / 366);
  if (startPercent <= endPercent) return [{ left: startPercent, width: Math.max(0.4, inclusiveEnd - startPercent) }];
  return [{ left: startPercent, width: 100 - startPercent }, { left: 0, width: inclusiveEnd }];
}

function isWithinPeriod(value: string, start: string, end: string) {
  return start <= end ? value >= start && value <= end : value >= start || value <= end;
}

function readableMonthDay(value: string) {
  const match = /^(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const date = new Date(Date.UTC(2024, Number(match[1]) - 1, Number(match[2])));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });
}

function GrowingSeasonTimeline({ preferences }: { preferences: Omit<DigestPreferences, "singleton"> }) {
  const now = new Date();
  const todayMonthDay = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const todayPercent = monthDayPercent(todayMonthDay) ?? 0;
  const mode = isWithinPeriod(todayMonthDay, preferences.high_growth_start, preferences.high_growth_end)
    ? "High growth"
    : isWithinPeriod(todayMonthDay, preferences.harvest_start, preferences.harvest_end)
      ? "Harvest"
      : "Quiet";
  const highGrowthSegments = timelineSegments(preferences.high_growth_start, preferences.high_growth_end);
  const harvestSegments = timelineSegments(preferences.harvest_start, preferences.harvest_end);

  return (
    <section className="space-y-3" aria-label="Growing season timeline">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div>
          <h3 className="font-semibold">Growing year</h3>
          <p className="text-sm text-muted-foreground">Current period: {mode}</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Moon className="size-3.5" aria-hidden /> Quiet</span>
          <span className="inline-flex items-center gap-1"><Sprout className="size-3.5 text-emerald-600" aria-hidden /> High growth</span>
          <span className="inline-flex items-center gap-1"><Wheat className="size-3.5 text-amber-600" aria-hidden /> Harvest</span>
        </div>
      </div>
      <div className="grid grid-cols-12 text-center text-[10px] text-muted-foreground sm:text-xs" aria-hidden>
        {MONTHS.map((month) => <span key={month}>{month}</span>)}
      </div>
      <div className="relative pt-5">
        <div className="relative h-10 overflow-hidden rounded-md border bg-muted" role="img" aria-label={`Quiet outside the configured periods. High growth ${readableMonthDay(preferences.high_growth_start)} to ${readableMonthDay(preferences.high_growth_end)}. Harvest ${readableMonthDay(preferences.harvest_start)} to ${readableMonthDay(preferences.harvest_end)}. Today is in ${mode}.`}>
          {highGrowthSegments.map((segment, index) => <div key={`growth-${index}`} className="absolute inset-y-0 bg-emerald-200 dark:bg-emerald-900/60" style={{ left: `${segment.left}%`, width: `${segment.width}%` }} />)}
          {harvestSegments.map((segment, index) => <div key={`harvest-${index}`} className="absolute inset-y-0 bg-amber-200 dark:bg-amber-900/60" style={{ left: `${segment.left}%`, width: `${segment.width}%` }} />)}
        </div>
        <div className="pointer-events-none absolute bottom-0 top-0 w-px bg-foreground" style={{ left: `${todayPercent}%` }} aria-hidden>
          <span className="absolute -top-0 -translate-x-1/2 whitespace-nowrap bg-background px-1 text-[10px] font-medium text-foreground">Today</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span>High growth: {readableMonthDay(preferences.high_growth_start)}–{readableMonthDay(preferences.high_growth_end)}</span>
        <span>Harvest: {readableMonthDay(preferences.harvest_start)}–{readableMonthDay(preferences.harvest_end)}</span>
      </div>
    </section>
  );
}

function PlanningDayRow({ day, saving, onSave, onDelete }: { day: PlanningDay; saving: boolean; onSave: (patch: Partial<PlanningDay>) => void; onDelete: () => void }) {
  const [draft, setDraft] = useState(day);
  const [dateShape, setDateShape] = useState<"single" | "period">(day.ends_on ? "period" : "single");
  const effectiveShape = draft.category === "red_day" ? "single" : dateShape;
  return (
    <form className="grid gap-2 rounded-md border p-3 text-sm md:grid-cols-6" onSubmit={(event) => { event.preventDefault(); onSave({ ...draft, ends_on: effectiveShape === "single" ? null : draft.ends_on }); }}>
      <Field label="Name"><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
      <Field label="Category"><select className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" value={draft.category} onChange={(e) => { const category = e.target.value as PlanningDay["category"]; setDraft({ ...draft, category, ends_on: category === "red_day" ? null : draft.ends_on }); if (category === "red_day") setDateShape("single"); }}><option value="school">School</option><option value="red_day">Red day</option><option value="family">Family</option><option value="closure">Closure</option><option value="other">Other</option></select></Field>
      <Field label="Date type"><select className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" value={effectiveShape} disabled={draft.category === "red_day"} onChange={(e) => { const shape = e.target.value as "single" | "period"; setDateShape(shape); if (shape === "single") setDraft({ ...draft, ends_on: null }); }}><option value="single">Single day</option><option value="period">Period</option></select></Field>
      <Field label={effectiveShape === "period" ? "Starts" : "Date"}><Input type="date" value={draft.starts_on} onChange={(e) => setDraft({ ...draft, starts_on: e.target.value })} /></Field>
      {effectiveShape === "period" ? <Field label="Ends"><Input type="date" min={draft.starts_on || undefined} value={draft.ends_on ?? ""} onChange={(e) => setDraft({ ...draft, ends_on: e.target.value || null })} required /></Field> : <div />}
      <div className="flex flex-wrap items-end gap-2">
        <Button type="submit" size="sm" disabled={saving}>Save</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => { const next = { ...draft, enabled: !draft.enabled }; setDraft(next); onSave({ enabled: next.enabled }); }}>{draft.enabled ? "On" : "Off"}</Button>
        <Button type="button" size="sm" variant="outline" onClick={onDelete}>Delete</Button>
      </div>
    </form>
  );
}
