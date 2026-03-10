"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createTask,
  deleteGrowingKnowledge,
  fetchGrowingKnowledge,
  updateGrowingKnowledgeVerified,
} from "@/lib/growing-api";
import type { GrowingKnowledgeCategory } from "@/types/database";

export type KnowledgeSeason = "all" | "spring" | "summer" | "autumn" | "winter";
export type KnowledgeVerificationFilter = "all" | "verified" | "unverified";

export function GrowingKnowledgeTab() {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<"all" | GrowingKnowledgeCategory>("all");
  const [season, setSeason] = useState<KnowledgeSeason>("all");
  const [tags, setTags] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [verification, setVerification] = useState<KnowledgeVerificationFilter>("all");

  const knowledgeQuery = useQuery({
    queryKey: [
      "growing",
      "knowledge",
      category,
      season,
      tags.trim().toLowerCase(),
      locationFilter.trim().toLowerCase(),
      verification,
    ],
    queryFn: () =>
      fetchGrowingKnowledge({
        category,
        season,
        tags: tags.trim().toLowerCase(),
        location: locationFilter.trim(),
        verification,
      }),
  });

  const knowledgeToTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const deleteKnowledgeMutation = useMutation({
    mutationFn: deleteGrowingKnowledge,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["growing", "knowledge"] }),
        queryClient.invalidateQueries({ queryKey: ["growing", "weekly"] }),
      ]);
    },
  });

  const updateKnowledgeVerifiedMutation = useMutation({
    mutationFn: ({ id, verified }: { id: string; verified: boolean }) =>
      updateGrowingKnowledgeVerified(id, verified),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["growing", "knowledge"] });
    },
  });

  const isLoading = knowledgeQuery.isLoading;
  const knowledge = knowledgeQuery.data?.knowledge ?? [];
  const verifiedCount = knowledge.filter((item) => item.verified).length;
  const unverifiedCount = knowledge.length - verifiedCount;
  const isBusy =
    knowledgeToTaskMutation.isPending ||
    deleteKnowledgeMutation.isPending ||
    updateKnowledgeVerifiedMutation.isPending;
  const deletingId =
    deleteKnowledgeMutation.isPending && deleteKnowledgeMutation.variables
      ? deleteKnowledgeMutation.variables
      : undefined;
  const verifyingId =
    updateKnowledgeVerifiedMutation.isPending && updateKnowledgeVerifiedMutation.variables
      ? updateKnowledgeVerifiedMutation.variables.id
      : undefined;
  const error =
    knowledgeQuery.error instanceof Error
      ? knowledgeQuery.error.message
      : knowledgeToTaskMutation.error instanceof Error
        ? knowledgeToTaskMutation.error.message
        : deleteKnowledgeMutation.error instanceof Error
          ? deleteKnowledgeMutation.error.message
          : updateKnowledgeVerifiedMutation.error instanceof Error
            ? updateKnowledgeVerifiedMutation.error.message
          : null;

  async function onAddAsTask(item: (typeof knowledge)[number]) {
    try {
      await knowledgeToTaskMutation.mutateAsync({
        title: `Growing: ${item.title}`,
        bucket: "this_week",
      });
    } catch {
      return;
    }
  }

  async function onDelete(item: (typeof knowledge)[number]) {
    try {
      await deleteKnowledgeMutation.mutateAsync(item.id);
    } catch {
      return;
    }
  }

  async function onToggleVerified(item: (typeof knowledge)[number]) {
    try {
      await updateKnowledgeVerifiedMutation.mutateAsync({
        id: item.id,
        verified: !item.verified,
      });
    } catch {
      return;
    }
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <Select value={category} onValueChange={(value) => setCategory(value as typeof category)}>
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

          <Select value={season} onValueChange={(value) => setSeason(value as KnowledgeSeason)}>
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

          <Input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Tags (comma separated)" />
          <Input value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} placeholder="Location (e.g. Stockholm, general)" />
          <Select value={verification} onValueChange={(value) => setVerification(value as KnowledgeVerificationFilter)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Verification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="verified">Verified only</SelectItem>
              <SelectItem value="unverified">Unverified only</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Knowledge Library
            {knowledge.length > 0 ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {verifiedCount} verified · {unverifiedCount} unverified
              </span>
            ) : null}
          </CardTitle>
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
                  {item.verified ? (
                    <Badge variant="default">Verified</Badge>
                  ) : (
                    <Badge variant="outline">Unverified</Badge>
                  )}
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
                    onClick={() => onToggleVerified(item)}
                    disabled={isBusy || verifyingId === item.id}
                  >
                    {verifyingId === item.id ? "Updating…" : item.verified ? "Mark unverified" : "Mark verified"}
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
