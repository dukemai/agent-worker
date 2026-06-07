"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { tripStoryContentStyleOptions } from "@/components/dashboard/trip-constants";
import { createTripStoryContentScaffold, fetchTripDetail } from "@/components/dashboard/trip-ops-api";
import { buildKnowledgeResearchLeads, buildKnowledgeStories, truncateText } from "@/components/dashboard/trip-utils";
import type { KnowledgeResearchLeadItem, KnowledgeStoryItem } from "@/components/dashboard/trip-types";
import type { TripStoryContent } from "@/types/database";

export function TripContentBuilder({ tripId }: { tripId: string }) {
  const queryClient = useQueryClient();
  const queryKey = ["trip", tripId];
  const detailQuery = useQuery({ queryKey, queryFn: () => fetchTripDetail(tripId) });
  const [leadSearch, setLeadSearch] = useState("");
  const [selectedLeadKeys, setSelectedLeadKeys] = useState<Set<string> | null>(null);
  const [selectedStoryKeys, setSelectedStoryKeys] = useState<Set<string> | null>(null);
  const [showAllMaterials, setShowAllMaterials] = useState(false);
  const [area, setArea] = useState("");
  const [style, setStyle] = useState("concise_trip_guide");
  const [generatedContent, setGeneratedContent] = useState<TripStoryContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState("leads");

  const detail = detailQuery.data;
  const stories = useMemo(() => buildKnowledgeStories(detail?.knowledge ?? []), [detail?.knowledge]);
  const researchLeads = useMemo(() => buildKnowledgeResearchLeads(detail?.knowledge ?? []), [detail?.knowledge]);
  const leadKeys = useMemo(() => researchLeads.map((lead) => getResearchLeadKey(lead)), [researchLeads]);
  const storyKeys = useMemo(() => stories.map((story) => getStoryMaterialKey(story)), [stories]);
  const effectiveLeadKeys = selectedLeadKeys ?? new Set(leadKeys);
  const selectedLeads = researchLeads.filter((lead) => effectiveLeadKeys.has(getResearchLeadKey(lead)));
  const linkedStories = selectedLeads.length > 0
    ? stories.filter((story) => selectedLeads.some((lead) => isStoryLinkedToLead(story, lead)))
    : [];
  const visibleStories = showAllMaterials || selectedLeads.length === 0 ? stories : linkedStories;
  const defaultSelectedStoryKeys = researchLeads.length > 0 ? new Set(linkedStories.map((story) => getStoryMaterialKey(story))) : new Set(storyKeys);
  const effectiveStoryKeys = selectedStoryKeys ?? defaultSelectedStoryKeys;
  const selectedStories = visibleStories.filter((story) => effectiveStoryKeys.has(getStoryMaterialKey(story)));
  const subjectPreview = getDefaultStorySubject(selectedStories, selectedLeads);
  const filteredLeads = filterResearchLeads(researchLeads, leadSearch);
  const sourceCount = new Set(selectedStories.flatMap((story) => story.sourceLinks.map((source) => source.url || source.title))).size;
  const openQuestionCount = selectedLeads.reduce((total, lead) => total + lead.research_questions.length, 0);

  const createMutation = useMutation({
    mutationFn: () => createTripStoryContentScaffold(tripId, {
      subject: null,
      area: area || null,
      content_style: style,
      selected_materials: selectedStories.map(toStoryMaterialPayload),
      selected_research_leads: selectedLeads.map(toResearchLeadPayload),
    }),
    onSuccess: (content) => {
      setGeneratedContent(content);
      setError(null);
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to create story content"),
  });

  function setLeadSelection(next: Set<string>) {
    setSelectedLeadKeys(next);
    if (!showAllMaterials) {
      const nextLeads = researchLeads.filter((lead) => next.has(getResearchLeadKey(lead)));
      const nextStoryKeys = nextLeads.length > 0 ? getStoryKeysForLeads(stories, nextLeads) : storyKeys;
      setSelectedStoryKeys(new Set(nextStoryKeys));
    }
  }

  function toggleLead(lead: KnowledgeResearchLeadItem) {
    const key = getResearchLeadKey(lead);
    const next = new Set(effectiveLeadKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setLeadSelection(next);
  }

  function toggleStory(story: KnowledgeStoryItem) {
    const key = getStoryMaterialKey(story);
    const next = new Set(effectiveStoryKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedStoryKeys(next);
  }

  if (detailQuery.isLoading) {
    return <main className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-muted-foreground">Loading content builder...</main>;
  }
  if (detailQuery.isError || !detail) {
    return <main className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-destructive">Trip content builder could not be loaded.</main>;
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="px-0">
            <Link href={`/trips/${tripId}`}>
              <ArrowLeft className="size-4" aria-hidden />
              Trip
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Create content</h2>
            <p className="text-sm text-muted-foreground">{detail.trip.title} · {detail.trip.destination || "No destination"}</p>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href={`/trips/${tripId}`}>Back to workspace</Link>
        </Button>
      </div>

      {error ? <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}

      <Tabs value={activeStep} onValueChange={setActiveStep} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="leads" className="gap-2">
            <StepNumber>1</StepNumber>
            Leads
            <Badge variant="secondary" className="ml-1">{selectedLeads.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="materials" className="gap-2">
            <StepNumber>2</StepNumber>
            Materials
            <Badge variant="secondary" className="ml-1">{selectedStories.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="generate" className="gap-2">
            <StepNumber>3</StepNumber>
            Generate
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="space-y-4">
          <section className="space-y-3 rounded-md border bg-background p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Research leads</h3>
              <p className="text-xs text-muted-foreground">{selectedLeads.length} of {researchLeads.length} selected</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setLeadSelection(new Set(leadKeys))}>Select all</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setLeadSelection(new Set())}>Clear</Button>
            </div>
          </div>
          <Input value={leadSearch} onChange={(event) => setLeadSearch(event.target.value)} placeholder="Search leads, areas, terms..." />
          {researchLeads.length === 0 ? <p className="text-sm text-muted-foreground">No research leads yet.</p> : null}
          <div className="grid gap-2">
            {filteredLeads.map((lead) => (
              <label key={getResearchLeadKey(lead)} className="flex cursor-pointer items-start gap-3 rounded-md border bg-muted/20 p-3 hover:bg-muted/40">
                <input
                  type="checkbox"
                  className="mt-1 size-4"
                  checked={effectiveLeadKeys.has(getResearchLeadKey(lead))}
                  onChange={() => toggleLead(lead)}
                />
                <span className="min-w-0 space-y-2 text-sm">
                  <span className="block font-medium">{lead.title}</span>
                  <span className="flex flex-wrap gap-2">
                    <Badge variant={lead.priority === "high" ? "default" : "outline"}>{lead.priority}</Badge>
                    <Badge variant="outline">{lead.lead_type}</Badge>
                    {lead.area ? <Badge variant="secondary">{lead.area}</Badge> : null}
                    {lead.related_place ? <Badge variant="outline">{lead.related_place}</Badge> : null}
                  </span>
                  {lead.why_interesting ? <span className="block text-muted-foreground">{truncateText(lead.why_interesting, 170)}</span> : null}
                  {lead.suggested_search_terms.length > 0 ? (
                    <span className="block text-xs text-muted-foreground">Search: {lead.suggested_search_terms.slice(0, 5).join(", ")}</span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
          </section>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" onClick={() => setActiveStep("materials")}>Next: materials</Button>
          </div>
        </TabsContent>

        <TabsContent value="materials" className="space-y-4">
          <section className="space-y-3 rounded-md border bg-background p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Story materials</h3>
              <p className="text-xs text-muted-foreground">{selectedStories.length} of {visibleStories.length} visible selected</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={showAllMaterials ? "default" : "outline"}
                onClick={() => {
                  const next = !showAllMaterials;
                  setShowAllMaterials(next);
                  setSelectedStoryKeys(new Set(next ? storyKeys : getStoryKeysForLeads(stories, selectedLeads)));
                }}
              >
                {showAllMaterials ? "All materials" : "Linked only"}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setSelectedStoryKeys(new Set(visibleStories.map((story) => getStoryMaterialKey(story))))}>Select visible</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setSelectedStoryKeys(new Set())}>Clear</Button>
            </div>
          </div>
          {stories.length === 0 ? <p className="text-sm text-muted-foreground">No story materials yet.</p> : null}
          {visibleStories.length === 0 ? (
            <p className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">No story materials are linked to the selected leads yet. Queue source notes from those leads and extract them, or switch to all materials.</p>
          ) : null}
          <div className="grid gap-2">
            {visibleStories.map((story) => (
              <label key={getStoryMaterialKey(story)} className="flex cursor-pointer items-start gap-3 rounded-md border bg-muted/20 p-3 hover:bg-muted/40">
                <input
                  type="checkbox"
                  className="mt-1 size-4"
                  checked={effectiveStoryKeys.has(getStoryMaterialKey(story))}
                  onChange={() => toggleStory(story)}
                />
                <span className="min-w-0 space-y-2 text-sm">
                  <span className="block font-medium">{story.title}</span>
                  <span className="flex flex-wrap gap-2">
                    {story.story_type ? <Badge variant="outline">{story.story_type.replace(/_/g, " ")}</Badge> : null}
                    {story.area ? <Badge variant="secondary">{story.area}</Badge> : null}
                    {story.related_place ? <Badge variant="outline">{story.related_place}</Badge> : null}
                    {story.sourceResearchLeads.length > 0 ? <Badge variant="outline">{story.sourceResearchLeads.length} linked lead{story.sourceResearchLeads.length === 1 ? "" : "s"}</Badge> : null}
                  </span>
                  {story.summary ? <span className="block text-muted-foreground">{truncateText(story.summary, 190)}</span> : null}
                </span>
              </label>
            ))}
          </div>
          </section>
          <div className="flex flex-wrap justify-between gap-2">
            <Button type="button" variant="outline" onClick={() => setActiveStep("leads")}>Back: leads</Button>
            <Button type="button" onClick={() => setActiveStep("generate")}>Next: generate</Button>
          </div>
        </TabsContent>

        <TabsContent value="generate" className="space-y-4">
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.45fr)]">
            <div className="space-y-3 rounded-md border bg-background p-3">
          <h3 className="text-sm font-semibold">Generation setup</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryValue label="Subject preview" value={subjectPreview || "AI will derive this from the selected bundle."} />
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="content-area">Area</label>
              <Input id="content-area" value={area} onChange={(event) => setArea(event.target.value)} placeholder="Visby" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="content-style">Style</label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger id="content-style"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tripStoryContentStyleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-4">
            <SummaryValue label="Leads" value={String(selectedLeads.length)} />
            <SummaryValue label="Materials" value={String(selectedStories.length)} />
            <SummaryValue label="Sources" value={String(sourceCount)} />
            <SummaryValue label="Open questions" value={String(openQuestionCount)} />
          </div>
          <Button type="button" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || selectedStories.length === 0}>
            <Sparkles className="size-4" aria-hidden />
            {createMutation.isPending ? "Generating..." : "Generate scaffold"}
          </Button>
            </div>

            <div className="space-y-3 rounded-md border bg-background p-3">
          <h3 className="text-sm font-semibold">Result</h3>
          {generatedContent ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="size-4" aria-hidden />
                Scaffold saved
              </div>
              <div className="font-medium">{getScaffoldString(generatedContent.scaffold.suggested_title) ?? generatedContent.subject}</div>
              {getScaffoldString(generatedContent.scaffold.short_version) ? (
                <p className="text-sm text-muted-foreground">{truncateText(getScaffoldString(generatedContent.scaffold.short_version) ?? "", 260)}</p>
              ) : null}
              <Button asChild variant="outline">
                <Link href={`/trips/${tripId}`}>View in Knowledge</Link>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Generated scaffolds will appear here after they are saved.</p>
          )}
            </div>
          </section>
          <div className="flex flex-wrap justify-start gap-2">
            <Button type="button" variant="outline" onClick={() => setActiveStep("materials")}>Back: materials</Button>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function StepNumber({ children }: { children: string }) {
  return (
    <span className="inline-flex size-5 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
      {children}
    </span>
  );
}

function SummaryValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/30 px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 whitespace-pre-wrap text-sm">{value}</div>
    </div>
  );
}

function filterResearchLeads(leads: KnowledgeResearchLeadItem[], search: string) {
  const query = search.trim().toLocaleLowerCase("sv-SE");
  if (!query) return leads;
  return leads.filter((lead) => [
    lead.title,
    lead.area,
    lead.related_place,
    lead.lead_type,
    lead.why_interesting,
    ...lead.suggested_search_terms,
  ].some((value) => value?.toLocaleLowerCase("sv-SE").includes(query)));
}

function getStoryMaterialKey(story: KnowledgeStoryItem) {
  return `${story.area}::${story.related_place ?? ""}::${story.title}`;
}

function getResearchLeadKey(lead: KnowledgeResearchLeadItem) {
  return `${lead.area}::${lead.lead_type}::${lead.related_place ?? ""}::${lead.title}`;
}

function getDefaultStorySubject(stories: KnowledgeStoryItem[], leads: KnowledgeResearchLeadItem[] = []) {
  const leadPlaces = leads.map((lead) => lead.related_place).filter((value): value is string => Boolean(value));
  if (leadPlaces.length > 0) return leadPlaces[0];
  if (leads.length > 0) return leads[0].title;
  const relatedPlaces = stories.map((story) => story.related_place).filter((value): value is string => Boolean(value));
  if (relatedPlaces.length > 0) return relatedPlaces[0];
  return stories[0]?.title ?? "";
}

function toStoryMaterialPayload(story: KnowledgeStoryItem) {
  return {
    title: story.title,
    story_type: story.story_type,
    area: story.area,
    related_place: story.related_place,
    summary: story.summary,
    story: story.story,
    why_it_matters: story.why_it_matters,
    what_to_notice: story.what_to_notice,
    good_for: story.good_for,
    source_titles: story.sourceTitles,
    source_links: story.sourceLinks,
    source_research_leads: story.sourceResearchLeads,
  };
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

function isStoryLinkedToLead(story: KnowledgeStoryItem, lead: KnowledgeResearchLeadItem) {
  const leadKey = getResearchLeadKey(lead);
  return story.sourceResearchLeads.some((reference) => reference.key === leadKey);
}

function getStoryKeysForLeads(stories: KnowledgeStoryItem[], leads: KnowledgeResearchLeadItem[]) {
  return stories
    .filter((story) => leads.some((lead) => isStoryLinkedToLead(story, lead)))
    .map((story) => getStoryMaterialKey(story));
}

function getScaffoldString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}
