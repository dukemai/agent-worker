"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { LineStateSummary } from "@/components/dashboard/line-state-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type LineState = "at_home" | "need";

function normalizeLineState(raw: string): LineState {
  return raw === "at_home" ? "at_home" : "need";
}

type ListRow = {
  id: string;
  public_slug: string;
  title: string;
  source_cook_plan_id: string | null;
  created_at: string;
  updated_at: string;
};

type ItemRow = {
  id: string;
  sort_order: number;
  label: string;
  quantity: string | null;
  line_state: LineState;
  source_recipe_id: string | null;
};

async function fetchList(id: string): Promise<{ list: ListRow; items: ItemRow[] }> {
  const res = await fetch(`/api/shared-shopping-lists/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? "Failed to load list");
  }
  return res.json() as Promise<{ list: ListRow; items: ItemRow[] }>;
}

export function SharedShoppingListEditor({ listId }: { listId: string }) {
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["shared-shopping-list", listId], queryFn: () => fetchList(listId) });

  const [titleOverride, setTitleOverride] = useState<string | null>(null);
  const title = titleOverride ?? q.data?.list.title ?? "";

  const items = useMemo(() => q.data?.items ?? [], [q.data?.items]);
  const slug = q.data?.list.public_slug ?? "";

  const [states, setStates] = useState<Record<string, LineState>>({});

  const merged = useMemo(() => {
    const m: Record<string, LineState> = {};
    for (const it of items) {
      m[it.id] = states[it.id] ?? normalizeLineState(it.line_state);
    }
    return m;
  }, [items, states]);

  const summaryCounts = useMemo(() => {
    let need = 0;
    let atHome = 0;
    for (const it of items) {
      const st = merged[it.id] ?? normalizeLineState(it.line_state);
      if (st === "at_home") {
        atHome += 1;
      } else {
        need += 1;
      }
    }
    return { need, atHome, total: items.length };
  }, [items, merged]);

  const setLine = (id: string, line_state: LineState) => {
    setStates((s) => ({ ...s, [id]: line_state }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        title: title.trim() || "Shopping list",
        lines: items.map((it) => ({
          label: it.label,
          quantity: it.quantity,
          line_state: merged[it.id] ?? normalizeLineState(it.line_state),
          source_recipe_id: it.source_recipe_id,
        })),
      };
      const res = await fetch(`/api/shared-shopping-lists/${encodeURIComponent(listId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Save failed");
      }
      return res.json() as Promise<{ list: ListRow; items: ItemRow[] }>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["shared-shopping-list", listId] });
      void queryClient.invalidateQueries({ queryKey: ["shared-shopping-lists"] });
      setStates({});
      setTitleOverride(null);
    },
  });

  function copyLink() {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/shop/${slug}`;
    void navigator.clipboard.writeText(url);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shopping list</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Changes save to the same public link. Recipients only see lines marked <strong>need</strong>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => copyLink()}>
            Copy public link
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/plan-to-cook">Plan to cook</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Edit</CardTitle>
          <CardDescription>
            Public URL: <span className="font-mono text-xs">/shop/{slug || "…"}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {q.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : q.error ? (
            <p className="text-sm text-destructive">
              {q.error instanceof Error ? q.error.message : "Error"}
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Title</span>
                <Input
                  value={title}
                  onChange={(e) => setTitleOverride(e.target.value)}
                  maxLength={200}
                />
              </div>

              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No lines.</p>
              ) : (
                <div className="space-y-4">
                  <LineStateSummary
                    need={summaryCounts.need}
                    atHome={summaryCounts.atHome}
                    total={summaryCounts.total}
                  />
                <ul className="space-y-2">
                  {items.map((it) => {
                    const st = merged[it.id] ?? normalizeLineState(it.line_state);
                    return (
                      <li
                        key={it.id}
                        className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <p className="text-sm leading-snug">{it.label}</p>
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant={st === "at_home" ? "default" : "outline"}
                            onClick={() => setLine(it.id, "at_home")}
                          >
                            At home
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={st === "need" ? "default" : "outline"}
                            onClick={() => setLine(it.id, "need")}
                          >
                            Need
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                </div>
              )}

              <Button
                type="button"
                disabled={saveMutation.isPending || items.length === 0}
                onClick={() => void saveMutation.mutateAsync()}
              >
                {saveMutation.isPending ? "Saving…" : "Save changes"}
              </Button>
              {saveMutation.error ? (
                <p className="text-sm text-destructive">
                  {saveMutation.error instanceof Error ? saveMutation.error.message : "Error"}
                </p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
