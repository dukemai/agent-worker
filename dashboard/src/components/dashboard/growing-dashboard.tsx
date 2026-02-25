"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  addGrowingSource,
  cleanSourceAndReextract,
  convertGrowingSuggestion,
  createTask,
  deleteGrowingKnowledge,
  deleteGrowingSource,
  deleteGrowingWindow,
  fetchGrowingKnowledge,
  fetchGrowingSources,
  fetchGrowingWindows,
  fetchSourceVideoInfo,
  fetchWeeklyGrowing,
  processGrowingSource,
  updateGrowingProfile,
  updateGrowingWindowMonths,
  updateGrowingWindowVerified,
  updateSourceTranscript,
  updateSuggestionStatus,
} from "@/lib/growing-api";
import type { Bucket, GrowingKnowledgeCategory } from "@/types/database";
import { GrowingContextCard } from "./growing-context-card";
import { GrowingKnowledgeTab } from "./growing-knowledge-tab";
import { GrowingSourcesTab } from "./growing-sources-tab";
import { GrowingWeeklyTab } from "./growing-weekly-tab";
import { GrowingWindowsTab } from "./growing-windows-tab";
import type { GrowingKnowledgeItem, GrowingProfileForm } from "./growing-dashboard.types";
import { toFormState } from "./growing-dashboard.types";

