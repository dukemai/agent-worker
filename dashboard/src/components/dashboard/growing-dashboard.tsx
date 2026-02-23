"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  addGrowingSource,
  convertGrowingSuggestion,
  createTask,
  deleteGrowingSource,
  fetchGrowingKnowledge,
  fetchGrowingSources,
  fetchWeeklyGrowing,
  processGrowingSource,
  updateGrowingProfile,
  updateSuggestionStatus,
} from "@/lib/growing-api";
import type { Bucket, GrowingKnowledgeCategory } from "@/types/database";
import { GrowingContextCard } from "./growing-context-card";
import { GrowingKnowledgeTab } from "./growing-knowledge-tab";
import { GrowingSourcesTab } from "./growing-sources-tab";
import { GrowingWeeklyTab } from "./growing-weekly-tab";
import type { GrowingKnowledgeItem, GrowingProfileForm } from "./growing-dashboard.types";
import { toFormState } from "./growing-dashboard.types";

export function GrowingDashboard() {
  const queryClient = useQueryClient();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [knowledgeCategory, setKnowledgeCategory] = useState<"all" | GrowingKnowledgeCategory>("all");
  const [knowledgeSeason, setKnowledgeSeason] = useState<"all" | "spring" | "summer" | "autumn" | "winter">("all");
  const [knowledgeTags, setKnowledgeTags] = useState("");
  const [profileFormDirty, setProfileFormDirty] = useState<GrowingProfileForm | null>(null);

  const weeklyQuery = useQuery({
    queryKey: ["growing", "weekly"],
    queryFn: fetchWeeklyGrowing,
  });
  const sourcesQuery = useQuery({
    queryKey: ["growing", "sources"],
    queryFn: fetchGrowingSources,
  });
  const knowledgeQuery = useQuery({
    queryKey: ["growing", "knowledge", knowledgeCategory, knowledgeSeason, knowledgeTags.trim().toLowerCase()],
    queryFn: () =>
      fetchGrowingKnowledge({
        category: knowledgeCategory,
        season: knowledgeSeason,
        tags: knowledgeTags.trim().toLowerCase(),
      }),
  });

  const data = weeklyQuery.data;
  const profileForm: GrowingProfileForm = profileFormDirty ?? (data?.profile ? toFormState(data.profile) : {
    city: "",
    country_code: "SE",
    space_type: "balcony",
    experience_level: "beginner",
    interestsStr: "",
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateGrowingProfile,
    onSuccess: async () => {
      setProfileFormDirty(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["growing", "weekly"] }),
      ]);
    },
  });

  const convertMutation = useMutation({
    mutationFn: ({ suggestionId, bucket }: { suggestionId: string; bucket: Bucket }) =>
      convertGrowingSuggestion(suggestionId, bucket),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["growing", "weekly"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      ]);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ suggestionId, status }: { suggestionId: string; status: "dismissed" | "done" }) =>
      updateSuggestionStatus(suggestionId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["growing", "weekly"] });
    },
  });

  const addSourceMutation = useMutation({
    mutationFn: addGrowingSource,
    onSuccess: async () => {
      setYoutubeUrl("");
      await queryClient.invalidateQueries({ queryKey: ["growing", "sources"] });
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
  });

  const knowledgeToTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const isBusy = convertMutation.isPending || statusMutation.isPending;
  const isSourceBusy = addSourceMutation.isPending || deleteSourceMutation.isPending;
  const isKnowledgeBusy = knowledgeToTaskMutation.isPending;
  const isProfileBusy = updateProfileMutation.isPending;
  const error =
    weeklyQuery.error instanceof Error
      ? weeklyQuery.error.message
      : convertMutation.error instanceof Error
        ? convertMutation.error.message
        : statusMutation.error instanceof Error
          ? statusMutation.error.message
          : sourcesQuery.error instanceof Error
            ? sourcesQuery.error.message
            : addSourceMutation.error instanceof Error
              ? addSourceMutation.error.message
              : deleteSourceMutation.error instanceof Error
                ? deleteSourceMutation.error.message
                  : knowledgeQuery.error instanceof Error
                    ? knowledgeQuery.error.message
                    : knowledgeToTaskMutation.error instanceof Error
                      ? knowledgeToTaskMutation.error.message
                      : updateProfileMutation.error instanceof Error
                        ? updateProfileMutation.error.message
          : null;

  async function addToBucket(suggestionId: string, bucket: Bucket) {
    try {
      await convertMutation.mutateAsync({ suggestionId, bucket });
    } catch {
      return;
    }
  }

  async function dismissSuggestion(suggestionId: string) {
    try {
      await statusMutation.mutateAsync({ suggestionId, status: "dismissed" });
    } catch {
      return;
    }
  }

  async function submitSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextUrl = youtubeUrl.trim();
    if (!nextUrl) {
      return;
    }
    try {
      await addSourceMutation.mutateAsync(nextUrl);
    } catch {
      return;
    }
  }

  async function removeSource(id: string) {
    try {
      await deleteSourceMutation.mutateAsync(id);
    } catch {
      return;
    }
  }

  async function addKnowledgeToTasks(item: GrowingKnowledgeItem) {
    try {
      await knowledgeToTaskMutation.mutateAsync({
        title: `Growing: ${item.title}`,
        bucket: "this_week",
      });
    } catch {
      return;
    }
  }

  async function submitProfileForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await updateProfileMutation.mutateAsync(profileForm);
    } catch {
      return;
    }
  }

  if (weeklyQuery.isLoading) {
    return <main className="mx-auto w-full max-w-7xl px-4 py-6">Loading growing suggestions...</main>;
  }

  const sources = sourcesQuery.data?.sources ?? [];
  const knowledge = knowledgeQuery.data?.knowledge ?? [];

  if (!data) {
    return <main className="mx-auto w-full max-w-7xl px-4 py-6">No growing suggestions available.</main>;
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
      <GrowingContextCard
        profileForm={profileForm}
        onFormChange={setProfileFormDirty}
        onSave={submitProfileForm}
        isSaving={isProfileBusy}
        weekStartDate={data?.week_start_date ?? null}
        error={error}
      />

      <Tabs defaultValue="weekly" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="weekly">This Week</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly">
          <GrowingWeeklyTab
            data={data}
            onAddToBucket={addToBucket}
            onDismiss={dismissSuggestion}
            isBusy={isBusy}
          />
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <GrowingSourcesTab
            sources={sources}
            isLoading={sourcesQuery.isLoading}
            youtubeUrl={youtubeUrl}
            onYoutubeUrlChange={setYoutubeUrl}
            onSubmitSource={submitSource}
            onRemoveSource={removeSource}
            onProcessSource={(id) => processSourceMutation.mutate(id)}
            isSourceBusy={isSourceBusy}
            processSourcePendingId={
              processSourceMutation.isPending && processSourceMutation.variables
                ? processSourceMutation.variables
                : undefined
            }
          />
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-4">
          <GrowingKnowledgeTab
            category={knowledgeCategory}
            season={knowledgeSeason}
            tags={knowledgeTags}
            onCategoryChange={setKnowledgeCategory}
            onSeasonChange={setKnowledgeSeason}
            onTagsChange={setKnowledgeTags}
            knowledge={knowledge}
            isLoading={knowledgeQuery.isLoading}
            onAddAsTask={addKnowledgeToTasks}
            isBusy={isKnowledgeBusy}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}
