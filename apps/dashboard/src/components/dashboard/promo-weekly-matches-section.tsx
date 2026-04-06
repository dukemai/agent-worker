"use client";

import { getISOWeekNumber } from "@agent/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PromoMatchItemRow, PromoMatchRunRow } from "@/app/api/promo-matches/latest/route";

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

export function PromoWeeklyMatchesSection() {
  const queryClient = useQueryClient();
  const latestQuery = useQuery({
    queryKey: ["promo-matches-latest"],
    queryFn: fetchLatest,
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
      await queryClient.invalidateQueries({ queryKey: ["promo-matches-latest"] });
    },
  });

  const run = latestQuery.data?.run ?? null;
  const items = latestQuery.data?.items ?? [];
  const summaryWeek =
    items.length > 0
      ? items[0].week_number
      : run
        ? getISOWeekNumber(new Date(run.created_at))
        : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>This week&apos;s matched promotions</CardTitle>
        <CardDescription>
          Upload <code className="rounded bg-muted px-1 text-xs">watchlist-matches-only.json</code>{" "}
          from{" "}
          <code className="rounded bg-muted px-1 text-xs">
            apps/playwright-tools/data/promo-run/
          </code>{" "}
          after running the ICA extract test. Data is stored for this dashboard; a later step can
          suggest meals from these offers.
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
          <p className="text-xs text-muted-foreground">
            Latest import:{" "}
            {new Date(run.created_at).toLocaleString("sv-SE", {
              dateStyle: "medium",
              timeStyle: "short",
            })}{" "}
            · ISO week {summaryWeek} · {run.store_key} ·{" "}
            {(run.interests as string[])?.length ?? 0} watchlist interests
          </p>
        ) : null}
        {items.length > 0 ? (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
