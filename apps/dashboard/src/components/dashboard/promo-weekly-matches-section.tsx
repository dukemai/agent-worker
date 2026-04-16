"use client";

import { getISOWeekNumber, type PromoMealPlanResult } from "@agent/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import type { PromoMealPlanResponseMeta } from "@/types/promo-meal-plan";
import { PromoMealPlanWeekView } from "@/components/dashboard/promo-meal-plan-week-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PromoMatchItemRow, PromoMatchRunRow } from "@/app/api/promo-matches/latest/route";
import { isInterestFoodCatalogItem } from "@/lib/promo-match-interest-food";
import { PROMO_MEAL_PLAN_SAMPLE, PROMO_MEAL_PLAN_SAMPLE_META } from "@/lib/promo-meal-plan-sample";
import { parsePromoPickerCatalogJson } from "@/lib/promo-picker-catalog-validate";
import type { PromoPickerCatalog } from "@/types/promo-picker-catalog";

type LatestResponse = {
  run: PromoMatchRunRow | null;
  items: PromoMatchItemRow[];
};

async function fetchLatest(): Promise<LatestResponse> {
  const response = await fetch("/api/promo-matches/latest", { cache: "no-store" });
  if (!response.ok) {
    const json = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(json.error ?? "Failed to load promo matches");
  }
  return response.json() as Promise<LatestResponse>;
}

