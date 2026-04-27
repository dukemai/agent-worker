"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchWeeklyPromotionMatches,
  fetchWeeklyPromotions,
  filterWeeklyPromotions,
  importWeeklyPromotions,
} from "./promo-weekly-promotions-api";

type ViewMode = "matches" | "all";

function formatImportedAt(value: string): string {
  return new Date(value).toLocaleString("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function OfferImage({ src }: { src: string | null }) {
  if (!src) {
    return <span className="text-muted-foreground">-</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote retailer assets
    <img
      src={src}
      alt=""
      width={56}
      height={56}
      className="size-14 rounded object-cover"
      loading="lazy"
    />
  );
}

export function PromoWeeklyPromotionsSection() {
  const [viewMode, setViewMode] = useState<ViewMode>("matches");
  const queryClient = useQueryClient();

  const promotionsQuery = useQuery({
    queryKey: ["weekly-promotions-current"],
    queryFn: fetchWeeklyPromotions,
  });

  const matchesQuery = useQuery({
    queryKey: ["weekly-promotions-matches"],
    queryFn: fetchWeeklyPromotionMatches,
  });

  const importMutation = useMutation({
    mutationFn: importWeeklyPromotions,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["weekly-promotions-current"] }),
        queryClient.invalidateQueries({ queryKey: ["weekly-promotions-matches"] }),
      ]);
      setViewMode("all");
    },
  });

  const filterMutation = useMutation({
    mutationFn: filterWeeklyPromotions,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["weekly-promotions-matches"] });
      setViewMode("matches");
    },
  });

  const run = promotionsQuery.data?.run ?? null;
  const promotions = useMemo(
    () => promotionsQuery.data?.items ?? [],
    [promotionsQuery.data?.items],
  );
  const matches = matchesQuery.data?.matches ?? [];
  const categories = useMemo(
    () =>
      [
        ...new Set(
          promotions
            .map((promotion) => promotion.category_name ?? promotion.category_key)
            .filter((value): value is string => typeof value === "string" && value.length > 0),
        ),
      ].sort((a, b) => a.localeCompare(b, "sv")),
    [promotions],
  );

  const importError =
    importMutation.error instanceof Error ? importMutation.error.message : null;
  const filterError =
    filterMutation.error instanceof Error ? filterMutation.error.message : null;
  const loadError =
    promotionsQuery.error instanceof Error
      ? promotionsQuery.error.message
      : matchesQuery.error instanceof Error
        ? matchesQuery.error.message
        : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <CardTitle>This week&apos;s promotions</CardTitle>
          {run ? (
            <Badge variant="secondary" className="text-sm font-semibold">
              ISO week {run.week_number}
            </Badge>
          ) : null}
        </div>
        <CardDescription>
          Upload the full weekly promotions export, then run filtering against your watchlist. The
          matched list is now computed in the dashboard, and the full offer set stays available for
          browsing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <input
            type="file"
            accept="application/json,.json"
            className="text-sm file:me-3 file:rounded-md file:border file:bg-muted file:px-3 file:py-2"
            disabled={importMutation.isPending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) {
                importMutation.mutate(file);
              }
            }}
          />
          {run ? (
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={filterMutation.isPending || importMutation.isPending}
              onClick={() => filterMutation.mutate(run.id)}
            >
              {filterMutation.isPending ? "Filtering..." : "Run filtering"}
            </Button>
          ) : null}
        </div>

        {importMutation.isPending ? (
          <p className="text-sm text-muted-foreground">Importing weekly promotions...</p>
        ) : null}
        {importMutation.isSuccess ? (
          <p className="text-sm text-green-700">
            Imported {importMutation.data.itemCount} offers for ISO week{" "}
            {importMutation.data.weekNumber}.
          </p>
        ) : null}
        {filterMutation.isSuccess ? (
          <p className="text-sm text-green-700">
            Matched {filterMutation.data.matchCount} offers from{" "}
            {filterMutation.data.promotionCount} promotions against{" "}
            {filterMutation.data.watchlistCount} watchlist items.
          </p>
        ) : null}
        {importError || filterError || loadError ? (
          <p className="text-sm text-red-600">{importError ?? filterError ?? loadError}</p>
        ) : null}

        {promotionsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading weekly promotions...</p>
        ) : null}
        {!promotionsQuery.isLoading && !run ? (
          <p className="text-sm text-muted-foreground">
            No weekly import yet. Upload{" "}
            <code className="rounded bg-muted px-1 text-xs">scraped-promotions.json</code> from the
            promo run output.
          </p>
        ) : null}

        {run ? (
          <div className="rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Latest import:{" "}
            <span className="font-medium text-foreground">{formatImportedAt(run.created_at)}</span>{" "}
            · {run.store_key} · {run.imported_count} offer
            {run.imported_count === 1 ? "" : "s"}
            {categories.length > 0 ? ` · ${categories.length} categories` : ""}
          </div>
        ) : null}

        {run ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex rounded-md border bg-background p-1">
              <Button
                type="button"
                size="sm"
                variant={viewMode === "matches" ? "secondary" : "ghost"}
                onClick={() => setViewMode("matches")}
              >
                Matched offers ({matches.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewMode === "all" ? "secondary" : "ghost"}
                onClick={() => setViewMode("all")}
              >
                All promotions ({promotions.length})
              </Button>
            </div>
          </div>
        ) : null}

        {run && viewMode === "matches" ? (
          matches.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[48rem] border-collapse text-sm">
                <caption className="sr-only">Matched weekly promotions</caption>
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
                  {matches.map((match) => {
                    const promotion = match.promotion;
                    return (
                      <tr key={match.id} className="border-b last:border-0">
                        <td className="px-2 py-2 align-top">
                          <OfferImage src={promotion?.image_url ?? null} />
                        </td>
                        <td className="px-2 py-2 align-top">
                          <div className="font-medium leading-snug">{promotion?.title}</div>
                          {promotion?.card_text && promotion.card_text !== promotion.title ? (
                            <div className="mt-1 max-w-prose text-xs leading-snug text-muted-foreground">
                              {promotion.card_text}
                            </div>
                          ) : null}
                          {promotion?.price_hint ? (
                            <div className="text-muted-foreground">{promotion.price_hint}</div>
                          ) : null}
                          {promotion?.source_url ? (
                            <a
                              className="text-xs text-primary underline underline-offset-2"
                              href={promotion.source_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Offers page
                            </a>
                          ) : null}
                        </td>
                        <td className="px-2 py-2 align-top">{match.interest}</td>
                        <td className="px-2 py-2 align-top text-right tabular-nums">
                          {match.score}
                        </td>
                        <td className="px-2 py-2 align-top text-right">
                          <Link
                            href={`/recipe-generator?pick=${encodeURIComponent(match.interest)}`}
                            className="text-sm font-medium text-primary underline underline-offset-2"
                          >
                            Find recipes
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No matched offers yet. Run filtering after importing this week&apos;s promotions.
            </p>
          )
        ) : null}

        {run && viewMode === "all" ? (
          promotions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] border-collapse text-sm">
                <caption className="sr-only">All weekly promotions</caption>
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th scope="col" className="px-2 py-2 text-left font-medium">
                      Photo
                    </th>
                    <th scope="col" className="px-2 py-2 text-left font-medium">
                      Offer
                    </th>
                    <th scope="col" className="px-2 py-2 text-left font-medium">
                      Category
                    </th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">
                      #
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.map((promotion) => (
                    <tr key={promotion.id} className="border-b last:border-0">
                      <td className="px-2 py-2 align-top">
                        <OfferImage src={promotion.image_url} />
                      </td>
                      <td className="px-2 py-2 align-top">
                        <div className="font-medium leading-snug">{promotion.title}</div>
                        {promotion.card_text && promotion.card_text !== promotion.title ? (
                          <div className="mt-1 max-w-prose text-xs leading-snug text-muted-foreground">
                            {promotion.card_text}
                          </div>
                        ) : null}
                        {promotion.price_hint ? (
                          <div className="text-muted-foreground">{promotion.price_hint}</div>
                        ) : null}
                        <a
                          className="text-xs text-primary underline underline-offset-2"
                          href={promotion.source_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Offers page
                        </a>
                      </td>
                      <td className="px-2 py-2 align-top text-muted-foreground">
                        {promotion.category_name ?? promotion.category_key ?? "-"}
                      </td>
                      <td className="px-2 py-2 align-top text-right tabular-nums">
                        {promotion.sort_order + 1}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This import did not contain any promotion rows.
            </p>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
