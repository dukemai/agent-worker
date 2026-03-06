"use client";

import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { GrowingSource } from "@/types/database";
import { fetchGrowingSource } from "@/lib/growing-api";
import { extractYouTubeVideoId } from "@/lib/youtube";

const SOURCE_STATUS_VARIANT = {
  queued: "secondary",
  processing: "secondary",
  done: "default",
  failed: "destructive",
} as const;

const PREVIEW_CHARS = 200;
const DESCRIPTION_PREVIEW_CHARS = 150;

export type GrowingSourcesTabProps = {
  sources: GrowingSource[];
  isLoading: boolean;
  youtubeUrl: string;
  youtubeTranscript: string;
  onYoutubeUrlChange: (value: string) => void;
  onYoutubeTranscriptChange: (value: string) => void;
  onSubmitSource: (event: FormEvent<HTMLFormElement>) => void;
  onRemoveSource: (id: string) => void;
  onProcessSource: (id: string) => void;
  onCleanAndReextract: (id: string) => void;
  onFetchVideoInfo: (id: string) => void;
  onSaveTranscript: (sourceId: string, transcript: string | null) => void;
  isSourceBusy: boolean;
  processSourcePendingId: string | undefined;
  cleanAndReextractPendingId: string | undefined;
  fetchVideoInfoPendingId: string | undefined;
  savingTranscriptId: string | undefined;
};

export function GrowingSourcesTab({
  sources,
  isLoading,
  youtubeUrl,
  youtubeTranscript,
  onYoutubeUrlChange,
  onYoutubeTranscriptChange,
  onSubmitSource,
  onRemoveSource,
  onProcessSource,
  onCleanAndReextract,
  onFetchVideoInfo,
  onSaveTranscript,
  isSourceBusy,
  processSourcePendingId,
  cleanAndReextractPendingId,
  fetchVideoInfoPendingId,
  savingTranscriptId,
}: GrowingSourcesTabProps) {
  const [transcriptDrafts, setTranscriptDrafts] = useState<Record<string, string>>({});
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);
  const [fullTranscriptCache, setFullTranscriptCache] = useState<Record<string, string>>({});
  const [loadingFullId, setLoadingFullId] = useState<string | null>(null);

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
    await onSaveTranscript(sourceId, transcript);
    setFullTranscriptCache((prev) => ({ ...prev, [sourceId]: transcript ?? "" }));
    setExpandedSourceId(null);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Get transcript or article content</CardTitle>
          <p className="text-sm text-muted-foreground">
            Paste a transcript or article content below for each source. To get a transcript from a YouTube video, use
            an external tool such as{" "}
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
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Source (YouTube or blog)</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={onSubmitSource}>
            <Input
              type="url"
              value={youtubeUrl}
              onChange={(e) => onYoutubeUrlChange(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... or https://example.com/article"
            />
            <Textarea
              value={youtubeTranscript}
              onChange={(e) => onYoutubeTranscriptChange(e.target.value)}
              placeholder="Optional: paste transcript or article content when adding (or add it below after saving)"
              rows={4}
              className="resize-y"
            />
            <Button type="submit" disabled={isSourceBusy || youtubeUrl.trim().length === 0}>
              Add Source
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved Sources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
                <article key={source.id} className="rounded-md border p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-1">
                      <h3 className="font-medium">{source.title ?? "Pending title"}</h3>
                      <p className="text-xs text-muted-foreground">{secondaryLine}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                        {sourceTypeLabel}
                      </Badge>
                      <Badge variant={SOURCE_STATUS_VARIANT[source.status]}>{source.status}</Badge>
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
                      onClick={() => onFetchVideoInfo(source.id)}
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
                        onClick={() => onProcessSource(source.id)}
                        disabled={processSourcePendingId === source.id || !hasTranscript}
                        title={!hasTranscript ? "Save a transcript first" : undefined}
                      >
                        {processSourcePendingId === source.id ? "Extracting..." : "Extract now"}
                      </Button>
                    ) : null}
                    {(source.status === "done" || source.status === "failed") ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onCleanAndReextract(source.id)}
                        disabled={cleanAndReextractPendingId === source.id || !hasTranscript}
                        title="Delete extracted knowledge and re-run extraction"
                      >
                        {cleanAndReextractPendingId === source.id ? "Cleaning & extracting…" : "Clean & re-extract"}
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRemoveSource(source.id)}
                      disabled={isSourceBusy}
                    >
                      Delete
                    </Button>
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