async function fetchPickerCatalog(): Promise<PromoPickerCatalog> {
  const response = await fetch("/data/ica-maxi-promo-picker-catalog.json", {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load picker catalog");
  }
  const raw: unknown = await response.json();
  return parsePromoPickerCatalogJson(raw);
}

export function PromoWeeklyMatchesSection() {
  const [showSampleMealPlan, setShowSampleMealPlan] = useState(false);
  const queryClient = useQueryClient();
  const latestQuery = useQuery({
    queryKey: ["promo-matches-latest"],
    queryFn: fetchLatest,
  });

  const catalogQuery = useQuery({
    queryKey: ["promo-picker-catalog"],
    queryFn: fetchPickerCatalog,
  });

  const mealPlanMutation = useMutation({
    mutationFn: async (runId: string) => {
      const response = await fetch("/api/promo-matches/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      });
      const json = (await response.json().catch(() => ({}))) as {
        error?: string;
        plan?: PromoMealPlanResult;
        meta?: PromoMealPlanResponseMeta;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "Meal plan request failed");
      }
      if (!json.plan || !json.meta) {
        throw new Error("Invalid meal plan response");
      }
      return { plan: json.plan, meta: json.meta };
    },
    onSuccess: () => {
      setShowSampleMealPlan(false);
    },
  });

  const deleteRunMutation = useMutation({
    mutationFn: async (runId: string) => {
      const response = await fetch(`/api/promo-matches/run/${runId}`, { method: "DELETE" });
      const json = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to remove import");
      }
    },
    onSuccess: async () => {
      mealPlanMutation.reset();
      setShowSampleMealPlan(false);
      await queryClient.invalidateQueries({ queryKey: ["promo-matches-latest"] });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/promo-matches/import", {
        method: "POST",
        body: form,
      });
      const json = (await response.json().catch(() => ({}))) as {
        error?: string;
        runId?: string;
        itemCount?: number;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "Import failed");
      }
      return json;
    },
    onSuccess: async () => {
      mealPlanMutation.reset();
      setShowSampleMealPlan(false);
      await queryClient.invalidateQueries({ queryKey: ["promo-matches-latest"] });
    },
  });

  const run = latestQuery.data?.run ?? null;
  const items = latestQuery.data?.items ?? [];
  const summaryWeek =
    run != null && typeof run.week_number === "number" && Number.isFinite(run.week_number)
      ? run.week_number
      : items.length > 0
        ? items[0].week_number
        : run
          ? getISOWeekNumber(new Date(run.created_at))
          : null;

  const weekLabelId = "promo-matches-iso-week";

  const showLiveMealPlan = mealPlanMutation.isSuccess;
  const showSampleOnly = showSampleMealPlan && !showLiveMealPlan;
  const mealPlanVisual =
    showLiveMealPlan && mealPlanMutation.data
      ? {
          plan: mealPlanMutation.data.plan,
          meta: mealPlanMutation.data.meta,
          sample: false as const,
        }
      : showSampleOnly
        ? {
            plan: PROMO_MEAL_PLAN_SAMPLE,
            meta: PROMO_MEAL_PLAN_SAMPLE_META,
            sample: true as const,
          }
        : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <CardTitle>This week&apos;s matched promotions</CardTitle>
          {run && summaryWeek != null ? (
            <Badge variant="secondary" className="text-sm font-semibold">
              ISO week {summaryWeek}
            </Badge>
          ) : null}
        </div>
        <CardDescription>
          Upload <code className="rounded bg-muted px-1 text-xs">watchlist-matches-only.json</code>{" "}
          from{" "}
          <code className="rounded bg-muted px-1 text-xs">
            apps/playwright-tools/data/promo-run/
          </code>{" "}
          after running the ICA extract test. With offers imported, you can generate a Swedish meal
          plan from this list (Gemini) or use Preview sample week to see the layout without calling the
          API.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="file"
            accept="application/json,.json"
            className="text-sm file:me-3 file:rounded-md file:border file:bg-muted file:px-3 file:py-2"
            disabled={importMutation.isPending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) {
                importMutation.mutate(file);
              }
            }}
          />
          {importMutation.isPending ? (
            <span className="text-sm text-muted-foreground">Importing…</span>
          ) : null}
        </div>
        {importMutation.isError ? (
          <p className="text-sm text-red-600">
            {importMutation.error instanceof Error
              ? importMutation.error.message
              : "Import failed"}
          </p>
        ) : null}
        {importMutation.isSuccess ? (
          <p className="text-sm text-green-700">
            Saved run with {importMutation.data.itemCount} offer
            {importMutation.data.itemCount === 1 ? "" : "s"}.
          </p>
        ) : null}
        {latestQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading saved matches…</p>
        ) : null}
        {latestQuery.error instanceof Error ? (
          <p className="text-sm text-red-600">{latestQuery.error.message}</p>
        ) : null}
        {!latestQuery.isLoading && !run ? (
          <p className="text-sm text-muted-foreground">
            No import yet. Run Playwright extract, then upload the JSON here.
          </p>
        ) : null}
        {run ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Latest import:{" "}
              {new Date(run.created_at).toLocaleString("sv-SE", {
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              {typeof run.week_number === "number" ? (
                <>
                  {" "}
                  · <span className="font-medium text-foreground">ISO week {run.week_number}</span>
                </>
              ) : null}{" "}
              · {run.store_key} · {(run.interests as string[])?.length ?? 0} watchlist interests
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full shrink-0 sm:w-auto"
              disabled={deleteRunMutation.isPending || importMutation.isPending}
              onClick={() => {
                if (
                  !window.confirm(
                    "Remove this import from the database? Offer rows for this run will be deleted. This cannot be undone.",
                  )
                ) {
                  return;
                }
                deleteRunMutation.mutate(run.id);
              }}
            >
              {deleteRunMutation.isPending ? "Removing…" : "Remove import"}
            </Button>
          </div>
        ) : null}
        {deleteRunMutation.isError ? (
          <p className="text-sm text-red-600">
            {deleteRunMutation.error instanceof Error
              ? deleteRunMutation.error.message
              : "Remove failed"}
          </p>
        ) : null}
        {items.length > 0 && summaryWeek != null ? (
          <div
            id={weekLabelId}
            role="status"
            className="rounded-lg bg-primary/10 px-3 py-2.5 text-sm ring-1 ring-primary/25"
          >
            <span className="font-semibold text-foreground">ISO week {summaryWeek}</span>
            <span className="text-muted-foreground">
              {" "}
              — list below is tagged for this week ({items.length} offer
              {items.length === 1 ? "" : "s"})
            </span>
          </div>
        ) : null}
        {items.length > 0 ? (
          <>
            <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border/80 bg-muted/20 p-3">
              <div className="min-w-0 space-y-1">
                <h3 className="text-sm font-medium text-foreground">AI meal plan</h3>
                <p className="text-xs text-muted-foreground leading-snug">
                  Sends the current import&apos;s offers (by run id) to Gemini and returns 10 meal
                  ideas (promotions + your watchlist interests, ingredients for Sweden). Requires{" "}
                  <code className="rounded bg-muted px-1">GEMINI_API_KEY</code> on the server. Use
                  Preview sample week to see the layout before calling the API.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={
                    mealPlanMutation.isPending || importMutation.isPending || run == null
                  }
                  onClick={() => {
                    if (run) mealPlanMutation.mutate(run.id);
                  }}
                >
                  {mealPlanMutation.isPending ? "Planning…" : "Plan meals only"}
                </Button>
                <Button
                  type="button"
                  variant={showSampleMealPlan && !showLiveMealPlan ? "secondary" : "outline"}
                  className="w-full sm:w-auto"
                  disabled={importMutation.isPending}
                  onClick={() => setShowSampleMealPlan((v) => !v)}
                >
                  {showSampleMealPlan && !showLiveMealPlan ? "Hide sample week" : "Preview sample week"}
                </Button>
              </div>
            </div>
            {mealPlanMutation.isError ? (
              <p className="text-sm text-red-600">
                {mealPlanMutation.error instanceof Error
                  ? mealPlanMutation.error.message
                  : "Meal plan failed"}
              </p>
            ) : null}
            {mealPlanVisual ? (
              <div className="rounded-xl border border-border bg-muted/10 p-4 sm:p-5">
                <PromoMealPlanWeekView
                  plan={mealPlanVisual.plan}
                  meta={mealPlanVisual.meta}
                  sample={mealPlanVisual.sample}
                />
              </div>
            ) : !showSampleMealPlan ? (
              <p className="text-xs text-muted-foreground">
                No meal plan shown yet — generate from your offers or open a sample preview.
              </p>
            ) : null}
            <div
              className="overflow-x-auto"
              aria-describedby={summaryWeek != null ? weekLabelId : undefined}
            >
              <table className="w-full min-w-[44rem] border-collapse text-sm">
                <caption className="sr-only">
                  Matched weekly promotions
                  {summaryWeek != null ? ` for ISO week ${summaryWeek}` : ""}
                </caption>
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th scope="col" className="px-2 py-2 text-left font-medium">
                      Photo
                    </th>
                    <th scope="col" className="px-2 py-2 text-left font-medium">
                      Offer
                    </th>
                    <th scope="col" className="px-2 py-2 text-left font-medium">
                      Interest
                    </th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">
                      Score
                    </th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">
                      Recipes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="px-2 py-2 align-top">
                        {row.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- remote ICA assets
                          <img
                            src={row.image_url}
                            alt=""
                            width={56}
                            height={56}
                            className="size-14 rounded object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2 align-top">
                        <div className="font-medium leading-snug">{row.title}</div>
                        {row.card_text &&
                        row.card_text.trim() !== row.title.trim() ? (
                          <div className="mt-1 max-w-prose text-xs leading-snug text-muted-foreground">
                            {row.card_text}
                          </div>
                        ) : null}
                        {row.price_hint ? (
                          <div className="text-muted-foreground">{row.price_hint}</div>
                        ) : null}
                        <a
                          className="text-xs text-primary underline underline-offset-2"
                          href={row.source_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Offers page
                        </a>
                      </td>
                      <td className="px-2 py-2 align-top">{row.interest}</td>
                      <td className="px-2 py-2 align-top text-right tabular-nums">{row.score}</td>
                      <td className="px-2 py-2 align-top text-right">
                        {catalogQuery.isLoading ? (
                          <span className="text-xs text-muted-foreground">…</span>
                        ) : isInterestFoodCatalogItem(row.interest, catalogQuery.data) ? (
                          <Link
                            href={`/recipe-generator?pick=${encodeURIComponent(row.interest.trim())}`}
                            className="text-sm font-medium text-primary underline underline-offset-2"
                          >
                            Find recipes
                          </Link>
                        ) : (
                          <span
                            className="text-xs text-muted-foreground"
                            title="Only watchlist interests that match a food-aisle catalog chip get recipe search."
                          >
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
