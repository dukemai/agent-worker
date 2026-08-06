"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createManualLocalActivity, createManualSeasonalActivity, type ManualActivityPayload } from "./activities-api";

const INITIAL = {
  kind: "anytime", title: "", description: "", url: "", area: "", address: "", activityType: "other",
  startDate: "", endDate: "", timeText: "", costLevel: "unknown", priceText: "", costNotes: "",
  bookingRequired: false, bookingDeadline: "", bookingNotes: "", weatherFit: "mixed", energyLevel: "medium",
  ageMin: "", ageMax: "", ageNotes: "", duration: "", tags: "",
};

export function ManualActivityDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(INITIAL);
  const set = <K extends keyof typeof INITIAL>(key: K, value: (typeof INITIAL)[K]) => setForm((current) => ({ ...current, [key]: value }));
  const mutation = useMutation({
    mutationFn: async ({ kind, payload }: { kind: string; payload: ManualActivityPayload }) => {
      if (kind === "anytime") await createManualLocalActivity(payload);
      else await createManualSeasonalActivity(payload);
    },
    onSuccess: async () => {
      setOpen(false); setForm(INITIAL);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["activities", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["activities", "local"] }),
        queryClient.invalidateQueries({ queryKey: ["activities", "seasonal"] }),
      ]);
    },
  });

  function optional(value: string) { return value.trim() || null; }
  function optionalNumber(value: string) { const parsed = Number(value); return value.trim() && Number.isFinite(parsed) ? parsed : null; }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const payload: ManualActivityPayload = {
      title: form.title.trim(), description: optional(form.description), area: optional(form.area), address: optional(form.address),
      activity_type: form.activityType, location_url: form.kind === "anytime" ? optional(form.url) : undefined,
      booking_url: form.kind === "seasonal" ? optional(form.url) : undefined, valid_from: optional(form.startDate),
      valid_until: optional(form.endDate || form.startDate), season: "summer_2026", time_text: optional(form.timeText),
      cost_level: form.costLevel, price_text: optional(form.priceText), cost_notes: optional(form.costNotes),
      booking_required: form.bookingRequired, booking_notes: optional(form.bookingNotes), booking_deadline: optional(form.bookingDeadline),
      weather_fit: form.weatherFit, energy_level: form.energyLevel, age_min: optionalNumber(form.ageMin), age_max: optionalNumber(form.ageMax),
      age_notes: optional(form.ageNotes), usual_duration_minutes: optionalNumber(form.duration),
      tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    };
    await mutation.mutateAsync({ kind: form.kind, payload });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm">Add activity manually</Button></DialogTrigger>
      <DialogContent className="max-w-3xl" showCloseButton>
        <DialogHeader><DialogTitle>Add activity manually</DialogTitle><DialogDescription>Save directly to the activity collection without running extraction.</DialogDescription></DialogHeader>
        <form id="manual-activity-form" className="space-y-4" onSubmit={submit}>
          <Select value={form.kind} onValueChange={(value) => set("kind", value)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="anytime">Anytime activity · Library</SelectItem><SelectItem value="seasonal">Specific dates · Seasonal</SelectItem></SelectContent></Select>
          <Input value={form.title} onChange={(event) => set("title", event.target.value)} placeholder="Activity title" required autoFocus />
          <Textarea value={form.description} onChange={(event) => set("description", event.target.value)} placeholder="Description" rows={4} />
          <div className="grid gap-3 sm:grid-cols-2"><Input value={form.url} onChange={(event) => set("url", event.target.value)} type="url" placeholder="Activity or source URL" /><Input value={form.area} onChange={(event) => set("area", event.target.value)} placeholder="Area" /><Input value={form.address} onChange={(event) => set("address", event.target.value)} placeholder="Address" />
            {form.kind === "anytime" ? <Select value={form.activityType} onValueChange={(value) => set("activityType", value)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{["nature", "playground", "museum", "library", "swimming", "sport", "workshop", "event", "food", "other"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select> : null}
          </div>
          {form.kind === "seasonal" ? <div className="grid gap-3 sm:grid-cols-3"><Input value={form.startDate} onChange={(event) => set("startDate", event.target.value)} type="date" aria-label="Start date" required /><Input value={form.endDate} onChange={(event) => set("endDate", event.target.value)} type="date" aria-label="End date" /><Input value={form.timeText} onChange={(event) => set("timeText", event.target.value)} placeholder="Time, e.g. 10:00–15:00" /></div> : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <Select value={form.weatherFit} onValueChange={(value) => set("weatherFit", value)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="outdoor">Outdoor</SelectItem><SelectItem value="indoor">Indoor</SelectItem><SelectItem value="mixed">Any weather</SelectItem></SelectContent></Select>
            <Select value={form.energyLevel} onValueChange={(value) => set("energyLevel", value)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low energy</SelectItem><SelectItem value="medium">Medium energy</SelectItem><SelectItem value="high">High energy</SelectItem></SelectContent></Select>
            <Select value={form.costLevel} onValueChange={(value) => set("costLevel", value)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="free">Free</SelectItem><SelectItem value="low">Low cost</SelectItem><SelectItem value="medium">Medium cost</SelectItem><SelectItem value="high">High cost</SelectItem><SelectItem value="unknown">Cost unknown</SelectItem></SelectContent></Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2"><Input value={form.priceText} onChange={(event) => set("priceText", event.target.value)} placeholder="Exact price, e.g. 50 kr/person" /><Input value={form.costNotes} onChange={(event) => set("costNotes", event.target.value)} placeholder="Cost notes" /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.bookingRequired} onChange={(event) => set("bookingRequired", event.target.checked)} />Booking required</label>
          {form.bookingRequired ? <div className="grid gap-3 sm:grid-cols-2">{form.kind === "seasonal" ? <Input value={form.bookingDeadline} onChange={(event) => set("bookingDeadline", event.target.value)} type="date" aria-label="Booking deadline" /> : null}<Input value={form.bookingNotes} onChange={(event) => set("bookingNotes", event.target.value)} placeholder="Booking notes" /></div> : null}
          <div className="grid gap-3 sm:grid-cols-3"><Input value={form.ageMin} onChange={(event) => set("ageMin", event.target.value)} type="number" min="0" placeholder="Minimum age" /><Input value={form.ageMax} onChange={(event) => set("ageMax", event.target.value)} type="number" min="0" placeholder="Maximum age" />{form.kind === "anytime" ? <Input value={form.duration} onChange={(event) => set("duration", event.target.value)} type="number" min="0" placeholder="Duration in minutes" /> : null}</div>
          <Input value={form.ageNotes} onChange={(event) => set("ageNotes", event.target.value)} placeholder="Age notes" />
          <Input value={form.tags} onChange={(event) => set("tags", event.target.value)} placeholder="Tags separated by commas" />
          {mutation.error instanceof Error ? <p className="text-sm text-red-600">{mutation.error.message}</p> : null}
        </form>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" form="manual-activity-form" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save activity"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
