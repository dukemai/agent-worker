"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BookOpenText, Bug, CheckCircle2, Circle, Copy, Eye, FileText, MoreHorizontal, Pencil, Plus, Search, Sparkles, Star, Trash2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkdownEditor } from "@/components/dashboard/markdown-editor";
import { knowledgeExtractionFocuses, tripStoryContentStyleOptions } from "@/components/dashboard/trip-constants";
import { createTripKnowledge, createTripKnowledgeFavorite, createTripKnowledgeResearchLead, deleteTripKnowledge, deleteTripKnowledgeFavorite, extractTripKnowledgeItem, generateTripKnowledgeStarterForTrip, generateTripResearchLeadAiDraft, updateTripKnowledge } from "@/components/dashboard/trip-ops-api";
import { buildKnowledgeOverview, buildKnowledgeResearchLeads, buildKnowledgeStories, buildResearchQueueMarkdown, formatKnowledgeFocus, getKnowledgeActivityRows, getKnowledgePlaceRows, getKnowledgeResearchLeadRows, getKnowledgeStoryRows, getPlanningExtraction, getStoryExtraction, getStringArray, joinParts, truncateText } from "@/components/dashboard/trip-utils";
import { KnowledgeRows, LabeledField, SummaryValue, TripSection } from "@/components/dashboard/trip-detail/trip-detail-shared";
import type { KnowledgeOverview, KnowledgeOverviewItem, KnowledgeResearchLeadItem, KnowledgeStoryItem } from "@/components/dashboard/trip-types";
import type { TripKnowledgeFavorite, TripKnowledgeItem, TripStoryContent } from "@/types/database";
import type { PanelProps } from "@/components/dashboard/trip-detail/trip-detail-shared";

