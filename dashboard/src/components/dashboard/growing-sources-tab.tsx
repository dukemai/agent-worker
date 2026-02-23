"use client";

import { type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { GrowingSource } from "@/types/database";

const SOURCE_STATUS_VARIANT = {
  queued: "secondary",
  processing: "secondary",
  done: "default",
  failed: "destructive",
} as const;

export type GrowingSourcesTabProps = {
  sources: GrowingSource[];
  isLoading: boolean;
  youtubeUrl: string;
  onYoutubeUrlChange: (value: string) => void;
  onSubmitSource: (event: FormEvent<HTMLFormElement>) => void;
  onRemoveSource: (id: string) => void;
  onProcessSource: (id: string) => void;
  isSourceBusy: boolean;
  processSourcePendingId: string | undefined;
};

export function GrowingSourcesTab({
  sources,
  isLoading,
  youtubeUrl,
  onYoutubeUrlChange,
  onSubmitSource,
  onRemoveSource,
  onProcessSource,
  isSourceBusy,
  processSourcePendingId,
}: GrowingSourcesTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Add YouTube Source</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 md:flex-row" onSubmit={onSubmitSource}>
            <Input
              type="url"
              value={youtubeUrl}
              onChange={(event) => onYoutubeUrlChange(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
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
            <p className="text-sm text-muted-foreground">No videos added yet.</p>
          ) : (
            sources.map((source) => (
              <article key={source.id} className="rounded-md border p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <h3 className="font-medium">{source.title ?? "Pending title"}</h3>
                    <p className="text-xs text-muted-foreground">{source.channel ?? "Channel unknown"}</p>
                  </div>
                  <Badge variant={SOURCE_STATUS_VARIANT[source.status]}>{source.status}</Badge>
                </div>
                <p className="mb-3 break-all text-xs text-muted-foreground">{source.url}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs text-muted-foreground">Tips extracted: {source.tips_extracted}</p>
                  {(source.status === "queued" || source.status === "failed") ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onProcessSource(source.id)}
                      disabled={processSourcePendingId === source.id}
                    >
                      {processSourcePendingId === source.id ? "Extracting..." : "Extract now"}
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
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
