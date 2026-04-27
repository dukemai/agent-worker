"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
  status: string;
  submitted_by: string;
  created_at: string;
};

type CandidateResponse = {
  candidates: RecipeCandidate[];
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

async function createCandidate(input: {
  title: string;
  sourceUrl: string;
  notes: string;
  rawText: string;
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

const candidateStatuses = [
  { value: "want_to_try", label: "Want to try" },
  { value: "looks_good", label: "Looks good" },
  { value: "needs_changes", label: "Needs changes" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
] as const;

export function FamilyRecipesDashboard() {
  const queryClient = useQueryClient();
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [rawText, setRawText] = useState("");

  const householdQuery = useQuery({ queryKey: ["household"], queryFn: fetchHousehold });
  const candidatesQuery = useQuery({
    queryKey: ["recipe-collaboration-candidates"],
    queryFn: fetchCandidates,
  });

  const inviteMutation = useMutation({
    mutationFn: createInvite,
    onSuccess: (data) => {
      setInviteUrl(data.inviteUrl);
      setCopied(false);
    },
  });

  const createCandidateMutation = useMutation({
    mutationFn: createCandidate,
    onSuccess: async () => {
      setTitle("");
      setSourceUrl("");
      setNotes("");
      setRawText("");
      await queryClient.invalidateQueries({ queryKey: ["recipe-collaboration-candidates"] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: updateCandidateStatus,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["recipe-collaboration-candidates"] });
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
      rawText: rawText.trim(),
    });
  }

  const household = householdQuery.data?.household;
  const member = householdQuery.data?.member;
  const candidates = candidatesQuery.data?.candidates ?? [];
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
              : null;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Family recipe collaboration</CardTitle>
          <CardDescription>
            A shared space for adding recipe ideas and reviewing what the family wants to cook.
          </CardDescription>
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Add recipe idea</CardTitle>
            <CardDescription>
              Add a link, notes, or pasted text. Owner can later convert accepted ideas into saved
              recipes.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Why this looks good, what to change, who might like it..."
                rows={4}
              />
              <Textarea
                value={rawText}
                onChange={(event) => setRawText(event.target.value)}
                placeholder="Optional pasted recipe text or markdown"
                rows={6}
              />
              <Button type="submit" disabled={createCandidateMutation.isPending || !title.trim()}>
                {createCandidateMutation.isPending ? "Adding..." : "Add recipe idea"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Review queue</CardTitle>
            <CardDescription>Recipe ideas submitted by household members.</CardDescription>
          </CardHeader>
          <CardContent>
            {candidatesQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading recipe ideas...</p>
            ) : null}
            {!candidatesQuery.isLoading && candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recipe ideas yet.</p>
            ) : null}
            {candidates.length > 0 ? (
              <ul className="space-y-3">
                {candidates.map((candidate) => (
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
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {candidateStatuses.map((status) => (
                          <Button
                            key={status.value}
                            type="button"
                            size="sm"
                            variant={candidate.status === status.value ? "secondary" : "outline"}
                            disabled={statusMutation.isPending}
                            onClick={() =>
                              statusMutation.mutate({ id: candidate.id, status: status.value })
                            }
                          >
                            {status.label}
                          </Button>
                        ))}
                      </div>
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
    </main>
  );
}
