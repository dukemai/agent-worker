"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  addGrowingSource,
  cleanSourceAndReextract,
  fetchGrowingSource,
  fetchGrowingSources,
  fetchSourceVideoInfo,
  processGrowingSource,
  deleteGrowingSource,
  updateSourceTranscript,
} from "@/lib/growing-api";
import { cn } from "@/lib/utils";
import { extractYouTubeVideoId } from "@/lib/youtube";

const SOURCE_STATUS_CLASS: Record<
  "queued" | "processing" | "done" | "failed",
  string
> = {
  queued: "border-amber-200 bg-amber-50 text-amber-800",
  processing: "border-amber-200 bg-amber-50 text-amber-800",
  done: "border-emerald-200 bg-emerald-50 text-emerald-800",
  failed: "border-red-200 bg-red-50 text-red-800",
};

const PREVIEW_CHARS = 200;
const DESCRIPTION_PREVIEW_CHARS = 150;

export function GrowingSourcesTab() {
  const queryClient = useQueryClient();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeTranscript, setYoutubeTranscript] = useState("");
  const [transcriptDrafts, setTranscriptDrafts] = useState<Record<string, string>>({});
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);
  const [fullTranscriptCache, setFullTranscriptCache] = useState<Record<string, string>>({});
  const [loadingFullId, setLoadingFullId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const sourcesQuery = useQuery({
    queryKey: ["growing", "sources"],
    queryFn: fetchGrowingSources,
  });
  const sources = sourcesQuery.data?.sources ?? [];
  const isLoading = sourcesQuery.isLoading;

  const addSourceMutation = useMutation({
    mutationFn: ({ url, transcript }: { url: string; transcript?: string | null }) =>
      addGrowingSource(url, transcript),
    onSuccess: async () => {
      setYoutubeUrl("");
      setYoutubeTranscript("");
      await queryClient.invalidateQueries({ queryKey: ["growing", "sources"] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Failed to add source");
    },
  });

  const saveTranscriptMutation = useMutation({
    mutationFn: ({ sourceId, transcript }: { sourceId: string; transcript: string | null }) =>
      updateSourceTranscript(sourceId, transcript),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["growing", "sources"] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Failed to save transcript");
    },
  });

  const deleteSourceMutation = useMutation({
    mutationFn: deleteGrowingSource,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["growing", "sources"] }),
        queryClient.invalidateQueries({ queryKey: ["growing", "knowledge"] }),
        queryClient.invalidateQueries({ queryKey: ["growing", "weekly"] }),
      ]);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Failed to delete source");
    },
  });

  const processSourceMutation = useMutation({
    mutationFn: processGrowingSource,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["growing", "sources"] }),
        queryClient.invalidateQueries({ queryKey: ["growing", "knowledge"] }),
        queryClient.invalidateQueries({ queryKey: ["growing", "weekly"] }),
      ]);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Failed to process source");
    },
  });

  const cleanAndReextractMutation = useMutation({
    mutationFn: cleanSourceAndReextract,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["growing", "sources"] }),
        queryClient.invalidateQueries({ queryKey: ["growing", "knowledge"] }),
        queryClient.invalidateQueries({ queryKey: ["growing", "weekly"] }),
      ]);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Failed to clean and re-extract source");
    },
  });

  const fetchVideoInfoMutation = useMutation({
    mutationFn: fetchSourceVideoInfo,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["growing", "sources"] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Failed to fetch video info");
    },
  });

  const isSourceBusy =
    addSourceMutation.isPending ||
    deleteSourceMutation.isPending ||
    fetchVideoInfoMutation.isPending ||
    processSourceMutation.isPending ||
    cleanAndReextractMutation.isPending;

  const processSourcePendingId =
    processSourceMutation.isPending && processSourceMutation.variables
      ? processSourceMutation.variables
      : undefined;
  const cleanAndReextractPendingId =
    cleanAndReextractMutation.isPending && cleanAndReextractMutation.variables
      ? cleanAndReextractMutation.variables
      : undefined;
  const fetchVideoInfoPendingId =
    fetchVideoInfoMutation.isPending && fetchVideoInfoMutation.variables
      ? fetchVideoInfoMutation.variables
      : undefined;
  const savingTranscriptId =
    saveTranscriptMutation.isPending && saveTranscriptMutation.variables
      ? saveTranscriptMutation.variables.sourceId
      : undefined;
  const deletingId =
    deleteSourceMutation.isPending && deleteSourceMutation.variables
      ? deleteSourceMutation.variables
      : undefined;

  async function onSubmitSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const nextUrl = youtubeUrl.trim();
    if (!nextUrl) return;
    try {
      await addSourceMutation.mutateAsync({
        url: nextUrl,
        transcript: youtubeTranscript.trim() || null,
      });
      setAddOpen(false);
    } catch {
      return;
    }
  }

  async function handleEditTranscript(sourceId: string) {
    if (expandedSourceId === sourceId) {
      setExpandedSourceId(null);
      return;
    }
    setLoadingFullId(sourceId);
    try {
      const source = await fetchGrowingSource(sourceId);
      setFullTranscriptCache((prev) => ({ ...prev, [sourceId]: source.transcript ?? "" }));
      setTranscriptDrafts((prev) => ({ ...prev, [sourceId]: source.transcript ?? "" }));
      setExpandedSourceId(sourceId);
    } finally {
      setLoadingFullId(null);
    }
  }

  async function handleSaveTranscript(sourceId: string, transcript: string | null) {
    setError(null);
    await saveTranscriptMutation.mutateAsync({ sourceId, transcript });
    setFullTranscriptCache((prev) => ({ ...prev, [sourceId]: transcript ?? "" }));
    setExpandedSourceId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog
          open={addOpen}
          onOpenChange={(next) => {
            setAddOpen(next);
            if (!next) {
              setError(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button type="button" size="sm" variant="outline">
              Add source
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg" showCloseButton>
            <DialogHeader>
              <DialogTitle>Add Source (YouTube or blog)</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Paste a transcript or article content for each source. To get a transcript from a YouTube video, use an
                external tool such as{" "}
                <a
                  href="https://notegpt.io/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary underline"
                >
                  NoteGPT
                </a>{" "}
                (YouTube Transcript Generator). For blog posts, you can use{" "}
                <a
                  href="https://give-me-markdown.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary underline"
                >
                  give-me-markdown.com
                </a>{" "}
                to convert a page into Markdown, then paste the result here.
              </p>
            </DialogHeader>
            <form id="add-source-form" className="flex flex-col gap-3" onSubmit={onSubmitSource}>
              <Input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or https://example.com/article"
                required
                autoFocus
              />
              <Textarea
                value={youtubeTranscript}
                onChange={(e) => setYoutubeTranscript(e.target.value)}
                placeholder="Optional: paste transcript or article content when adding (or add it below after saving)"
                rows={4}
                className="resize-y"
              />
            </form>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="add-source-form"
                disabled={isSourceBusy || youtubeUrl.trim().length === 0}
              >
                {addSourceMutation.isPending ? "Adding…" : "Add source"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Saved Sources
            {sources.length > 0 ? (
              <span className="ml-1.5 text-sm font-normal text-muted-foreground tabular-nums">
                ({sources.length})
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading sources...</p>
          ) : sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sources added yet.</p>
          ) : (
            sources.map((source) => {
              const isExpanded = expandedSourceId === source.id;
              const draftValue = transcriptDrafts[source.id] ?? fullTranscriptCache[source.id] ?? source.transcript ?? "";
              const hasTranscript = (source.transcript?.trim() ?? "").length > 0;
              const preview = (source.transcript ?? "").slice(0, PREVIEW_CHARS);
              const hasMore = (source.transcript?.length ?? 0) > PREVIEW_CHARS;
              const isYouTube = extractYouTubeVideoId(source.url) !== null;
              const sourceTypeLabel =
                source.source_type === "blog"
                  ? "Blog"
                  : isYouTube
                    ? "Video"
                    : "Source";
              let secondaryLine = source.channel ?? "Channel unknown";
              if (source.source_type === "blog") {
                try {
                  const hostname = new URL(source.url).hostname.replace(/^www\./, "");
                  if (hostname) {
                    secondaryLine = hostname;
                  }
                } catch {
                  // ignore URL parse errors and fall back to channel
                }
              }

              return (
                <article key={source.id} className="rounded-md border bg-card/60 p-3">
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium">{source.title ?? "Pending title"}</h3>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide shrink-0">
                          {sourceTypeLabel}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] uppercase tracking-wide border px-2 py-0.5 shrink-0",
                            SOURCE_STATUS_CLASS[source.status]
                          )}
                        >
                          {source.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{secondaryLine}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {(source.status === "done" || source.status === "failed") ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => cleanAndReextractMutation.mutate(source.id)}
                          disabled={cleanAndReextractPendingId === source.id || !hasTranscript || isSourceBusy}
                          title="Delete extracted knowledge and re-run extraction"
                        >
                          {cleanAndReextractPendingId === source.id ? "Cleaning & extracting…" : "Clean & re-extract"}
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => deleteSourceMutation.mutate(source.id)}
                        disabled={isSourceBusy || deletingId === source.id}
                      >
                        {deletingId === source.id ? "Deleting…" : "Delete"}
                      </Button>
                    </div>
                  </div>
                  <p className="mb-3 break-all text-xs text-muted-foreground">{source.url}</p>
                  {source.description ? (
                    <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
                      {source.description.length > DESCRIPTION_PREVIEW_CHARS
                        ? `${source.description.slice(0, DESCRIPTION_PREVIEW_CHARS)}…`
                        : source.description}
                    </p>
                  ) : null}
                  <div className="mb-3">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Transcript</label>
                    {!isExpanded ? (
                      <>
                        {hasTranscript ? (
                          <p className="rounded border bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground">
                            {preview}
                            {hasMore && "…"}
                          </p>
                        ) : (
                          <p className="rounded border border-dashed px-2 py-1.5 text-xs italic text-muted-foreground">
                            No transcript
                          </p>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => handleEditTranscript(source.id)}
                          disabled={loadingFullId === source.id}
                        >
                          {loadingFullId === source.id ? "Loading…" : hasTranscript ? "Edit transcript" : "Add transcript"}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Textarea
                          value={draftValue}
                          onChange={(e) => setTranscriptDrafts((prev) => ({ ...prev, [source.id]: e.target.value }))}
                          placeholder="Paste transcript or article content (e.g. from NoteGPT or give-me-markdown.com)…"
                          rows={8}
                          className="resize-y text-sm"
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSaveTranscript(source.id, draftValue.trim() || null)}
                            disabled={savingTranscriptId === source.id || isSourceBusy}
                          >
                            {savingTranscriptId === source.id ? "Saving…" : "Save transcript"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setExpandedSourceId(null)}>
                            Collapse
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs text-muted-foreground">Tips extracted: {source.tips_extracted}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fetchVideoInfoMutation.mutate(source.id)}
                      disabled={fetchVideoInfoPendingId === source.id || isSourceBusy || !isYouTube}
                      title={
                        isYouTube
                          ? "Fetch title, channel, and description from YouTube"
                          : "Automatic metadata fetch is only available for YouTube sources"
                      }
                    >
                      {fetchVideoInfoPendingId === source.id ? "Fetching…" : "Fetch video info"}
                    </Button>
                    {(source.status === "queued" || source.status === "failed") ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => processSourceMutation.mutate(source.id)}
                        disabled={processSourcePendingId === source.id || !hasTranscript}
                        title={!hasTranscript ? "Save a transcript first" : undefined}
                      >
                        {processSourcePendingId === source.id ? "Extracting..." : "Extract now"}
                      </Button>
                    ) : null}
                  </div>
                  {source.error_message ? (
                    <p className="mt-2 text-xs text-red-600">Error: {source.error_message}</p>
                  ) : null}
                </article>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
