"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BookOpenText, CalendarPlus, ClipboardList, Eye, Plus, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { itineraryBlocks, optionStatuses } from "@/components/dashboard/trip-constants";
import { createTripItineraryItem, createTripOption, deleteTripOption, previewTripOptionsPromptForTrip, suggestTripOptionsForTrip, updateTripOption } from "@/components/dashboard/trip-ops-api";
import { buildDefaultPlanNotes, buildKnowledgeOverview, buildOptionFromKnowledgeItem, extractLinksFromText, getDefaultItineraryBlock, getOptionCardClassName, normalizeKnowledgeName, truncateText } from "@/components/dashboard/trip-utils";
import { LabeledField, SummaryValue, TripSection, useTripTaskMutation } from "@/components/dashboard/trip-detail/trip-detail-shared";
import type { PanelProps } from "@/components/dashboard/trip-detail/trip-detail-shared";
import type { TripItineraryBlock, TripKnowledgeFavorite, TripKnowledgeItem, TripOption } from "@/types/database";

export function TripOptionsPanel({
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
