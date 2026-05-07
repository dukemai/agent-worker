"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ImagePlus,
  Loader2,
  MoreHorizontal,
  Search,
  StickyNote,
  Wand2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  type FoodTypesJson,
  fetchFoodTypes,
} from "@/components/dashboard/recipe-generator-api";
import {
  RECIPE_STYLE_TARGET_MAX,
  RECIPE_STYLE_TARGET_MIN,
  recipeStyleProgressBand,
  recipeStyleTargetRangeLabel,
} from "@/lib/recipe-collection-targets";
import { cn } from "@/lib/utils";

type HouseholdResponse = {
  household: { id: string; name: string };
  member: { role: "owner" | "collaborator" };
  members: Array<{ id: string; display_name: string; role: string; created_at: string }>;
};

type RecipeCandidate = {
  id: string;
  title: string;
  source_url: string | null;
  notes: string;
  raw_text: string;
  image_urls: string[];
  status: string;
  converted_recipe_id: string | null;
  submitted_by: string;
  created_at: string;
};

type CandidateResponse = {
  candidates: RecipeCandidate[];
};

type RecipeStyleCountsResponse = {
  styleCounts: Array<{ food_type_id: string; count: number }>;
};

async function throwApiError(response: Response, fallback: string): Promise<never> {
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(json.error ?? fallback);
}

async function fetchHousehold(): Promise<HouseholdResponse> {
  const response = await fetch("/api/household", { cache: "no-store" });
  if (!response.ok) {
    await throwApiError(response, "Failed to load household");
  }
  return response.json() as Promise<HouseholdResponse>;
}

async function createInvite(): Promise<{ inviteUrl: string }> {
  const response = await fetch("/api/household/invites", { method: "POST" });
  if (!response.ok) {
    await throwApiError(response, "Failed to create invite");
  }
  return response.json() as Promise<{ inviteUrl: string }>;
}

async function fetchCandidates(): Promise<CandidateResponse> {
  const response = await fetch("/api/recipe-collaboration/candidates", { cache: "no-store" });
  if (!response.ok) {
    await throwApiError(response, "Failed to load recipe candidates");
  }
  return response.json() as Promise<CandidateResponse>;
}

async function fetchRecipeStyleCounts(): Promise<RecipeStyleCountsResponse> {
  const response = await fetch("/api/recipe-collaboration/style-counts", { cache: "no-store" });
  if (!response.ok) {
    await throwApiError(response, "Failed to load recipe style counts");
  }
  return response.json() as Promise<RecipeStyleCountsResponse>;
}

async function createCandidate(input: {
  title: string;
  sourceUrl: string;
  notes: string;
  ingredientNotes: string;
  cookingNotes: string;
  rawText: string;
  imageUrls: string[];
}): Promise<{ candidate: RecipeCandidate }> {
  const response = await fetch("/api/recipe-collaboration/candidates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    await throwApiError(response, "Failed to add recipe idea");
  }
  return response.json() as Promise<{ candidate: RecipeCandidate }>;
}

