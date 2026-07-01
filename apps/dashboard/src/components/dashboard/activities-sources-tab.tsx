"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ACTIVITY_SOURCE_SCOPE_OPTIONS, isActivitySourceScope } from "@/lib/activity-source-scopes";
import { buildActivityCaptureBookmarklet } from "@/lib/activity-capture-bookmarklet";
import { cn } from "@/lib/utils";
import {
  createActivitySourceMapping,
  createActivitySource,
  deleteActivitySourceMapping,
  deleteActivitySource,
  extractActivitySource,
  fetchActivitySource,
  fetchActivitySourceMappings,
  fetchActivitySources,
  importActivitySourceMappings,
  markActivitySourceMappingChecked,
  resetActivitySourceMappingChecked,
  updateActivitySourceMapping,
  updateActivitySource,
} from "./activities-api";
import type {
  ActivitySource,
  ActivitySourceCategory,
  ActivitySourceLanguage,
  ActivitySourceMapping,
  ActivitySourceTrust,
} from "@/types/database";

const SOURCE_CATEGORIES: ActivitySourceCategory[] = [
  "official_city",
  "municipality",
  "museum",
  "library",
  "event_platform",
  "venue",
  "blog",
  "community",
  "unknown",
];
const SOURCE_TRUST_LEVELS: ActivitySourceTrust[] = ["official", "partner", "community", "unknown"];
const SOURCE_LANGUAGES: ActivitySourceLanguage[] = ["sv", "en", "mixed", "unknown"];
const CHECK_FREQUENCIES: ActivitySourceMapping["check_frequency"][] = ["weekly", "monthly", "seasonal"];

const subscribeToOrigin = () => () => undefined;
const getBrowserOrigin = () => window.location.origin;
const getServerOrigin = () => "";

function BookmarkletInstaller({ onHint }: { onHint: (message: string) => void }) {
  const origin = useSyncExternalStore(subscribeToOrigin, getBrowserOrigin, getServerOrigin);
  const bookmarklet = origin ? buildActivityCaptureBookmarklet(origin) : "#";
  return (
    <Button size="sm" variant="outline" asChild>
      <a
        href={bookmarklet}
        draggable
        aria-label="Save to Summer Activities bookmarklet"
        title="Drag this button to your browser bookmarks bar"
        onClick={(event) => {
          event.preventDefault();
          onHint("Drag “Save to Summer Activities” to your browser bookmarks bar.");
        }}
        onDragStart={(event) => {
          const bookmarkTitle = "Save to Summer Activities";
          const link = document.createElement("a");
          link.href = bookmarklet;
          link.textContent = bookmarkTitle;
          event.dataTransfer.effectAllowed = "link";
          event.dataTransfer.setData("text/html", link.outerHTML);
          event.dataTransfer.setData("text/uri-list", bookmarklet);
          event.dataTransfer.setData("text/plain", bookmarklet);
          event.dataTransfer.setData("text/x-moz-url", `${bookmarklet}\n${bookmarkTitle}`);
          event.dataTransfer.setData("text/x-moz-url-data", bookmarklet);
          event.dataTransfer.setData("text/x-moz-url-desc", bookmarkTitle);
        }}
      >
        Save to Summer Activities
      </a>
    </Button>
  );
}

type DirectoryStatus = "needs_setup" | "due" | "fresh" | "collected";

function directoryStatus(mapping: ActivitySourceMapping, sources: ActivitySource[]): DirectoryStatus {
  if (!mapping.activity_listing_url || !mapping.collection_focus || !mapping.collection_instructions) return "needs_setup";
  const hasSeasonImport = sources.some(
    (source) =>
      source.source_domain !== null &&
      (source.source_domain === mapping.source_domain || source.source_domain.endsWith(`.${mapping.source_domain}`)) &&
      new Date(source.created_at) >= new Date("2026-01-01T00:00:00Z")
  );
  if (hasSeasonImport) return "collected";
  if (!mapping.last_checked_at) return "due";
  const ageDays = (Date.now() - new Date(mapping.last_checked_at).getTime()) / 86_400_000;
  const freshDays = mapping.check_frequency === "weekly" ? 7 : mapping.check_frequency === "monthly" ? 30 : 120;
  return ageDays <= freshDays ? "fresh" : "due";
}

