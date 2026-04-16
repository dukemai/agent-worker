"use client";

import type { PrepareIngredientLine } from "@/lib/cook-plan-ingredients";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { LineStateSummary } from "@/components/dashboard/line-state-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type LineState = "at_home" | "need";

async function fetchPrepare(): Promise<{ planId: string; lines: PrepareIngredientLine[] }> {
  const res = await fetch("/api/cook-plan/prepare", { cache: "no-store" });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? "Failed to load prepare data");
  }
  return res.json() as Promise<{ planId: string; lines: PrepareIngredientLine[] }>;
}

export function PlanToCookPrepare() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const prepareQuery = useQuery({ queryKey: ["cook-plan-prepare"], queryFn: fetchPrepare });

  const initialStates = useMemo(() => {
    const m: Record<string, LineState> = {};
    for (const line of prepareQuery.data?.lines ?? []) {
      m[line.lineKey] = "need";
    }
    return m;
  }, [prepareQuery.data?.lines]);

  const [states, setStates] = useState<Record<string, LineState>>({});

  const mergedStates = useMemo(() => {
    return { ...initialStates, ...states };
  }, [initialStates, states]);

  const setLineState = (lineKey: string, line_state: LineState) => {
    setStates((prev) => ({ ...prev, [lineKey]: line_state }));
  };

  const [listTitle, setListTitle] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const lines = prepareQuery.data?.lines ?? [];
      if (lines.length === 0) {
        throw new Error("No ingredient lines");
      }
      const body = {
        title: listTitle.trim() || "Shopping list",
        sourceCookPlanId: prepareQuery.data?.planId ?? null,
        lines: lines.map((line) => ({
          label: line.text,
          quantity: null as string | null,
          line_state: mergedStates[line.lineKey] ?? "need",
          source_recipe_id: line.recipeId,
        })),
      };
      const res = await fetch("/api/shared-shopping-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Could not create list");
      }
      return res.json() as Promise<{
        list: { id: string; public_slug: string; title: string };
      }>;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["shared-shopping-lists"] });
      router.push(`/plan-to-cook/lists/${data.list.id}`);
    },
  });

  const lines = useMemo(() => prepareQuery.data?.lines ?? [], [prepareQuery.data?.lines]);
  const byRecipe = useMemo(() => {
    const map = new Map<string, PrepareIngredientLine[]>();
    for (const line of lines) {
      const arr = map.get(line.recipeId) ?? [];
      arr.push(line);
      map.set(line.recipeId, arr);
    }
    return map;
  }, [lines]);

  const summaryCounts = useMemo(() => {
    let need = 0;
    let atHome = 0;
    for (const line of lines) {
      const st = mergedStates[line.lineKey] ?? "need";
      if (st === "at_home") {
        atHome += 1;
      } else {
        need += 1;
      }
    }
    return { need, atHome, total: lines.length };
  }, [lines, mergedStates]);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Prepare</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mark what you have at home vs what to buy. The shared list only shows lines marked{" "}
            <strong>need</strong>.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/plan-to-cook">Back to plan</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ingredient lines</CardTitle>
          <CardDescription>
            Default is <strong>need to buy</strong>. Use <strong>have at home</strong> to skip a line.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {prepareQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : prepareQuery.error ? (
            <p className="text-sm text-destructive">
              {prepareQuery.error instanceof Error ? prepareQuery.error.message : "Error"}
            </p>
          ) : lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No ingredients to prepare. Add recipes to your{" "}
              <Link href="/plan-to-cook" className="text-primary underline-offset-4 hover:underline">
                plan
              </Link>
              .
            </p>
          ) : (
            <div className="space-y-6">
              <LineStateSummary
                need={summaryCounts.need}
                atHome={summaryCounts.atHome}
                total={summaryCounts.total}
              />

              {[...byRecipe.entries()].map(([recipeId, recipeLines]) => (
                <section key={recipeId} className="space-y-2">
                  <h2 className="text-sm font-semibold text-foreground">
                    {recipeLines[0]?.recipeTitle ?? "Recipe"}
                  </h2>
                  <ul className="space-y-2">
                    {recipeLines.map((line) => {
                      const st = mergedStates[line.lineKey] ?? "need";
                      return (
                        <li
                          key={line.lineKey}
                          className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <p className="text-sm leading-snug">{line.text}</p>
                          <div className="flex flex-wrap gap-1">
                            <StateButton
                              active={st === "at_home"}
                              onClick={() => setLineState(line.lineKey, "at_home")}
                              label="At home"
                            />
                            <StateButton
                              active={st === "need"}
                              onClick={() => setLineState(line.lineKey, "need")}
                              label="Need"
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}

              <div className="space-y-2 border-t pt-4">
                <span className="text-xs font-medium text-muted-foreground">List title</span>
                <Input
                  value={listTitle}
                  onChange={(e) => setListTitle(e.target.value)}
                  placeholder="Optional title for the shared list"
                  maxLength={200}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={createMutation.isPending || lines.length === 0}
                  onClick={() => void createMutation.mutateAsync()}
                >
                  {createMutation.isPending ? "Creating…" : "Generate shopping list"}
                </Button>
                {createMutation.error ? (
                  <p className="text-sm text-destructive">
                    {createMutation.error instanceof Error
                      ? createMutation.error.message
                      : "Error"}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StateButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      className="whitespace-nowrap"
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