export function GrowingDashboard() {
  const queryClient = useQueryClient();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeTranscript, setYoutubeTranscript] = useState("");
  const [knowledgeCategory, setKnowledgeCategory] = useState<"all" | GrowingKnowledgeCategory>("all");
  const [knowledgeSeason, setKnowledgeSeason] = useState<"all" | "spring" | "summer" | "autumn" | "winter">("all");
  const [knowledgeTags, setKnowledgeTags] = useState("");
  const [knowledgeLocation, setKnowledgeLocation] = useState("");
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
    queryKey: ["growing", "knowledge", knowledgeCategory, knowledgeSeason, knowledgeTags.trim().toLowerCase(), knowledgeLocation.trim().toLowerCase()],
    queryFn: () =>
      fetchGrowingKnowledge({
        category: knowledgeCategory,
        season: knowledgeSeason,
        tags: knowledgeTags.trim().toLowerCase(),
        location: knowledgeLocation.trim(),
      }),
  });
  const windowsQuery = useQuery({
    queryKey: ["growing", "windows"],
    queryFn: fetchGrowingWindows,
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
    mutationFn: ({ url, transcript }: { url: string; transcript?: string | null }) =>
      addGrowingSource(url, transcript),
    onSuccess: async () => {
      setYoutubeUrl("");
      setYoutubeTranscript("");
      await queryClient.invalidateQueries({ queryKey: ["growing", "sources"] });
    },
  });

  const saveTranscriptMutation = useMutation({
    mutationFn: ({ sourceId, transcript }: { sourceId: string; transcript: string | null }) =>
      updateSourceTranscript(sourceId, transcript),
    onSuccess: async () => {
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

  const cleanAndReextractMutation = useMutation({
    mutationFn: cleanSourceAndReextract,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["growing", "sources"] }),
        queryClient.invalidateQueries({ queryKey: ["growing", "knowledge"] }),
        queryClient.invalidateQueries({ queryKey: ["growing", "weekly"] }),
      ]);
    },
  });

  const fetchVideoInfoMutation = useMutation({
    mutationFn: fetchSourceVideoInfo,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["growing", "sources"] });
    },
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

  const updateWindowVerifiedMutation = useMutation({
    mutationFn: ({ id, verified }: { id: string; verified: boolean }) => updateGrowingWindowVerified(id, verified),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["growing", "windows"] }),
        queryClient.invalidateQueries({ queryKey: ["growing", "weekly"] }),
      ]);
    },
  });

  const updateWindowMonthsMutation = useMutation({
    mutationFn: ({ id, start_month, end_month }: { id: string; start_month: number; end_month: number }) =>
      updateGrowingWindowMonths(id, start_month, end_month),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["growing", "windows"] }),
        queryClient.invalidateQueries({ queryKey: ["growing", "weekly"] }),
      ]);
    },
  });

  const deleteWindowMutation = useMutation({
    mutationFn: deleteGrowingWindow,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["growing", "windows"] }),
        queryClient.invalidateQueries({ queryKey: ["growing", "weekly"] }),
      ]);
    },
  });

  const isBusy = convertMutation.isPending || statusMutation.isPending;
  const isSourceBusy =
    addSourceMutation.isPending ||
    deleteSourceMutation.isPending ||
    fetchVideoInfoMutation.isPending ||
    processSourceMutation.isPending ||
    cleanAndReextractMutation.isPending;
  const isKnowledgeBusy = knowledgeToTaskMutation.isPending || deleteKnowledgeMutation.isPending;
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
      await addSourceMutation.mutateAsync({
        url: nextUrl,
        transcript: youtubeTranscript.trim() || null,
      });
    } catch {
      return;
    }
  }

  async function saveTranscript(sourceId: string, transcript: string | null) {
    try {
      await saveTranscriptMutation.mutateAsync({ sourceId, transcript });
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

  async function handleCleanAndReextract(id: string) {
    try {
      await cleanAndReextractMutation.mutateAsync(id);
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

  async function deleteKnowledge(item: GrowingKnowledgeItem) {
    try {
      await deleteKnowledgeMutation.mutateAsync(item.id);
    } catch {
      return;
    }
  }

  async function handleToggleWindowVerified(id: string, verified: boolean) {
    try {
      await updateWindowVerifiedMutation.mutateAsync({ id, verified });
    } catch {
      return;
    }
  }

  async function handleUpdateWindowMonths(id: string, start_month: number, end_month: number) {
    try {
      await updateWindowMonthsMutation.mutateAsync({ id, start_month, end_month });
    } catch {
      return;
    }
  }

  async function deleteWindow(id: string) {
    try {
      await deleteWindowMutation.mutateAsync(id);
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
  const windows = windowsQuery.data?.windows ?? [];

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
          <TabsTrigger value="windows">Windows</TabsTrigger>
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
            youtubeTranscript={youtubeTranscript}
            onYoutubeUrlChange={setYoutubeUrl}
            onYoutubeTranscriptChange={setYoutubeTranscript}
            onSubmitSource={submitSource}
            onRemoveSource={removeSource}
            onProcessSource={(id) => processSourceMutation.mutate(id)}
            onCleanAndReextract={handleCleanAndReextract}
            onFetchVideoInfo={(id: string) => fetchVideoInfoMutation.mutate(id)}
            onSaveTranscript={saveTranscript}
            isSourceBusy={isSourceBusy}
            processSourcePendingId={
              processSourceMutation.isPending && processSourceMutation.variables
                ? processSourceMutation.variables
                : undefined
            }
            cleanAndReextractPendingId={
              cleanAndReextractMutation.isPending && cleanAndReextractMutation.variables
                ? cleanAndReextractMutation.variables
                : undefined
            }
            fetchVideoInfoPendingId={
              fetchVideoInfoMutation.isPending && fetchVideoInfoMutation.variables
                ? fetchVideoInfoMutation.variables
                : undefined
            }
            savingTranscriptId={
              saveTranscriptMutation.isPending && saveTranscriptMutation.variables
                ? saveTranscriptMutation.variables.sourceId
                : undefined
            }
          />
        </TabsContent>

        <TabsContent value="windows" className="space-y-4">
          <GrowingWindowsTab
            windows={windows}
            isLoading={windowsQuery.isLoading}
            onToggleVerified={handleToggleWindowVerified}
            onUpdateMonths={handleUpdateWindowMonths}
            onDelete={deleteWindow}
            isBusy={
              updateWindowVerifiedMutation.isPending ||
              updateWindowMonthsMutation.isPending ||
              deleteWindowMutation.isPending
            }
            updatingId={
              updateWindowVerifiedMutation.isPending && updateWindowVerifiedMutation.variables
                ? updateWindowVerifiedMutation.variables.id
                : updateWindowMonthsMutation.isPending && updateWindowMonthsMutation.variables
                  ? updateWindowMonthsMutation.variables.id
                  : undefined
            }
            deletingId={
              deleteWindowMutation.isPending && deleteWindowMutation.variables
                ? deleteWindowMutation.variables
                : undefined
            }
          />
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-4">
          <GrowingKnowledgeTab
            category={knowledgeCategory}
            season={knowledgeSeason}
            tags={knowledgeTags}
            locationFilter={knowledgeLocation}
            onCategoryChange={setKnowledgeCategory}
            onSeasonChange={setKnowledgeSeason}
            onTagsChange={setKnowledgeTags}
            onLocationFilterChange={setKnowledgeLocation}
            knowledge={knowledge}
            isLoading={knowledgeQuery.isLoading}
            onAddAsTask={addKnowledgeToTasks}
            onDelete={deleteKnowledge}
            isBusy={isKnowledgeBusy}
            deletingId={
              deleteKnowledgeMutation.isPending && deleteKnowledgeMutation.variables
                ? deleteKnowledgeMutation.variables
                : undefined
            }
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}
