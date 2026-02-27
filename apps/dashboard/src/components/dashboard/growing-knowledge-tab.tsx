"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GrowingKnowledgeCategory } from "@/types/database";
import type { GrowingKnowledgeItem } from "./growing-dashboard.types";

export type KnowledgeSeason = "all" | "spring" | "summer" | "autumn" | "winter";

export type GrowingKnowledgeTabProps = {
  category: "all" | GrowingKnowledgeCategory;
  season: KnowledgeSeason;
  tags: string;
  locationFilter: string;
  onCategoryChange: (value: "all" | GrowingKnowledgeCategory) => void;
  onSeasonChange: (value: KnowledgeSeason) => void;
  onTagsChange: (value: string) => void;
  onLocationFilterChange: (value: string) => void;
  knowledge: GrowingKnowledgeItem[];
  isLoading: boolean;
  onAddAsTask: (item: GrowingKnowledgeItem) => void;
  onDelete: (item: GrowingKnowledgeItem) => void;
  isBusy: boolean;
  deletingId: string | undefined;
};

export function GrowingKnowledgeTab({
  category,
  season,
  tags,
  locationFilter,
  onCategoryChange,
  onSeasonChange,
  onTagsChange,
  onLocationFilterChange,
  knowledge,
  isLoading,
  onAddAsTask,
  onDelete,
  isBusy,
  deletingId,
}: GrowingKnowledgeTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Select value={category} onValueChange={(value) => onCategoryChange(value as typeof category)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="technique">Technique</SelectItem>
              <SelectItem value="plant-profile">Plant profile</SelectItem>
              <SelectItem value="soil">Soil</SelectItem>
              <SelectItem value="pest-control">Pest control</SelectItem>
              <SelectItem value="companion-planting">Companion planting</SelectItem>
              <SelectItem value="preservation">Preservation</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>

          <Select value={season} onValueChange={(value) => onSeasonChange(value as KnowledgeSeason)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Season" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All seasons</SelectItem>
              <SelectItem value="spring">Spring</SelectItem>
              <SelectItem value="summer">Summer</SelectItem>
              <SelectItem value="autumn">Autumn</SelectItem>
              <SelectItem value="winter">Winter</SelectItem>
            </SelectContent>
          </Select>

          <Input value={tags} onChange={(event) => onTagsChange(event.target.value)} placeholder="Tags (comma separated)" />
          <Input value={locationFilter} onChange={(event) => onLocationFilterChange(event.target.value)} placeholder="Location (e.g. Stockholm, general)" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Knowledge Library</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading knowledge...</p>
          ) : knowledge.length === 0 ? (
            <p className="text-sm text-muted-foreground">No knowledge matches your filters yet.</p>
          ) : (
            knowledge.map((item) => (
              <article key={item.id} className="rounded-md border p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">{item.title}</h3>
                  <Badge variant="outline">{item.category}</Badge>
                  {item.location_note ? (
                    <Badge variant="secondary" title="Location-specific">
                      {item.location_note}
                    </Badge>
                  ) : null}
                  {!item.stockholm_relevant ? <Badge variant="secondary">Low Stockholm relevance</Badge> : null}
                </div>
                <p className="mb-3 text-sm text-muted-foreground">{item.content}</p>
                <div className="mb-3 flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <Badge key={`${item.id}-${tag}`} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {item.source?.url ? (
                    <a className="text-blue-600 underline" href={item.source.url} target="_blank" rel="noreferrer">
                      Source video
                    </a>
                  ) : null}
                  {item.season_relevance.length > 0 ? (
                    <span>Season: {item.season_relevance.join(", ")}</span>
                  ) : (
                    <span>Season: year-round</span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => onAddAsTask(item)} disabled={isBusy}>
                    Add as task
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(item)}
                    disabled={isBusy || deletingId === item.id}
                  >
                    {deletingId === item.id ? "Deleting…" : "Delete"}
                  </Button>
                </div>
              </article>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
