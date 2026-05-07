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

type MergedIngredientLine = {
  groupKey: string;
  label: string;
  amounts: string[];
  recipeIds: string[];
  recipeTitles: string[];
  sourceLines: PrepareIngredientLine[];
};

const EMPTY_PREPARE_LINES: PrepareIngredientLine[] = [];

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

  const [listTitle, setListTitle] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      if (mergedLines.length === 0) {
        throw new Error("No ingredient lines");
      }
      const body = {
        title: listTitle.trim() || "Shopping list",
        sourceCookPlanId: prepareQuery.data?.planId ?? null,
        lines: mergedLines.map((line) => {
          const lineState = mergedLineState(line, mergedStates);
          const amountText = line.amounts.join(" + ") || null;
          const mealText = line.recipeTitles.length > 0 ? ` (${line.recipeTitles.join(", ")})` : "";
          return {
            label: `${line.label}${amountText ? ` ${amountText}` : ""}${mealText}`,
            quantity: amountText,
            line_state: lineState,
            source_recipe_id: line.recipeIds.length === 1 ? line.recipeIds[0] : null,
          };
        }),
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

  const lines = prepareQuery.data?.lines ?? EMPTY_PREPARE_LINES;
  const mergedLines = mergeIngredientLines(lines);

  const summaryCounts = (() => {
    let need = 0;
    let atHome = 0;
    for (const line of mergedLines) {
      const st = mergedLineState(line, mergedStates);
      if (st === "at_home") {
        atHome += 1;
      } else {
        need += 1;
      }
    }
    return { need, atHome, total: mergedLines.length };
  })();

  const setMergedLineState = (line: MergedIngredientLine, line_state: LineState) => {
    setStates((prev) => {
      const next = { ...prev };
      for (const sourceLine of line.sourceLines) {
        next[sourceLine.lineKey] = line_state;
      }
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Prepare</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mark what you have at home vs what to buy. Ingredients are merged across recipes, and
            the shared list only shows lines marked <strong>need</strong>.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/plan-to-cook">Back to plan</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ingredient list</CardTitle>
          <CardDescription>
            Default is <strong>need to buy</strong>. Each ingredient shows which meals use it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {prepareQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : prepareQuery.error ? (
            <p className="text-sm text-destructive">
              {prepareQuery.error instanceof Error ? prepareQuery.error.message : "Error"}
            </p>
          ) : mergedLines.length === 0 ? (
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

              <ul className="space-y-2">
                {mergedLines.map((line) => {
                  const st = mergedLineState(line, mergedStates);
                  return (
                    <li
                      key={line.groupKey}
                      className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium leading-snug">{line.label}</p>
                        {line.amounts.length > 0 ? (
                          <p className="text-xs text-muted-foreground">
                            {line.amounts.join(" + ")}
                          </p>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          Meals: {line.recipeTitles.join(", ")}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-1">
                        <StateButton
                          active={st === "at_home"}
                          onClick={() => setMergedLineState(line, "at_home")}
                          label="At home"
                        />
                        <StateButton
                          active={st === "need"}
                          onClick={() => setMergedLineState(line, "need")}
                          label="Need"
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>

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
                  disabled={createMutation.isPending || mergedLines.length === 0}
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

function normalizeIngredientKey(value: string): string {
  return value.toLocaleLowerCase("sv-SE").replace(/\s+/g, " ").trim();
}

function pushUnique(values: string[], next: string) {
  if (!values.includes(next)) {
    values.push(next);
  }
}

function mergeIngredientLines(lines: PrepareIngredientLine[]): MergedIngredientLine[] {
  const map = new Map<string, MergedIngredientLine>();
  for (const line of lines) {
    const key = normalizeIngredientKey(line.ingredient_label || line.text);
    if (!key) {
      continue;
    }
    const existing =
      map.get(key) ??
      ({
        groupKey: key,
        label: line.ingredient_label || line.text,
        amounts: [],
        recipeIds: [],
        recipeTitles: [],
        sourceLines: [],
      } satisfies MergedIngredientLine);
    if (line.amount.trim()) {
      pushUnique(existing.amounts, line.amount.trim());
    }
    pushUnique(existing.recipeIds, line.recipeId);
    pushUnique(existing.recipeTitles, line.recipeTitle);
    existing.sourceLines.push(line);
    map.set(key, existing);
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, "sv"));
}

function mergedLineState(
  line: MergedIngredientLine,
  states: Record<string, LineState>,
): LineState {
  return line.sourceLines.every((sourceLine) => states[sourceLine.lineKey] === "at_home")
    ? "at_home"
    : "need";
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