async function uploadCandidateImages(files: File[]): Promise<string[]> {
  if (files.length === 0) {
    return [];
  }
  const form = new FormData();
  for (const file of files) {
    form.append("images", file);
  }
  const response = await fetch("/api/recipe-collaboration/candidate-images", {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    await throwApiError(response, "Failed to upload recipe images");
  }
  const json = (await response.json()) as { imageUrls?: string[] };
  return json.imageUrls ?? [];
}

async function completeCandidateWithAi(id: string): Promise<{
  recipe: { id: string; title: string };
  deletedCandidateId: string;
}> {
  const response = await fetch(
    `/api/recipe-collaboration/candidates/${encodeURIComponent(id)}/complete`,
    { method: "POST" },
  );
  if (!response.ok) {
    await throwApiError(response, "Failed to complete recipe idea");
  }
  return response.json() as Promise<{
    recipe: { id: string; title: string };
    deletedCandidateId: string;
  }>;
}

async function updateCandidateStatus(input: {
  id: string;
  status: string;
}): Promise<{ candidate: RecipeCandidate }> {
  const response = await fetch(`/api/recipe-collaboration/candidates/${input.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: input.status }),
  });
  if (!response.ok) {
    await throwApiError(response, "Failed to update recipe idea");
  }
  return response.json() as Promise<{ candidate: RecipeCandidate }>;
}

async function addCandidateNotes(input: {
  id: string;
  notes: string;
  ingredientNotes: string;
  cookingNotes: string;
  imageUrls: string[];
}): Promise<{ candidate: RecipeCandidate }> {
  const response = await fetch(`/api/recipe-collaboration/candidates/${input.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      notes: input.notes,
      ingredientNotes: input.ingredientNotes,
      cookingNotes: input.cookingNotes,
      imageUrls: input.imageUrls,
    }),
  });
  if (!response.ok) {
    await throwApiError(response, "Failed to add recipe notes");
  }
  return response.json() as Promise<{ candidate: RecipeCandidate }>;
}

const candidateStatuses = [
  { value: "want_to_try", label: "Want to try" },
  { value: "looks_good", label: "Looks good" },
  { value: "needs_changes", label: "Needs changes" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "done", label: "Done reviewing" },
] as const;