function directoryStatusLabel(status: DirectoryStatus) {
  return { needs_setup: "Needs setup", due: "Due", fresh: "Fresh", collected: "Collected" }[status];
}

function isOfficialSource(source: ActivitySource) {
  return source.source_trust === "official";
}

function sourceBadgeClass(source: ActivitySource) {
  return isOfficialSource(source)
    ? "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200"
    : undefined;
}

function mappingBadgeClass(mapping: ActivitySourceMapping) {
  return mapping.source_trust === "official"
    ? "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200"
    : undefined;
}

function formatSourceScope(scope: string) {
  return ACTIVITY_SOURCE_SCOPE_OPTIONS.find((option) => option.value === scope)?.label ?? scope.replaceAll("_", " ");
}

function CompactSourceOverview({
  sourceStats,
  provenanceStats,
}: {
  sourceStats: {
    total: number;
    queued: number;
    processing: number;
    processed: number;
    failed: number;
    extracted: number;
  };
  provenanceStats: {
    official: number;
    municipality: number;
    officialCity: number;
    unknown: number;
    scopes: Set<string>;
  };
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border bg-muted/10 px-3 py-2 text-sm">
      <span className="font-medium tabular-nums">{sourceStats.total} sources</span>
      <span className="text-muted-foreground">
        {sourceStats.queued} queued · {sourceStats.processing} processing · {sourceStats.processed} processed
      </span>
      {sourceStats.failed > 0 ? <span className="font-medium text-red-600">{sourceStats.failed} failed</span> : null}
      <span className="text-muted-foreground">{sourceStats.extracted} activities extracted</span>
      <span className="text-muted-foreground">
        {provenanceStats.official} official · {provenanceStats.unknown} unknown · {provenanceStats.scopes.size} scopes
      </span>
    </div>
  );
}