export function TripKnowledgePanel({
  tripId,
  knowledge,
  favorites,
  storyContents,
  onError,
  onDone,
}: PanelProps & { knowledge: TripKnowledgeItem[]; favorites: TripKnowledgeFavorite[]; storyContents: TripStoryContent[] }) {
  const [draft, setDraft] = useState<{ title: string; source_url: string; raw_markdown: string; extraction_focus: TripKnowledgeItem["extraction_focus"] }>({
    title: "",
    source_url: "",
    raw_markdown: "",
    extraction_focus: "both",
  });
  const overview = useMemo(() => buildKnowledgeOverview(knowledge, favorites), [knowledge, favorites]);
  const stories = useMemo(() => buildKnowledgeStories(knowledge), [knowledge]);
  const researchLeads = useMemo(() => buildKnowledgeResearchLeads(knowledge), [knowledge]);
  const createMutation = useMutation({
    mutationFn: () => createTripKnowledge(tripId, {
      title: draft.title,
      source_url: draft.source_url || null,
      raw_markdown: draft.raw_markdown,
      extraction_focus: draft.extraction_focus,
    }),
    onSuccess: () => {
      setDraft({ title: "", source_url: "", raw_markdown: "", extraction_focus: "both" });
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
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Pick<TripKnowledgeItem, "title" | "source_url" | "raw_markdown" | "extraction_focus">> }) =>
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
  const researchLeadMutation = useMutation({
    mutationFn: (item: KnowledgeOverviewItem) => createTripKnowledgeResearchLead(tripId, {
      title: item.name,
      lead_type: item.itemType === "place" ? "place" : "other",
      area: item.area,
      related_place: item.itemType === "place" ? item.name : null,
      source_reason: item.detail ?? `Added from ${item.itemType} knowledge overview.`,
      why_interesting: item.detail,
      suggested_search_terms: [item.name, item.area].filter(Boolean),
      potential_content_types: ["story", "kid explanation"],
      source_url: item.sourceLinks[0]?.url ?? null,
    }),
    onSuccess: () => {
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to create research lead"),
  });
  const researchQueueMutation = useMutation({
    mutationFn: (payload: Pick<TripKnowledgeItem, "title" | "raw_markdown" | "extraction_focus"> & Partial<Pick<TripKnowledgeItem, "source_url" | "source_research_leads">>) =>
      createTripKnowledge(tripId, payload),
    onSuccess: () => {
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to add research source to queue"),
  });
  const queuedCount = knowledge.filter((item) => item.status === "queued").length;

  return (
    <TripSection
      title={(
        <>
          Knowledge
          <Badge variant="secondary">{overview.places.length} places</Badge>
          <Badge variant="secondary">{overview.activities.length} activities</Badge>
          <Badge variant="secondary">{stories.length} story materials</Badge>
          <Badge variant="secondary">{storyContents.length} content</Badge>
          <Badge variant="secondary">{researchLeads.length} research</Badge>
        </>
      )}
      icon={<BookOpenText className="size-4" aria-hidden />}
      className="border-0 pt-0"
      actions={(
        <Button type="button" variant="outline" size="sm" onClick={() => starterMutation.mutate()} disabled={starterMutation.isPending}>
          <Sparkles className="size-4" aria-hidden />
          {starterMutation.isPending ? "Generating..." : "Starter knowledge"}
        </Button>
      )}
      contentClassName=""
    >
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5 sm:w-fit">
              <TabsTrigger value="overview">
                Overview
              </TabsTrigger>
              <TabsTrigger value="stories">Story materials</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="research">Research</TabsTrigger>
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
                  onCreateResearchLead={(item) => researchLeadMutation.mutate(item)}
                  isFavoritePending={favoriteMutation.isPending || unfavoriteMutation.isPending}
                  isResearchPending={researchLeadMutation.isPending}
                />
              )}
            </TabsContent>

            <TabsContent value="stories" className="space-y-4">
              {stories.length === 0 ? (
                <p className="text-sm text-muted-foreground">No story materials yet. Extract knowledge from sources that include history, culture, nature, or local context.</p>
              ) : (
                <TripKnowledgeStories stories={stories} />
              )}
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              <TripStoryContentTab
                tripId={tripId}
                contents={storyContents}
              />
            </TabsContent>

            <TabsContent value="research" className="space-y-4">
              {researchLeads.length === 0 ? (
                <p className="text-sm text-muted-foreground">No research leads yet. Extract story-material-focused knowledge to surface places, people, buildings, or concepts worth investigating.</p>
              ) : (
                <TripKnowledgeResearchLeads
                  tripId={tripId}
                  leads={researchLeads}
                  onAddToQueue={(payload) => researchQueueMutation.mutate(payload)}
                  onDeleteLead={(knowledgeId) => deleteMutation.mutate(knowledgeId)}
                  isAddingToQueue={researchQueueMutation.isPending}
                  isDeletingLead={deleteMutation.isPending}
                />
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
                  <LabeledField label="Extraction focus" htmlFor="knowledge-extraction-focus">
                    <Select
                      value={draft.extraction_focus}
                      onValueChange={(value) => setDraft((current) => ({ ...current, extraction_focus: value as TripKnowledgeItem["extraction_focus"] }))}
                    >
                      <SelectTrigger id="knowledge-extraction-focus"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {knowledgeExtractionFocuses.map((focus) => (
                          <SelectItem key={focus} value={focus}>{formatKnowledgeFocus(focus)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                        <th className="px-3 py-2">Focus</th>
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
  onUpdate: (payload: Partial<Pick<TripKnowledgeItem, "title" | "source_url" | "raw_markdown" | "extraction_focus">>) => void;
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
    extraction_focus: item.extraction_focus ?? "both",
  });
  const extraction = item.extraction ?? {};
  const planningExtraction = getPlanningExtraction(extraction);
  const storyExtraction = getStoryExtraction(extraction);
  const summary = typeof planningExtraction.summary === "string" ? planningExtraction.summary : typeof storyExtraction.summary === "string" ? storyExtraction.summary : null;
  const places = getKnowledgePlaceRows(planningExtraction.places);
  const activities = getKnowledgeActivityRows(planningExtraction.activities);
  const stories = getKnowledgeStoryRows(storyExtraction.stories);
  const researchLeads = getKnowledgeResearchLeadRows(storyExtraction.research_leads);
  const candidateTitles = getStringArray(planningExtraction.candidate_option_titles);
  const extractedSummary = item.status === "queued"
    ? "Not extracted"
    : `${places.length} places · ${activities.length} activities · ${stories.length} materials · ${researchLeads.length} leads · ${candidateTitles.length} candidates`;

  function resetDraft() {
    setDraft({
      title: item.title,
      source_url: item.source_url ?? "",
      raw_markdown: item.raw_markdown,
      extraction_focus: item.extraction_focus ?? "both",
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
      <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{formatKnowledgeFocus(item.extraction_focus)}</td>
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
                extraction_focus: draft.extraction_focus,
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
              <LabeledField label="Extraction focus" htmlFor={`knowledge-edit-focus-${item.id}`}>
                <Select
                  value={draft.extraction_focus}
                  onValueChange={(value) => setDraft((current) => ({ ...current, extraction_focus: value as TripKnowledgeItem["extraction_focus"] }))}
                >
                  <SelectTrigger id={`knowledge-edit-focus-${item.id}`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {knowledgeExtractionFocuses.map((focus) => (
                      <SelectItem key={focus} value={focus}>{formatKnowledgeFocus(focus)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                title="Story materials"
                rows={stories.map((story) => ({
                  title: story.title,
                  meta: joinParts(story.story_type?.replace(/_/g, " "), story.related_place, story.area),
                  detail: story.summary ?? story.why_it_matters ?? story.story,
                }))}
              />
            ) : null}
            {researchLeads.length > 0 ? (
              <KnowledgeRows
                title="Research leads"
                rows={researchLeads.map((lead) => ({
                  title: lead.title,
                  meta: joinParts(lead.priority, lead.lead_type, lead.area),
                  detail: lead.why_interesting ?? lead.source_reason,
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
            {!summary && places.length === 0 && activities.length === 0 && stories.length === 0 && researchLeads.length === 0 && candidateTitles.length === 0 ? (
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

function TripKnowledgeOverview({
  overview,
  onFavorite,
  onUnfavorite,
  onCreateResearchLead,
  isFavoritePending,
  isResearchPending,
}: {
  overview: KnowledgeOverview;
  onFavorite: (item: KnowledgeOverviewItem) => void;
  onUnfavorite: (favoriteId: string) => void;
  onCreateResearchLead: (item: KnowledgeOverviewItem) => void;
  isFavoritePending: boolean;
  isResearchPending: boolean;
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
                onCreateResearchLead={onCreateResearchLead}
                isFavoritePending={isFavoritePending}
                isResearchPending={isResearchPending}
              />
            ) : null}
            {selectedActivities.length > 0 ? (
              <OverviewList
                title="Activities"
                items={selectedActivities}
                onFavorite={onFavorite}
                onUnfavorite={onUnfavorite}
                onCreateResearchLead={onCreateResearchLead}
                isFavoritePending={isFavoritePending}
                isResearchPending={isResearchPending}
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
              <Badge variant="outline">{areaStories.length} material{areaStories.length === 1 ? "" : "s"}</Badge>
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
            <DialogTitle>{selectedStory?.title ?? "Story material"}</DialogTitle>
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
              {selectedStory.story ? <SummaryValue label="Material" value={selectedStory.story} /> : null}
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

function TripStoryContentTab({
  tripId,
  contents,
}: {
  tripId: string;
  contents: TripStoryContent[];
}) {
  const [selectedContent, setSelectedContent] = useState<TripStoryContent | null>(null);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">{contents.length} generated scaffold{contents.length === 1 ? "" : "s"}</div>
        <Button asChild>
          <Link href={`/trips/${tripId}/content/new`}>
            <FileText className="size-4" aria-hidden />
            Create content
          </Link>
        </Button>
      </div>
      {contents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No generated content yet.</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {contents.map((content) => {
            const scaffold = content.scaffold ?? {};
            const title = getScaffoldString(scaffold.suggested_title) ?? content.subject;
            const shortVersion = getScaffoldString(scaffold.short_version);
            const styleLabel = getStoryContentStyleLabel(content.content_style);
            return (
              <article key={content.id} className="space-y-3 rounded-md border bg-background p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="font-medium">{title}</div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{styleLabel}</Badge>
                      {content.area ? <Badge variant="secondary">{content.area}</Badge> : null}
                      <Badge variant="outline">{content.selected_materials.length} material{content.selected_materials.length === 1 ? "" : "s"}</Badge>
                    </div>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => setSelectedContent(content)}>
                    <Eye className="size-4" aria-hidden />
                    View
                  </Button>
                </div>
                {shortVersion ? <p className="text-sm text-muted-foreground">{truncateText(shortVersion, 180)}</p> : null}
              </article>
            );
          })}
        </div>
      )}
      <Dialog open={selectedContent !== null} onOpenChange={(open) => {
        if (!open) setSelectedContent(null);
      }}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedContent ? getScaffoldString(selectedContent.scaffold.suggested_title) ?? selectedContent.subject : "Content scaffold"}</DialogTitle>
          </DialogHeader>
          {selectedContent ? <StoryContentDetail content={selectedContent} /> : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function StoryContentDetail({ content }: { content: TripStoryContent }) {
  const scaffold = content.scaffold ?? {};
  const longOutline = getScaffoldOutline(scaffold.long_outline);
  const keyAngles = getScaffoldStringArray(scaffold.key_angles);
  const whatToNotice = getScaffoldStringArray(scaffold.what_to_notice);
  const sourceNotes = getScaffoldStringArray(scaffold.source_notes);
  const openQuestions = getScaffoldStringArray(scaffold.open_questions);
  const kidHook = getScaffoldString(scaffold.kid_hook);
  const shortVersion = getScaffoldString(scaffold.short_version);

  return (
    <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{getStoryContentStyleLabel(content.content_style)}</Badge>
        {content.area ? <Badge variant="secondary">{content.area}</Badge> : null}
        <Badge variant="outline">{content.selected_materials.length} material{content.selected_materials.length === 1 ? "" : "s"}</Badge>
      </div>
      {shortVersion ? <SummaryValue label="Short version" value={shortVersion} /> : null}
      {kidHook ? <SummaryValue label="Kid hook" value={kidHook} /> : null}
      {keyAngles.length > 0 ? <StringList title="Key angles" items={keyAngles} /> : null}
      {whatToNotice.length > 0 ? <StringList title="What to notice" items={whatToNotice} /> : null}
      {longOutline.length > 0 ? (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Long outline</div>
          <div className="space-y-2">
            {longOutline.map((section) => (
              <section key={section.heading} className="rounded-md bg-muted/30 px-3 py-2">
                <div className="text-sm font-medium">{section.heading}</div>
                {section.points.length > 0 ? (
                  <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
                    {section.points.map((point) => <li key={point}>{point}</li>)}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </div>
      ) : null}
      {sourceNotes.length > 0 ? <StringList title="Source notes" items={sourceNotes} /> : null}
      {openQuestions.length > 0 ? <StringList title="Open questions" items={openQuestions} /> : null}
    </div>
  );
}

function StringList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      <ul className="mt-1 list-inside list-disc text-sm">
        {items.map((value) => <li key={value}>{value}</li>)}
      </ul>
    </div>
  );
}

function TripKnowledgeResearchLeads({
  tripId,
  leads,
  onAddToQueue,
  onDeleteLead,
  isAddingToQueue,
  isDeletingLead,
}: {
  tripId: string;
  leads: KnowledgeResearchLeadItem[];
  onAddToQueue: (payload: Pick<TripKnowledgeItem, "title" | "raw_markdown" | "extraction_focus"> & Partial<Pick<TripKnowledgeItem, "source_url" | "source_research_leads">>) => void;
  onDeleteLead: (knowledgeId: string) => void;
  isAddingToQueue: boolean;
  isDeletingLead: boolean;
}) {
  const [selectedLead, setSelectedLead] = useState<KnowledgeResearchLeadItem | null>(null);
  const [queueLead, setQueueLead] = useState<KnowledgeResearchLeadItem | null>(null);
  const [queueDraft, setQueueDraft] = useState({ title: "", source_url: "", raw_markdown: "" });
  const [queueDraftMode, setQueueDraftMode] = useState<"manual" | "ai">("manual");
  const [aiDraftLeadKey, setAiDraftLeadKey] = useState<string | null>(null);
  const [aiDraftMeta, setAiDraftMeta] = useState<{ confidence: string; verification_notes: string[] } | null>(null);
  const [aiDraftError, setAiDraftError] = useState<string | null>(null);
  const [copiedLeadKey, setCopiedLeadKey] = useState<string | null>(null);
  const areaNames = Array.from(new Set(leads.map((lead) => lead.area)));

  function openQueueDialog(lead: KnowledgeResearchLeadItem) {
    setSelectedLead(null);
    setQueueLead(lead);
    setQueueDraft({
      title: `Research: ${lead.title}`,
      source_url: lead.sourceLinks[0]?.url ?? "",
      raw_markdown: buildResearchQueueMarkdown(lead),
    });
    setQueueDraftMode("manual");
    setAiDraftMeta(null);
    setAiDraftError(null);
  }

  async function openAiDraftDialog(lead: KnowledgeResearchLeadItem) {
    const leadKey = getResearchLeadKey(lead);
    setAiDraftLeadKey(leadKey);
    setAiDraftError(null);
    try {
      const draft = await generateTripResearchLeadAiDraft(tripId, toResearchLeadPayload(lead));
      setSelectedLead(null);
      setQueueLead(lead);
      setQueueDraft({
        title: draft.title.startsWith("Research:") ? draft.title : `Research: ${draft.title}`,
        source_url: "",
        raw_markdown: draft.raw_markdown,
      });
      setQueueDraftMode("ai");
      setAiDraftMeta({ confidence: draft.confidence, verification_notes: draft.verification_notes });
    } catch (error) {
      setAiDraftError(error instanceof Error ? error.message : "Failed to generate AI research draft");
    } finally {
      setAiDraftLeadKey(null);
    }
  }

  function submitQueueDraft() {
    onAddToQueue({
      title: queueDraft.title,
      source_url: queueDraft.source_url || null,
      raw_markdown: queueDraft.raw_markdown,
      extraction_focus: "stories",
      source_research_leads: queueLead ? [toResearchLeadPayload(queueLead)] : [],
    });
    setQueueLead(null);
    setAiDraftMeta(null);
  }

  async function copySearchTerms(lead: KnowledgeResearchLeadItem) {
    const terms = lead.suggested_search_terms.length > 0 ? lead.suggested_search_terms : [lead.title];
    await navigator.clipboard.writeText(terms.join("\n"));
    setCopiedLeadKey(`${lead.area}-${lead.lead_type}-${lead.title}`);
  }

  return (
    <section className="space-y-4">
      {aiDraftError ? <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{aiDraftError}</p> : null}
      {areaNames.map((area) => {
        const areaLeads = leads.filter((lead) => lead.area === area);
        return (
          <section key={area} className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">{area}</h3>
              <Badge variant="outline">{areaLeads.length} lead{areaLeads.length === 1 ? "" : "s"}</Badge>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {areaLeads.map((lead) => (
                <article key={`${lead.area}-${lead.lead_type}-${lead.title}`} className="relative space-y-2 rounded-md border bg-background p-3">
                  {lead.deletableSourceIds.length > 0 ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="absolute right-2 top-2 text-destructive hover:text-destructive"
                      onClick={() => onDeleteLead(lead.deletableSourceIds[0])}
                      disabled={isDeletingLead}
                      aria-label={`Delete research lead ${lead.title}`}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  ) : null}
                  <div className="flex flex-wrap items-start justify-between gap-3 pr-9">
                    <div className="min-w-0 space-y-1">
                      <div className="font-medium">{lead.title}</div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={lead.priority === "high" ? "default" : "outline"}>{lead.priority}</Badge>
                        <Badge variant="outline">{lead.lead_type}</Badge>
                        {lead.related_place ? <Badge variant="secondary">{lead.related_place}</Badge> : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => void copySearchTerms(lead)}>
                        <Copy className="size-4" aria-hidden />
                        {copiedLeadKey === `${lead.area}-${lead.lead_type}-${lead.title}` ? "Copied" : "Terms"}
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => openQueueDialog(lead)} disabled={isAddingToQueue}>
                        <Plus className="size-4" aria-hidden />
                        Queue
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void openAiDraftDialog(lead)}
                        disabled={aiDraftLeadKey !== null}
                      >
                        <Sparkles className="size-4" aria-hidden />
                        {aiDraftLeadKey === getResearchLeadKey(lead) ? "Drafting..." : "AI draft"}
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setSelectedLead(lead)}>
                        <Search className="size-4" aria-hidden />
                        View
                      </Button>
                    </div>
                  </div>
                  {lead.why_interesting ? <p className="text-sm text-muted-foreground">{truncateText(lead.why_interesting, 150)}</p> : null}
                  {lead.suggested_search_terms.length > 0 ? (
                    <div className="text-xs text-muted-foreground">Search: {lead.suggested_search_terms.slice(0, 3).join(", ")}</div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        );
      })}
      <Dialog open={selectedLead !== null} onOpenChange={(open) => {
        if (!open) setSelectedLead(null);
      }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedLead?.title ?? "Research lead"}</DialogTitle>
          </DialogHeader>
          {selectedLead ? (
            <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{selectedLead.area}</Badge>
                <Badge variant={selectedLead.priority === "high" ? "default" : "outline"}>{selectedLead.priority}</Badge>
                <Badge variant="outline">{selectedLead.lead_type}</Badge>
                {selectedLead.related_place ? <Badge variant="outline">{selectedLead.related_place}</Badge> : null}
                {selectedLead.potential_content_types.map((value) => <Badge key={value} variant="outline">{value}</Badge>)}
              </div>
              {selectedLead.source_reason ? <SummaryValue label="Why it was suggested" value={selectedLead.source_reason} /> : null}
              {selectedLead.why_interesting ? <SummaryValue label="Why investigate" value={selectedLead.why_interesting} /> : null}
              {selectedLead.research_questions.length > 0 ? (
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Research questions</div>
                  <ul className="mt-1 list-inside list-disc text-sm">
                    {selectedLead.research_questions.map((value) => <li key={value}>{value}</li>)}
                  </ul>
                </div>
              ) : null}
              {selectedLead.suggested_search_terms.length > 0 ? (
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Search terms</div>
                  <ul className="mt-1 list-inside list-disc text-sm">
                    {selectedLead.suggested_search_terms.map((value) => <li key={value}>{value}</li>)}
                  </ul>
                </div>
              ) : null}
              <div className="flex flex-wrap justify-end gap-2">
                {selectedLead.deletableSourceIds.length > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      onDeleteLead(selectedLead.deletableSourceIds[0]);
                      setSelectedLead(null);
                    }}
                    disabled={isDeletingLead}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Delete
                  </Button>
                ) : null}
                <Button type="button" variant="outline" onClick={() => void copySearchTerms(selectedLead)}>
                  <Copy className="size-4" aria-hidden />
                  Copy terms
                </Button>
                <Button type="button" onClick={() => openQueueDialog(selectedLead)} disabled={isAddingToQueue}>
                  <Plus className="size-4" aria-hidden />
                  Add to queue
                </Button>
                <Button type="button" onClick={() => void openAiDraftDialog(selectedLead)} disabled={aiDraftLeadKey !== null}>
                  <Sparkles className="size-4" aria-hidden />
                  {aiDraftLeadKey === getResearchLeadKey(selectedLead) ? "Drafting..." : "AI draft"}
                </Button>
              </div>
              {aiDraftError ? <p className="text-sm text-destructive">{aiDraftError}</p> : null}
              <div className="text-xs text-muted-foreground">
                Sources: {selectedLead.sourceLinks.length > 0 ? (
                  selectedLead.sourceLinks.map((source, index) => (
                    <span key={source.url}>
                      <a className="underline underline-offset-2 hover:text-foreground" href={source.url} target="_blank" rel="noreferrer">
                        {source.title}
                      </a>
                      {index < selectedLead.sourceLinks.length - 1 ? ", " : null}
                    </span>
                  ))
                ) : selectedLead.sourceTitles.join(", ")}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={queueLead !== null} onOpenChange={(open) => {
        if (!open) {
          setQueueLead(null);
          setAiDraftMeta(null);
        }
      }}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{queueDraftMode === "ai" ? "Review AI research draft" : "Add research source to queue"}</DialogTitle>
          </DialogHeader>
          {queueDraftMode === "ai" ? (
            <div className="space-y-2 rounded-md border bg-muted/20 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">AI background</Badge>
                {aiDraftMeta ? <Badge variant="outline">Confidence: {aiDraftMeta.confidence}</Badge> : null}
              </div>
              <p className="text-muted-foreground">Review and edit before accepting. This draft is generated from AI general knowledge, not from a checked source.</p>
              {aiDraftMeta?.verification_notes.length ? (
                <ul className="list-inside list-disc text-xs text-muted-foreground">
                  {aiDraftMeta.verification_notes.map((note) => <li key={note}>{note}</li>)}
                </ul>
              ) : null}
            </div>
          ) : null}
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              submitQueueDraft();
            }}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <LabeledField label="Title" htmlFor="research-queue-title">
                <Input
                  id="research-queue-title"
                  value={queueDraft.title}
                  onChange={(event) => setQueueDraft((current) => ({ ...current, title: event.target.value }))}
                />
              </LabeledField>
              <LabeledField label="Source URL" htmlFor="research-queue-source-url">
                <Input
                  id="research-queue-source-url"
                  value={queueDraft.source_url}
                  onChange={(event) => setQueueDraft((current) => ({ ...current, source_url: event.target.value }))}
                  placeholder="https://..."
                />
              </LabeledField>
            </div>
            <LabeledField label="Markdown inspiration" htmlFor="research-queue-markdown">
              <MarkdownEditor
                id="research-queue-markdown"
                value={queueDraft.raw_markdown}
                onChange={(raw_markdown) => setQueueDraft((current) => ({ ...current, raw_markdown }))}
                placeholder="Paste source notes here..."
              />
            </LabeledField>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setQueueLead(null);
                  setAiDraftMeta(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isAddingToQueue}>{isAddingToQueue ? "Adding..." : queueDraftMode === "ai" ? "Accept and queue" : "Add queued source"}</Button>
            </div>
          </form>
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
  onCreateResearchLead,
  isFavoritePending,
  isResearchPending,
}: {
  title: string;
  items: KnowledgeOverviewItem[];
  onFavorite: (item: KnowledgeOverviewItem) => void;
  onUnfavorite: (favoriteId: string) => void;
  onCreateResearchLead: (item: KnowledgeOverviewItem) => void;
  isFavoritePending: boolean;
  isResearchPending: boolean;
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
                  variant="outline"
                  onClick={() => onCreateResearchLead(item)}
                  disabled={isResearchPending}
                  aria-label={`Add ${item.name} as a research lead`}
                >
                  <Search className="size-4" aria-hidden />
                  Research
                </Button>
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

function getResearchLeadKey(lead: KnowledgeResearchLeadItem) {
  return `${lead.area}::${lead.lead_type}::${lead.related_place ?? ""}::${lead.title}`;
}

function toResearchLeadPayload(lead: KnowledgeResearchLeadItem) {
  return {
    key: getResearchLeadKey(lead),
    title: lead.title,
    lead_type: lead.lead_type,
    area: lead.area,
    related_place: lead.related_place,
    source_reason: lead.source_reason,
    why_interesting: lead.why_interesting,
    research_questions: lead.research_questions,
    suggested_search_terms: lead.suggested_search_terms,
    potential_content_types: lead.potential_content_types,
    priority: lead.priority,
    source_titles: lead.sourceTitles,
    source_links: lead.sourceLinks,
  };
}

function getStoryContentStyleLabel(value: string) {
  return tripStoryContentStyleOptions.find((option) => option.value === value)?.label ?? value.replace(/_/g, " ");
}

function getScaffoldString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function getScaffoldStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function getScaffoldOutline(value: unknown): { heading: string; points: string[] }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): { heading: string; points: string[] } | null => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const heading = getScaffoldString(record.heading);
      if (!heading) return null;
      return {
        heading,
        points: getScaffoldStringArray(record.points),
      };
    })
    .filter((item): item is { heading: string; points: string[] } => item !== null);
}
