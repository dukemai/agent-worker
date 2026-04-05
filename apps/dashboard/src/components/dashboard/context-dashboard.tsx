"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PROMO_WATCHLIST_KEY } from "@/lib/promo-watchlist";
import type { FamilyContext } from "@/types/database";

async function fetchContext(): Promise<FamilyContext[]> {
  const response = await fetch("/api/context", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to fetch context");
  }
  const json = (await response.json()) as { context: FamilyContext[] };
  return json.context;
}

async function throwApiError(response: Response, fallback: string): Promise<never> {
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(json.error ?? fallback);
}

export function ContextDashboard() {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const queryClient = useQueryClient();

  const contextQuery = useQuery({
    queryKey: ["context"],
    queryFn: fetchContext,
  });

  const upsertMutation = useMutation({
    mutationFn: async ({ itemKey, itemValue }: { itemKey: string; itemValue: string }) => {
      const response = await fetch(`/api/context/${encodeURIComponent(itemKey)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: itemValue }),
      });
      if (!response.ok) {
        await throwApiError(response, "Failed to save context");
      }
      return response.json();
    },
    onSuccess: async () => {
      setKey("");
      setValue("");
      await queryClient.invalidateQueries({ queryKey: ["context"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemKey: string) => {
      const response = await fetch(`/api/context/${encodeURIComponent(itemKey)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        await throwApiError(response, "Failed to delete context");
      }
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["context"] });
    },
  });

  async function onUpsert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await upsertMutation.mutateAsync({ itemKey: key, itemValue: value });
    } catch {
      return;
    }
  }

  async function onDelete(itemKey: string) {
    try {
      await deleteMutation.mutateAsync(itemKey);
    } catch {
      return;
    }
  }

  const error =
    contextQuery.error instanceof Error
      ? contextQuery.error.message
      : upsertMutation.error instanceof Error
        ? upsertMutation.error.message
        : deleteMutation.error instanceof Error
          ? deleteMutation.error.message
          : null;
  const loading = contextQuery.isLoading;
  const items = contextQuery.data ?? [];
  const isBusy = upsertMutation.isPending || deleteMutation.isPending;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Upsert Context</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onUpsert}>
            <Input
              placeholder="Key (shopping_list, seasonal_interests, plants_at_home)"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              required
            />
            <Textarea
              placeholder="Value"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              required
            />
            <Button type="submit" className="min-h-11 w-full sm:w-auto">
              Save
            </Button>
          </form>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            <Link
              href="/promo-grocery-watchlist"
              className="font-medium text-primary underline underline-offset-4"
            >
              Promo grocery watchlist
            </Link>{" "}
            (<code className="rounded bg-muted px-1 text-xs">{PROMO_WATCHLIST_KEY}</code>) is
            edited on its own page and not listed here.
          </p>
          {loading ? <p>Loading context...</p> : null}
          {!loading && items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No context values yet.</p>
          ) : null}
          {items.map((item) => (
            <article key={item.key} className="rounded-md border p-3">
              <p className="font-medium">{item.key}</p>
              <p className="mb-2 whitespace-pre-wrap text-sm">{item.value}</p>
              <p className="mb-2 text-xs text-muted-foreground">
                Updated: {new Date(item.last_updated).toLocaleString()}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="min-h-11"
                onClick={() => onDelete(item.key)}
                disabled={isBusy}
              >
                Delete
              </Button>
            </article>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