function KnownSourceMappings({
  mappings,
  loading,
  onAdd,
  onEdit,
  onDelete,
  onAddNotes,
  onMarkChecked,
  onResetChecked,
  sources,
  deletePending,
}: {
  mappings: ActivitySourceMapping[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (mapping: ActivitySourceMapping) => void;
  onDelete: (id: string) => void;
  onAddNotes: (mapping: ActivitySourceMapping) => void;
  onMarkChecked: (id: string) => void;
  onResetChecked: (id: string) => void;
  sources: ActivitySource[];
  deletePending: boolean;
}) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading source mappings...</p>;
  }

  if (mappings.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Official Source Directory</h2>
          <p className="text-xs text-muted-foreground">Places to check when gathering activity information.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{mappings.length} mapped</Badge>
          <Button type="button" size="sm" variant="outline" onClick={onAdd}>
            Add mapping
          </Button>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {mappings.map((mapping) => {
          const status = directoryStatus(mapping, sources);
          return (
          <div
            key={mapping.source_domain}
            className={cn(
              "rounded-md border bg-muted/10 px-3 py-2",
              mapping.source_trust === "official" &&
                "border-blue-200/80 bg-blue-50/30 dark:border-blue-900/50 dark:bg-blue-950/10"
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{mapping.source_name ?? mapping.source_domain}</p>
                <p className="text-xs text-muted-foreground">{mapping.source_domain}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {mapping.last_checked_at ? (
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
                    <CheckCircle2 className="size-3" aria-hidden />
                    Checked {new Date(mapping.last_checked_at).toLocaleDateString("sv-SE")}
                  </Badge>
                ) : null}
                {mapping.source_trust === "official" ? (
                  <Badge className="bg-blue-600 text-white hover:bg-blue-600">Official</Badge>
                ) : null}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="outline" className={cn("capitalize", mappingBadgeClass(mapping))}>
                {mapping.source_trust}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {mapping.source_category.replaceAll("_", " ")}
              </Badge>
              <Badge variant="outline">{formatSourceScope(mapping.source_scope)}</Badge>
              <Badge variant="outline">{mapping.source_language}</Badge>
              {mapping.is_core ? <Badge variant="outline">Core target</Badge> : null}
              <Badge variant="outline" className="capitalize">{directoryStatusLabel(status)}</Badge>
            </div>
            {mapping.gathering_notes ? (
              <p className="mt-2 text-sm text-muted-foreground">{mapping.gathering_notes}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {mapping.activity_listing_url ?? mapping.homepage_url ? (
                <Button type="button" size="xs" variant="outline" asChild>
                  <a href={mapping.activity_listing_url ?? mapping.homepage_url ?? undefined} target="_blank" rel="noreferrer">
                    Open site <ExternalLink className="size-3" aria-hidden />
                  </a>
                </Button>
              ) : null}
              <Button type="button" size="xs" onClick={() => onAddNotes(mapping)}>
                Add notes
              </Button>
              <Button type="button" size="xs" variant="outline" onClick={() => onMarkChecked(mapping.id)}>
                <CheckCircle2 className="size-3" aria-hidden />
                {mapping.last_checked_at ? "Update check" : "Mark checked"}
              </Button>
              {mapping.last_checked_at ? (
                <Button type="button" size="xs" variant="ghost" onClick={() => onResetChecked(mapping.id)}>
                  Reset check
                </Button>
              ) : null}
              <Button type="button" size="xs" variant="outline" onClick={() => onEdit(mapping)}>
                Edit
              </Button>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                className="text-red-600 hover:text-red-700"
                onClick={() => onDelete(mapping.id)}
                disabled={deletePending}
              >
                Remove
              </Button>
            </div>
          </div>
          );
        })}
      </div>
    </section>
  );
}

export function ActivitiesSourcesTab() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [sourceDialogMode, setSourceDialogMode] = useState<"source" | "notes">("source");
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [detailMode, setDetailMode] = useState<"view" | "edit">("view");
  const [editTitle, setEditTitle] = useState("");
  const [editSourceUrl, setEditSourceUrl] = useState("");
  const [editMarkdown, setEditMarkdown] = useState("");
  const [mappingOpen, setMappingOpen] = useState(false);
  const [mappingMode, setMappingMode] = useState<"create" | "edit">("create");
  const [mappingId, setMappingId] = useState<string | null>(null);
  const [mappingDomain, setMappingDomain] = useState("");
  const [mappingName, setMappingName] = useState("");
  const [mappingHomepageUrl, setMappingHomepageUrl] = useState("");
  const [mappingActivityUrl, setMappingActivityUrl] = useState("");
  const [mappingGatheringNotes, setMappingGatheringNotes] = useState("");
  const [mappingCollectionFocus, setMappingCollectionFocus] = useState("");
  const [mappingCollectionInstructions, setMappingCollectionInstructions] = useState("");
  const [mappingCheckFrequency, setMappingCheckFrequency] = useState<ActivitySourceMapping["check_frequency"]>("weekly");
  const [mappingSeasonTarget, setMappingSeasonTarget] = useState("summer_2026");
  const [mappingIsCore, setMappingIsCore] = useState(false);
  const [mappingLastCheckedAt, setMappingLastCheckedAt] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [mappingCategory, setMappingCategory] = useState<ActivitySourceCategory>("unknown");
  const [mappingScope, setMappingScope] = useState("unknown");
  const [mappingTrust, setMappingTrust] = useState<ActivitySourceTrust>("unknown");
  const [mappingLanguage, setMappingLanguage] = useState<ActivitySourceLanguage>("unknown");
  const [showCompletedSources, setShowCompletedSources] = useState(false);

  const sourcesQuery = useQuery({
    queryKey: ["activities", "sources"],
    queryFn: fetchActivitySources,
  });
  const sourceMappingsQuery = useQuery({
    queryKey: ["activities", "source-mappings"],
    queryFn: fetchActivitySourceMappings,
  });
  const selectedSourceQuery = useQuery({
    queryKey: ["activities", "sources", selectedSourceId],
    queryFn: () => fetchActivitySource(selectedSourceId!),
    enabled: selectedSourceId !== null,
  });
  const selectedSource = selectedSourceQuery.data?.source ?? null;

  useEffect(() => {
    if (!selectedSource || detailMode !== "edit") return;
    setEditTitle(selectedSource.title);
    setEditSourceUrl(selectedSource.source_url ?? "");
    setEditMarkdown(selectedSource.raw_markdown);
  }, [selectedSource, detailMode]);

  const createMutation = useMutation({
    mutationFn: createActivitySource,
    onSuccess: async () => {
      setTitle("");
      setSourceUrl("");
      setMarkdown("");
      setOpen(false);
      setSourceDialogMode("source");
      await queryClient.invalidateQueries({ queryKey: ["activities", "sources"] });
    },
  });

  const extractMutation = useMutation({
    mutationFn: extractActivitySource,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["activities"] }),
        queryClient.invalidateQueries({ queryKey: ["activities", "sources"] }),
      ]);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { title: string; source_url: string | null; raw_markdown: string };
    }) => updateActivitySource(id, payload),
    onSuccess: async (result) => {
      setDetailMode("view");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["activities"] }),
        queryClient.invalidateQueries({ queryKey: ["activities", "sources"] }),
        queryClient.invalidateQueries({ queryKey: ["activities", "sources", result.source.id] }),
      ]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteActivitySource,
    onSuccess: async () => {
      setSelectedSourceId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["activities"] }),
        queryClient.invalidateQueries({ queryKey: ["activities", "sources"] }),
      ]);
    },
  });

  const createMappingMutation = useMutation({
    mutationFn: createActivitySourceMapping,
    onSuccess: async () => {
      setMappingOpen(false);
      resetMappingForm();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["activities", "source-mappings"] }),
        queryClient.invalidateQueries({ queryKey: ["activities", "sources"] }),
      ]);
    },
  });

  const updateMappingMutation = useMutation({
    mutationFn: () => {
      if (!mappingId) throw new Error("Mapping id is required");
      return updateActivitySourceMapping(mappingId, mappingPayload());
    },
    onSuccess: async () => {
      setMappingOpen(false);
      resetMappingForm();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["activities", "source-mappings"] }),
        queryClient.invalidateQueries({ queryKey: ["activities", "sources"] }),
      ]);
    },
  });

  const deleteMappingMutation = useMutation({
    mutationFn: deleteActivitySourceMapping,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["activities", "source-mappings"] }),
        queryClient.invalidateQueries({ queryKey: ["activities", "sources"] }),
      ]);
    },
  });
  const markCheckedMutation = useMutation({
    mutationFn: markActivitySourceMappingChecked,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["activities", "source-mappings"] }),
  });
  const resetCheckedMutation = useMutation({
    mutationFn: resetActivitySourceMappingChecked,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["activities", "source-mappings"] }),
  });
  const importMappingsMutation = useMutation({
    mutationFn: importActivitySourceMappings,
    onSuccess: async (result) => {
      setImportMessage(`${result.imported} directory sources imported`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["activities", "source-mappings"] }),
        queryClient.invalidateQueries({ queryKey: ["activities", "sources"] }),
      ]);
    },
  });

  async function onImportFile(file: File | undefined) {
    if (!file) return;
    setImportMessage(null);
    let payload: unknown;
    try {
      payload = JSON.parse(await file.text());
    } catch {
      setImportMessage("That file does not contain valid JSON");
      return;
    }
    await importMappingsMutation.mutateAsync(payload);
  }

  function resetMappingForm() {
    setMappingMode("create");
    setMappingId(null);
    setMappingDomain("");
    setMappingName("");
    setMappingHomepageUrl("");
    setMappingActivityUrl("");
    setMappingGatheringNotes("");
    setMappingCollectionFocus("");
    setMappingCollectionInstructions("");
    setMappingCheckFrequency("weekly");
    setMappingSeasonTarget("summer_2026");
    setMappingIsCore(false);
    setMappingLastCheckedAt(null);
    setMappingCategory("unknown");
    setMappingScope("unknown");
    setMappingTrust("unknown");
    setMappingLanguage("unknown");
  }

  function mappingPayload() {
    return {
      source_domain: mappingDomain.trim(),
      source_name: mappingName.trim() || null,
      homepage_url: mappingHomepageUrl.trim() || null,
      activity_listing_url: mappingActivityUrl.trim() || null,
      gathering_notes: mappingGatheringNotes.trim() || null,
      collection_focus: mappingCollectionFocus.trim() || null,
      collection_instructions: mappingCollectionInstructions.trim() || null,
      check_frequency: mappingCheckFrequency,
      last_checked_at: mappingLastCheckedAt,
      season_target: mappingSeasonTarget.trim(),
      is_core: mappingIsCore,
      source_category: mappingCategory,
      source_scope: mappingScope,
      source_trust: mappingTrust,
      source_language: mappingLanguage,
    };
  }

  function openMappingCreate() {
    resetMappingForm();
    setMappingOpen(true);
  }

  function openMappingEdit(mapping: ActivitySourceMapping) {
    setMappingMode("edit");
    setMappingId(mapping.id);
    setMappingDomain(mapping.source_domain);
    setMappingName(mapping.source_name ?? "");
    setMappingHomepageUrl(mapping.homepage_url ?? "");
    setMappingActivityUrl(mapping.activity_listing_url ?? "");
    setMappingGatheringNotes(mapping.gathering_notes ?? "");
    setMappingCollectionFocus(mapping.collection_focus ?? "");
    setMappingCollectionInstructions(mapping.collection_instructions ?? "");
    setMappingCheckFrequency(mapping.check_frequency);
    setMappingSeasonTarget(mapping.season_target);
    setMappingIsCore(mapping.is_core);
    setMappingLastCheckedAt(mapping.last_checked_at);
    setMappingCategory(mapping.source_category);
    setMappingScope(isActivitySourceScope(mapping.source_scope) ? mapping.source_scope : "unknown");
    setMappingTrust(mapping.source_trust);
    setMappingLanguage(mapping.source_language);
    setMappingOpen(true);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createMutation.mutateAsync({
      title: title.trim(),
      source_url: sourceUrl.trim() || null,
      raw_markdown: markdown.trim(),
    });
  }

  async function onSubmitMapping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mappingMode === "create") {
      await createMappingMutation.mutateAsync(mappingPayload());
    } else {
      await updateMappingMutation.mutateAsync();
    }
  }

  async function onSubmitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSource) return;
    await updateMutation.mutateAsync({
      id: selectedSource.id,
      payload: {
        title: editTitle.trim(),
        source_url: editSourceUrl.trim() || null,
        raw_markdown: editMarkdown.trim(),
      },
    });
  }

  function openDetail(source: ActivitySource, mode: "view" | "edit") {
    setSelectedSourceId(source.id);
    setDetailMode(mode);
    if (mode === "edit") {
      setEditTitle(source.title);
      setEditSourceUrl(source.source_url ?? "");
      setEditMarkdown("");
    }
  }

  function openAddNotes(mapping: ActivitySourceMapping) {
    setSourceDialogMode("notes");
    setTitle(mapping.source_name ?? mapping.source_domain);
    setSourceUrl(mapping.activity_listing_url ?? mapping.homepage_url ?? `https://${mapping.source_domain}`);
    setMarkdown("");
    setOpen(true);
  }

  const error =
    sourcesQuery.error instanceof Error
      ? sourcesQuery.error.message
      : createMutation.error instanceof Error
        ? createMutation.error.message
        : extractMutation.error instanceof Error
          ? extractMutation.error.message
          : updateMutation.error instanceof Error
            ? updateMutation.error.message
            : deleteMutation.error instanceof Error
              ? deleteMutation.error.message
              : sourceMappingsQuery.error instanceof Error
                ? sourceMappingsQuery.error.message
                : selectedSourceQuery.error instanceof Error
                  ? selectedSourceQuery.error.message
                  : createMappingMutation.error instanceof Error
                    ? createMappingMutation.error.message
                    : updateMappingMutation.error instanceof Error
                      ? updateMappingMutation.error.message
                      : deleteMappingMutation.error instanceof Error
                        ? deleteMappingMutation.error.message
                        : markCheckedMutation.error instanceof Error
                          ? markCheckedMutation.error.message
                          : resetCheckedMutation.error instanceof Error
                            ? resetCheckedMutation.error.message
                          : importMappingsMutation.error instanceof Error
                            ? importMappingsMutation.error.message
                        : null;
  const sources = sourcesQuery.data?.sources ?? [];
  const completedSourcesCount = sources.filter((source) => source.status === "processed").length;
  const visibleSources = showCompletedSources ? sources : sources.filter((source) => source.status !== "processed");
  const sourceMappings = [...(sourceMappingsQuery.data?.mappings ?? [])].sort((a, b) => {
    if (a.source_trust === "official" && b.source_trust !== "official") return -1;
    if (a.source_trust !== "official" && b.source_trust === "official") return 1;
    return formatSourceScope(a.source_scope).localeCompare(formatSourceScope(b.source_scope));
  });
  const sourceStats = sources.reduce(
    (acc, source) => {
      acc.total += 1;
      acc.extracted += source.activities_extracted;
      acc[source.status] += 1;
      return acc;
    },
    { total: 0, queued: 0, processing: 0, processed: 0, failed: 0, extracted: 0 }
  );
  const provenanceStats = sources.reduce(
    (acc, source) => {
      if (source.source_trust === "official") acc.official += 1;
      if (source.source_category === "municipality") acc.municipality += 1;
      if (source.source_category === "official_city") acc.officialCity += 1;
      if (source.source_category === "unknown") acc.unknown += 1;
      if (source.source_scope && source.source_scope !== "unknown") acc.scopes.add(source.source_scope);
      return acc;
    },
    { official: 0, municipality: 0, officialCity: 0, unknown: 0, scopes: new Set<string>() }
  );
  const coreMappings = sourceMappings.filter((mapping) => mapping.is_core && mapping.season_target === "summer_2026");
  const coreStatuses = coreMappings.map((mapping) => directoryStatus(mapping, sources));
  const readyCount = coreStatuses.filter((status) => status !== "needs_setup").length;
  const checkedCount = coreStatuses.filter((status) => status === "fresh" || status === "collected").length;
  const collectedCount = coreStatuses.filter((status) => status === "collected").length;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        {error ? <p className="text-sm text-red-600">{error}</p> : importMessage ? <p className="text-sm text-muted-foreground">{importMessage}</p> : <span />}
        <div className="flex flex-wrap items-center gap-2">
          <BookmarkletInstaller onHint={setImportMessage} />
          <Button type="button" size="sm" variant="outline" asChild disabled={importMappingsMutation.isPending}>
            <label className="cursor-pointer">
              {importMappingsMutation.isPending ? "Importing..." : "Import directory JSON"}
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(event) => {
                  void onImportFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          </Button>
          <Button type="button" size="sm" variant="ghost" asChild>
            <a href="/templates/activity-source-directory.json" download>JSON template</a>
          </Button>
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) setSourceDialogMode("source");
            }}
          >
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" onClick={() => setSourceDialogMode("source")}>
              Add source
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" showCloseButton>
            <DialogHeader>
              <DialogTitle>{sourceDialogMode === "notes" ? `Add notes from ${title}` : "Add Activity Source"}</DialogTitle>
            </DialogHeader>
            <form id="activity-source-form" className="space-y-3" onSubmit={onSubmit}>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Source title" required autoFocus />
              <Input
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                placeholder="Optional source URL"
                type="url"
              />
              <Textarea
                value={markdown}
                onChange={(event) => setMarkdown(event.target.value)}
                placeholder={sourceDialogMode === "notes" ? "Paste notes gathered from this official site" : "Paste Markdown activity suggestions"}
                rows={12}
                className="resize-y"
                required
              />
            </form>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" form="activity-source-form" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding..." : sourceDialogMode === "notes" ? "Add to queue" : "Save source"}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {sourcesQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading sources...</p> : null}

      <CompactSourceOverview sourceStats={sourceStats} provenanceStats={provenanceStats} />

      <div className="rounded-md border bg-muted/10 px-3 py-3">
        <p className="text-sm font-semibold">Summer 2026 sourcing target</p>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <span><strong>{coreMappings.length}</strong> core sources planned</span>
          <span><strong>{readyCount}/{coreMappings.length || 0}</strong> ready</span>
          <span><strong>{checkedCount}/{coreMappings.length || 0}</strong> checked recently</span>
          <span><strong>{collectedCount}/{coreMappings.length || 0}</strong> collected this season</span>
        </div>
      </div>

      <KnownSourceMappings
        mappings={sourceMappings}
        loading={sourceMappingsQuery.isLoading}
        onAdd={openMappingCreate}
        onEdit={openMappingEdit}
        onDelete={(id) => deleteMappingMutation.mutate(id)}
        onAddNotes={openAddNotes}
        onMarkChecked={(id) => markCheckedMutation.mutate(id)}
        onResetChecked={(id) => resetCheckedMutation.mutate(id)}
        sources={sources}
        deletePending={deleteMappingMutation.isPending}
      />

      <Dialog
        open={mappingOpen}
        onOpenChange={(next) => {
          setMappingOpen(next);
          if (!next) resetMappingForm();
        }}
      >
        <DialogContent className="max-w-xl" showCloseButton>
          <DialogHeader>
            <DialogTitle>{mappingMode === "create" ? "Add Source Mapping" : "Edit Source Mapping"}</DialogTitle>
          </DialogHeader>
          <form id="activity-source-mapping-form" className="space-y-3" onSubmit={onSubmitMapping}>
            <Input
              value={mappingDomain}
              onChange={(event) => setMappingDomain(event.target.value)}
              placeholder="Domain, e.g. visitstockholm.se"
              required
            />
            <Input
              value={mappingName}
              onChange={(event) => setMappingName(event.target.value)}
              placeholder="Display name, e.g. Visit Stockholm"
            />
            <Input
              value={mappingHomepageUrl}
              onChange={(event) => setMappingHomepageUrl(event.target.value)}
              placeholder="Homepage URL"
              type="url"
            />
            <Input
              value={mappingActivityUrl}
              onChange={(event) => setMappingActivityUrl(event.target.value)}
              placeholder="Preferred activity listing URL"
              type="url"
            />
            <Textarea
              value={mappingGatheringNotes}
              onChange={(event) => setMappingGatheringNotes(event.target.value)}
              placeholder="Gathering notes, e.g. Check school holiday programs"
              rows={3}
            />
            <Textarea
              value={mappingCollectionFocus}
              onChange={(event) => setMappingCollectionFocus(event.target.value)}
              placeholder="What to collect from this source"
              rows={3}
            />
            <Textarea
              value={mappingCollectionInstructions}
              onChange={(event) => setMappingCollectionInstructions(event.target.value)}
              placeholder="How to find and capture the useful information"
              rows={3}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select value={mappingCheckFrequency} onValueChange={(value) => setMappingCheckFrequency(value as ActivitySourceMapping["check_frequency"])}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Check frequency" /></SelectTrigger>
                <SelectContent>
                  {CHECK_FREQUENCIES.map((frequency) => <SelectItem key={frequency} value={frequency}>{frequency}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input value={mappingSeasonTarget} onChange={(event) => setMappingSeasonTarget(event.target.value)} placeholder="Season target" required />
              <Select value={mappingScope} onValueChange={setMappingScope}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Scope" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_SOURCE_SCOPE_OPTIONS.map((scope) => (
                    <SelectItem key={scope.value} value={scope.value}>
                      {scope.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={mappingCategory} onValueChange={(value) => setMappingCategory(value as ActivitySourceCategory)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={mappingTrust} onValueChange={(value) => setMappingTrust(value as ActivitySourceTrust)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Trust" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TRUST_LEVELS.map((trust) => (
                    <SelectItem key={trust} value={trust}>
                      {trust}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={mappingLanguage} onValueChange={(value) => setMappingLanguage(value as ActivitySourceLanguage)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_LANGUAGES.map((language) => (
                    <SelectItem key={language} value={language}>
                      {language}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={mappingIsCore} onChange={(event) => setMappingIsCore(event.target.checked)} />
              Include in core sourcing target
            </label>
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMappingOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="activity-source-mapping-form"
              disabled={createMappingMutation.isPending || updateMappingMutation.isPending}
            >
              {createMappingMutation.isPending || updateMappingMutation.isPending ? "Saving..." : "Save mapping"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Extraction queue</h2>
          {completedSourcesCount > 0 ? (
            <Button type="button" size="xs" variant="outline" onClick={() => setShowCompletedSources((value) => !value)}>
              {showCompletedSources ? "Hide completed" : `Show completed (${completedSourcesCount})`}
            </Button>
          ) : null}
        </div>
        {visibleSources.length === 0 && !sourcesQuery.isLoading ? (
          <p className="text-sm italic text-muted-foreground">No active queue items.</p>
        ) : null}
        <div className="grid gap-3">
        {visibleSources.map((source) => {
          const canExtract = source.status === "queued" || source.status === "failed";
          const isExtracting = extractMutation.isPending && extractMutation.variables === source.id;
          const official = isOfficialSource(source);
          return (
            <Card
              key={source.id}
              className={cn(
                official &&
                  "border-blue-200/80 bg-blue-50/30 shadow-sm dark:border-blue-900/50 dark:bg-blue-950/10"
              )}
            >
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <span>{source.title}</span>
                    {official ? <Badge className="bg-blue-600 text-white hover:bg-blue-600">Official</Badge> : null}
                  </span>
                  <Badge variant="outline" className="capitalize">
                    {source.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {source.source_url ? (
                  <a href={source.source_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary underline">
                    {source.source_url}
                  </a>
                ) : null}
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className={sourceBadgeClass(source)}>
                    {source.source_name ?? source.source_domain ?? "Unclassified source"}
                  </Badge>
                  <Badge variant="outline" className={cn("capitalize", sourceBadgeClass(source))}>
                    {source.source_trust}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {source.source_category.replaceAll("_", " ")}
                  </Badge>
                  {source.source_scope !== "unknown" ? <Badge variant="outline">{formatSourceScope(source.source_scope)}</Badge> : null}
                  {source.source_language !== "unknown" ? <Badge variant="outline">{source.source_language}</Badge> : null}
                </div>
                {source.error_message ? <p className="text-sm text-red-600">{source.error_message}</p> : null}
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{source.activities_extracted} extracted</span>
                  <span>Created {new Date(source.created_at).toLocaleDateString("sv-SE")}</span>
                  {source.processed_at ? <span>Processed {new Date(source.processed_at).toLocaleDateString("sv-SE")}</span> : null}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => openDetail(source, "view")}>
                      View detail
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => openDetail(source, "edit")}>
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => deleteMutation.mutate(source.id)}
                      disabled={deleteMutation.isPending}
                    >
                      Remove
                    </Button>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => extractMutation.mutate(source.id)}
                    disabled={!canExtract || isExtracting}
                  >
                    {isExtracting ? "Extracting..." : "Extract now"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        </div>
      </section>

      <Dialog
        open={selectedSourceId !== null}
        onOpenChange={(next) => {
          if (!next) {
            setSelectedSourceId(null);
            setDetailMode("view");
          }
        }}
      >
        <DialogContent className="max-w-3xl" showCloseButton>
          <DialogHeader>
            <DialogTitle>{detailMode === "edit" ? "Edit Activity Source" : "Activity Source Detail"}</DialogTitle>
          </DialogHeader>

          {selectedSourceQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading source...</p>
          ) : selectedSource && detailMode === "view" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{selectedSource.title}</h3>
                <Badge variant="outline" className="capitalize">
                  {selectedSource.status}
                </Badge>
              </div>
              {selectedSource.source_url ? (
                <a
                  href={selectedSource.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-sm font-medium text-primary underline"
                >
                  {selectedSource.source_url}
                </a>
              ) : null}
              <div className="flex flex-wrap gap-1.5">
                {isOfficialSource(selectedSource) ? <Badge className="bg-blue-600 text-white hover:bg-blue-600">Official</Badge> : null}
                <Badge variant="outline" className={sourceBadgeClass(selectedSource)}>
                  {selectedSource.source_name ?? selectedSource.source_domain ?? "Unclassified source"}
                </Badge>
                <Badge variant="outline" className={cn("capitalize", sourceBadgeClass(selectedSource))}>
                  {selectedSource.source_trust}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {selectedSource.source_category.replaceAll("_", " ")}
                </Badge>
                {selectedSource.source_scope !== "unknown" ? (
                  <Badge variant="outline">{formatSourceScope(selectedSource.source_scope)}</Badge>
                ) : null}
                {selectedSource.source_language !== "unknown" ? <Badge variant="outline">{selectedSource.source_language}</Badge> : null}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{selectedSource.activities_extracted} extracted</span>
                <span>Created {new Date(selectedSource.created_at).toLocaleString("sv-SE")}</span>
                {selectedSource.processed_at ? (
                  <span>Processed {new Date(selectedSource.processed_at).toLocaleString("sv-SE")}</span>
                ) : null}
              </div>
              {selectedSource.error_message ? <p className="text-sm text-red-600">{selectedSource.error_message}</p> : null}
              <div className="max-h-[55vh] overflow-y-auto rounded-md border bg-muted/30 p-3">
                <pre className="whitespace-pre-wrap text-sm">{selectedSource.raw_markdown}</pre>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDetailMode("edit")}>
                  Edit
                </Button>
                <Button type="button" onClick={() => setSelectedSourceId(null)}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : selectedSource ? (
            <form id="edit-activity-source-form" className="space-y-3" onSubmit={onSubmitEdit}>
              <Input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} placeholder="Source title" required />
              <Input
                value={editSourceUrl}
                onChange={(event) => setEditSourceUrl(event.target.value)}
                placeholder="Optional source URL"
                type="url"
              />
              <Textarea
                value={editMarkdown}
                onChange={(event) => setEditMarkdown(event.target.value)}
                placeholder="Paste Markdown activity suggestions"
                rows={16}
                className="resize-y"
                required
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDetailMode("view")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">Source not found.</p>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