export function FamilyRecipesDashboard({ compact = false }: { compact?: boolean }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [addIdeaOpen, setAddIdeaOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [ingredientNotes, setIngredientNotes] = useState("");
  const [cookingNotes, setCookingNotes] = useState("");
  const [rawText, setRawText] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [completingCandidateId, setCompletingCandidateId] = useState<string | null>(null);
  const [notesCandidate, setNotesCandidate] = useState<RecipeCandidate | null>(null);
  const [reviewIngredientNotes, setReviewIngredientNotes] = useState("");
  const [reviewCookingNotes, setReviewCookingNotes] = useState("");
  const [reviewRecipeNotes, setReviewRecipeNotes] = useState("");
  const [reviewImageFiles, setReviewImageFiles] = useState<File[]>([]);

  const householdQuery = useQuery({ queryKey: ["household"], queryFn: fetchHousehold });
  const candidatesQuery = useQuery({
    queryKey: ["recipe-collaboration-candidates"],
    queryFn: fetchCandidates,
  });
  const styleCountsQuery = useQuery({
    queryKey: ["recipe-collaboration-style-counts"],
    queryFn: fetchRecipeStyleCounts,
  });
  const foodTypesQuery = useQuery<FoodTypesJson>({
    queryKey: ["recipe-food-types"],
    queryFn: fetchFoodTypes,
  });

  const inviteMutation = useMutation({
    mutationFn: createInvite,
    onSuccess: (data) => {
      setInviteUrl(data.inviteUrl);
      setCopied(false);
    },
  });

  const createCandidateMutation = useMutation({
    mutationFn: async (input: {
      title: string;
      sourceUrl: string;
      notes: string;
      ingredientNotes: string;
      cookingNotes: string;
      rawText: string;
      imageFiles: File[];
    }) => {
      const imageUrls = await uploadCandidateImages(input.imageFiles);
      return createCandidate({
        title: input.title,
        sourceUrl: input.sourceUrl,
        notes: input.notes,
        ingredientNotes: input.ingredientNotes,
        cookingNotes: input.cookingNotes,
        rawText: input.rawText,
        imageUrls,
      });
    },
    onSuccess: async () => {
      setTitle("");
      setSourceUrl("");
      setNotes("");
      setIngredientNotes("");
      setCookingNotes("");
      setRawText("");
      setImageFiles([]);
      setAddIdeaOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["recipe-collaboration-candidates"] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: updateCandidateStatus,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["recipe-collaboration-candidates"] });
    },
  });

  const addCandidateNotesMutation = useMutation({
    mutationFn: async (input: {
      id: string;
      notes: string;
      ingredientNotes: string;
      cookingNotes: string;
      imageFiles: File[];
    }) => {
      const imageUrls = await uploadCandidateImages(input.imageFiles);
      return addCandidateNotes({
        id: input.id,
        notes: input.notes,
        ingredientNotes: input.ingredientNotes,
        cookingNotes: input.cookingNotes,
        imageUrls,
      });
    },
    onSuccess: async () => {
      setNotesCandidate(null);
      setReviewIngredientNotes("");
      setReviewCookingNotes("");
      setReviewRecipeNotes("");
      setReviewImageFiles([]);
      await queryClient.invalidateQueries({ queryKey: ["recipe-collaboration-candidates"] });
    },
  });

  const completeCandidateMutation = useMutation({
    mutationFn: completeCandidateWithAi,
    onMutate: (candidateId) => {
      setCompletingCandidateId(candidateId);
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["recipe-collaboration-candidates"] }),
        queryClient.invalidateQueries({ queryKey: ["recipe-collaboration-style-counts"] }),
        queryClient.invalidateQueries({ queryKey: ["saved-recipes"] }),
        queryClient.invalidateQueries({ queryKey: ["recipe", data.recipe.id] }),
      ]);
      router.push(`/recipe-generator/${data.recipe.id}/edit`);
    },
    onSettled: () => {
      setCompletingCandidateId(null);
    },
  });

  async function submitCandidate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }
    await createCandidateMutation.mutateAsync({
      title: title.trim(),
      sourceUrl: sourceUrl.trim(),
      notes: notes.trim(),
      ingredientNotes: ingredientNotes.trim(),
      cookingNotes: cookingNotes.trim(),
      rawText: rawText.trim(),
      imageFiles,
    });
  }

  async function submitCandidateNotes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!notesCandidate) {
      return;
    }
    if (
      !reviewIngredientNotes.trim() &&
      !reviewCookingNotes.trim() &&
      !reviewRecipeNotes.trim() &&
      reviewImageFiles.length === 0
    ) {
      return;
    }
    await addCandidateNotesMutation.mutateAsync({
      id: notesCandidate.id,
      notes: reviewRecipeNotes.trim(),
      ingredientNotes: reviewIngredientNotes.trim(),
      cookingNotes: reviewCookingNotes.trim(),
      imageFiles: reviewImageFiles,
    });
  }

  function openNotesDialog(candidate: RecipeCandidate) {
    setNotesCandidate(candidate);
    setReviewIngredientNotes("");
    setReviewCookingNotes("");
    setReviewRecipeNotes("");
    setReviewImageFiles([]);
  }

  const household = householdQuery.data?.household;
  const member = householdQuery.data?.member;
  const candidates = useMemo(
    () => candidatesQuery.data?.candidates ?? [],
    [candidatesQuery.data?.candidates],
  );
  const reviewQueueCandidates = useMemo(
    () => candidates.filter((candidate) => candidate.status !== "done"),
    [candidates],
  );
  const doneReviewCount = candidates.length - reviewQueueCandidates.length;
  const savedCountByFoodTypeId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of styleCountsQuery.data?.styleCounts ?? []) {
      counts.set(row.food_type_id, row.count);
    }
    return counts;
  }, [styleCountsQuery.data?.styleCounts]);
  const visibleStyleCounts = useMemo(
    () =>
      (foodTypesQuery.data?.options ?? [])
        .map((style) => ({
          ...style,
          count: savedCountByFoodTypeId.get(style.id) ?? 0,
        }))
        .filter((style) => style.count > 0),
    [foodTypesQuery.data?.options, savedCountByFoodTypeId],
  );
  const error =
    householdQuery.error instanceof Error
      ? householdQuery.error.message
      : candidatesQuery.error instanceof Error
        ? candidatesQuery.error.message
        : inviteMutation.error instanceof Error
          ? inviteMutation.error.message
          : createCandidateMutation.error instanceof Error
            ? createCandidateMutation.error.message
            : statusMutation.error instanceof Error
              ? statusMutation.error.message
              : addCandidateNotesMutation.error instanceof Error
                ? addCandidateNotesMutation.error.message
                : styleCountsQuery.error instanceof Error
                  ? styleCountsQuery.error.message
                  : foodTypesQuery.error instanceof Error
                    ? foodTypesQuery.error.message
                    : completeCandidateMutation.error instanceof Error
                      ? completeCandidateMutation.error.message
                      : null;

  return (
    <main
      className={
        compact
          ? "mx-auto w-full max-w-3xl space-y-4 py-2"
          : "mx-auto w-full max-w-6xl space-y-4 px-4 py-6"
      }
    >
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Family recipe collaboration</CardTitle>
              <CardDescription className="mt-1.5">
                A shared space for reviewing food styles and recipes the family wants to cook.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline" className="w-full gap-2 sm:w-auto">
                <Link href="/family/recipes/search">
                  <Search className="size-4" aria-hidden />
                  Search recipes
                </Link>
              </Button>
              <Dialog open={addIdeaOpen} onOpenChange={setAddIdeaOpen}>
                <DialogTrigger asChild>
                  <Button type="button" className="w-full sm:w-auto">
                    Add recipe idea
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add recipe idea</DialogTitle>
                  <DialogDescription>
                    Add a link, notes, or pasted text. Owner can later convert accepted ideas into
                    saved recipes.
                  </DialogDescription>
                </DialogHeader>
                <form className="space-y-3" onSubmit={submitCandidate}>
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Recipe title"
                    required
                  />
                  <Input
                    value={sourceUrl}
                    onChange={(event) => setSourceUrl(event.target.value)}
                    placeholder="Source URL"
                    type="url"
                  />
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      Ingredient notes
                    </span>
                    <Textarea
                      value={ingredientNotes}
                      onChange={(event) => setIngredientNotes(event.target.value)}
                      placeholder="Ingredients, rough amounts, substitutions, what was visible in the video..."
                      rows={4}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      Cooking notes
                    </span>
                    <Textarea
                      value={cookingNotes}
                      onChange={(event) => setCookingNotes(event.target.value)}
                      placeholder="Order of steps, timing, texture cues, temperature..."
                      rows={4}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Recipe notes</span>
                    <Textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Why this looks good, what to change, who might like it..."
                      rows={4}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      Pasted text or transcript
                    </span>
                    <Textarea
                      value={rawText}
                      onChange={(event) => setRawText(event.target.value)}
                      placeholder="Optional pasted recipe text, markdown, or transcript"
                      rows={6}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      Recipe images
                    </span>
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      onChange={(event) =>
                        setImageFiles(Array.from(event.currentTarget.files ?? []).slice(0, 4))
                      }
                    />
                  </label>
                  {imageFiles.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {imageFiles.map((file) => (
                        <div
                          key={`${file.name}-${file.size}`}
                          className="flex items-center gap-2 rounded-md border bg-muted/40 p-2 text-xs"
                        >
                          <ImagePlus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                          <span className="min-w-0 truncate">{file.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={createCandidateMutation.isPending}
                      onClick={() => setAddIdeaOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createCandidateMutation.isPending || !title.trim()}
                    >
                      {createCandidateMutation.isPending ? "Adding..." : "Add recipe idea"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {householdQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading household...</p>
          ) : null}
          {household ? (
            <div className="rounded-md border p-3 text-sm">
              <div className="font-medium">{household.name}</div>
              <div className="mt-1 text-muted-foreground">
                Your role: {member?.role ?? "member"} · Members:{" "}
                {householdQuery.data?.members.length ?? 0}
              </div>
            </div>
          ) : null}
          {member?.role === "owner" ? (
            <div className="space-y-2 rounded-md border border-dashed p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={inviteMutation.isPending}
                  onClick={() => inviteMutation.mutate()}
                >
                  {inviteMutation.isPending ? "Creating..." : "Create collaborator invite"}
                </Button>
                {inviteUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={async () => {
                      await navigator.clipboard.writeText(inviteUrl);
                      setCopied(true);
                    }}
                  >
                    {copied ? "Copied" : "Copy invite link"}
                  </Button>
                ) : null}
              </div>
              {inviteUrl ? (
                <p className="break-all text-xs text-muted-foreground">{inviteUrl}</p>
              ) : null}
            </div>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recipe style overview</CardTitle>
          <CardDescription>
            Shared saved recipes by food style. Target {recipeStyleTargetRangeLabel()} per style.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {styleCountsQuery.isLoading || foodTypesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading recipe overview...</p>
          ) : null}
          {!styleCountsQuery.isLoading &&
          !foodTypesQuery.isLoading &&
          visibleStyleCounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved recipes are shared yet.</p>
          ) : null}
          {visibleStyleCounts.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleStyleCounts.map((style) => {
                const band = recipeStyleProgressBand(style.count);
                const progress = Math.min(
                  100,
                  Math.round((style.count / RECIPE_STYLE_TARGET_MAX) * 100),
                );
                const cardTone =
                  band === "lt10"
                    ? "border-rose-200 bg-rose-50 dark:border-rose-900/55 dark:bg-rose-950/35"
                    : band === "lt20"
                      ? "border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-950/30"
                      : band === "lt30"
                        ? "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30"
                        : band === "lt40"
                          ? "border-lime-200 bg-lime-50 dark:border-lime-900/50 dark:bg-lime-950/30"
                          : "border-emerald-200 bg-emerald-50 dark:border-emerald-900/55 dark:bg-emerald-950/35";
                const barTone =
                  band === "lt10"
                    ? "bg-rose-400"
                    : band === "lt20"
                      ? "bg-orange-400"
                      : band === "lt30"
                        ? "bg-amber-400"
                        : band === "lt40"
                          ? "bg-lime-500"
                          : "bg-emerald-500";

                return (
                  <Link
                    key={style.id}
                    href={`/family/recipes/${encodeURIComponent(style.id)}`}
                    className={cn(
                      "block rounded-md border p-3 transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      cardTone,
                    )}
                  >
                    <div className="min-h-10 text-sm font-medium leading-snug">{style.label}</div>
                    <div className="mt-3 flex items-baseline justify-between gap-2">
                      <span className="text-2xl font-semibold tabular-nums">{style.count}</span>
                      <span className="text-xs text-muted-foreground">
                        target {RECIPE_STYLE_TARGET_MIN}–{RECIPE_STYLE_TARGET_MAX}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/80">
                      <div
                        className={cn("h-full rounded-full", barTone)}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Review queue</CardTitle>
            <CardDescription>
              Recipe ideas submitted by household members.
              {doneReviewCount > 0 ? ` ${doneReviewCount} done hidden.` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {candidatesQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading recipe ideas...</p>
            ) : null}
            {!candidatesQuery.isLoading && reviewQueueCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recipe ideas to review.</p>
            ) : null}
            {reviewQueueCandidates.length > 0 ? (
              <ul className="space-y-3">
                {reviewQueueCandidates.map((candidate) => (
                  <li key={candidate.id} className="rounded-md border p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="font-medium">{candidate.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {new Date(candidate.created_at).toLocaleString("sv-SE", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}{" "}
                          · {candidate.status.replace(/_/g, " ")}
                          {candidate.converted_recipe_id ? " · completed" : ""}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-1.5 self-start"
                          >
                            <MoreHorizontal className="size-4" aria-hidden />
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Review actions</DropdownMenuLabel>
                          <DropdownMenuItem onSelect={() => openNotesDialog(candidate)}>
                            <StickyNote className="size-4" aria-hidden />
                            Add notes or images
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={statusMutation.isPending}
                            onSelect={() =>
                              statusMutation.mutate({ id: candidate.id, status: "done" })
                            }
                          >
                            <CheckCircle2 className="size-4" aria-hidden />
                            Mark review done
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={
                              completeCandidateMutation.isPending ||
                              Boolean(candidate.converted_recipe_id) ||
                              (!candidate.notes.trim() && !candidate.raw_text.trim())
                            }
                            onSelect={() => completeCandidateMutation.mutate(candidate.id)}
                          >
                            {completingCandidateId === candidate.id ? (
                              <Loader2 className="size-4 animate-spin" aria-hidden />
                            ) : (
                              <Wand2 className="size-4" aria-hidden />
                            )}
                            {completingCandidateId === candidate.id
                              ? "Completing..."
                              : candidate.converted_recipe_id
                                ? "Completed"
                                : "Complete with AI"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Status</DropdownMenuLabel>
                          {candidateStatuses.map((status) => (
                            <DropdownMenuItem
                              key={status.value}
                              disabled={statusMutation.isPending}
                              onSelect={() =>
                                statusMutation.mutate({ id: candidate.id, status: status.value })
                              }
                            >
                              <span
                                className={cn(
                                  "size-2 rounded-full border",
                                  candidate.status === status.value
                                    ? "border-primary bg-primary"
                                    : "border-muted-foreground/50",
                                )}
                                aria-hidden
                              />
                              {status.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {candidate.source_url ? (
                      <a
                        className="mt-2 block break-all text-sm text-primary underline underline-offset-2"
                        href={candidate.source_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {candidate.source_url}
                      </a>
                    ) : null}
                    {candidate.image_urls.length > 0 ? (
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {candidate.image_urls.map((url) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="group block overflow-hidden rounded-md border bg-muted"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={`Recipe reference for ${candidate.title}`}
                              className="aspect-square w-full object-cover transition group-hover:scale-105"
                            />
                          </a>
                        ))}
                      </div>
                    ) : null}
                    {candidate.notes ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm">{candidate.notes}</p>
                    ) : null}
                    {candidate.raw_text ? (
                      <details className="mt-2 text-sm">
                        <summary className="cursor-pointer text-muted-foreground">
                          Pasted text
                        </summary>
                        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 text-xs">
                          {candidate.raw_text}
                        </pre>
                      </details>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={Boolean(notesCandidate)}
        onOpenChange={(open) => {
          if (!open) {
            setNotesCandidate(null);
            setReviewIngredientNotes("");
            setReviewCookingNotes("");
            setReviewRecipeNotes("");
            setReviewImageFiles([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add review notes</DialogTitle>
            <DialogDescription>
              Add ingredient, recipe, or image notes to help complete this recipe later.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={submitCandidateNotes}>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Ingredient notes</span>
              <Textarea
                value={reviewIngredientNotes}
                onChange={(event) => setReviewIngredientNotes(event.target.value)}
                placeholder="Ingredients, rough amounts, missing items, substitutions..."
                rows={4}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Recipe notes</span>
              <Textarea
                value={reviewRecipeNotes}
                onChange={(event) => setReviewRecipeNotes(event.target.value)}
                placeholder="Flavor, family preferences, what to adjust, source context..."
                rows={4}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Cooking notes</span>
              <Textarea
                value={reviewCookingNotes}
                onChange={(event) => setReviewCookingNotes(event.target.value)}
                placeholder="Steps, timing, heat level, doneness cues..."
                rows={4}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Recipe images</span>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={(event) =>
                  setReviewImageFiles(Array.from(event.currentTarget.files ?? []).slice(0, 4))
                }
              />
            </label>
            {reviewImageFiles.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {reviewImageFiles.map((file) => (
                  <div
                    key={`${file.name}-${file.size}`}
                    className="flex items-center gap-2 rounded-md border bg-muted/40 p-2 text-xs"
                  >
                    <ImagePlus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 truncate">{file.name}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={addCandidateNotesMutation.isPending}
                onClick={() => setNotesCandidate(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  addCandidateNotesMutation.isPending ||
                  (!reviewIngredientNotes.trim() &&
                    !reviewCookingNotes.trim() &&
                    !reviewRecipeNotes.trim() &&
                    reviewImageFiles.length === 0)
                }
              >
                {addCandidateNotesMutation.isPending ? "Saving..." : "Save notes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
