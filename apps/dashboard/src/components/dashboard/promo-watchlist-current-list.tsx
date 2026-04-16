"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  groupWatchlistByDepartment,
  summarizeWatchlistByDepartment,
} from "@/lib/promo-watchlist-department-summary";
import type { PromoPickerCatalog } from "@/types/promo-picker-catalog";

export type PromoWatchlistCurrentListProps = {
  items: string[];
  isLoading: boolean;
  busy: boolean;
  onRemoveAt: (index: number) => void;
  onClearAll: () => void;
  /** Used to map list strings back to ICA top-level departments (same catalog as Add items). */
  catalog: PromoPickerCatalog | undefined;
  catalogLoading: boolean;
};

export function PromoWatchlistCurrentList({
  items,
  isLoading,
  busy,
  onRemoveAt,
  onClearAll,
  catalog,
  catalogLoading,
}: PromoWatchlistCurrentListProps) {
  const [listLayout, setListLayout] = useState<"flat" | "byDepartment">("byDepartment");

  const departmentSummary = useMemo(
    () => summarizeWatchlistByDepartment(items, catalog),
    [items, catalog],
  );

  const departmentGroups = useMemo(
    () => groupWatchlistByDepartment(items, catalog),
    [items, catalog],
  );

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Current list</CardTitle>
            <CardDescription>
              These strings are what scrapers match against promotions (rough text match later).
              Use <strong>Grouped by department</strong> to browse by ICA food department — the same
              grouping that powers recipe ingredient search.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="destructive"
            className="min-h-11 w-full shrink-0 sm:w-auto"
            disabled={busy || items.length === 0}
            onClick={() => void onClearAll()}
          >
            Clear entire list
          </Button>
        </div>
        {items.length > 0 ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground" id="watchlist-layout-label">
                List layout
              </span>
              <Select
                value={listLayout}
                onValueChange={(v) => setListLayout(v as "flat" | "byDepartment")}
                disabled={busy}
              >
                <SelectTrigger
                  id="watchlist-layout"
                  className="h-9 w-full min-w-[12rem] sm:w-56"
                  aria-labelledby="watchlist-layout-label"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat list</SelectItem>
                  <SelectItem value="byDepartment">Grouped by department</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {listLayout === "byDepartment" && !catalogLoading && !catalog ? (
              <p className="text-xs text-amber-800 dark:text-amber-200/90">
                Catalog not loaded — showing a single group until the map is available.
              </p>
            ) : null}
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading watchlist…</p>
        ) : null}
        {!isLoading && items.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">
            No items yet. Add from the catalog above.
          </p>
        ) : null}
        {items.length > 0 && catalogLoading ? (
          <p className="mb-4 text-sm text-muted-foreground">Loading department map…</p>
        ) : null}
        {items.length > 0 && !catalogLoading && catalog ? (
          <div className="mb-4 rounded-lg border border-emerald-200/60 bg-emerald-50/40 px-3 py-3 dark:border-emerald-900/45 dark:bg-emerald-950/25">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              By department
            </p>
            {departmentSummary.byDepartment.length > 0 ? (
              <ul className="flex flex-wrap gap-2" role="list">
                {departmentSummary.byDepartment.map((d) => (
                  <li
                    key={d.departmentId}
                    className="rounded-md border border-emerald-200/80 bg-background px-2.5 py-1.5 text-sm shadow-sm dark:border-emerald-800/50 dark:bg-card"
                  >
                    <span className="font-medium text-foreground">{d.departmentName}</span>
                    <span className="ml-1.5 tabular-nums text-muted-foreground">({d.count})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {departmentSummary.unmatchedCount === items.length
                  ? "None of these phrases match the ICA catalog — pick from the catalog above to see department breakdown."
                  : "No department groups to show."}
              </p>
            )}
            {departmentSummary.unmatchedCount > 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                <span className="tabular-nums font-medium text-foreground">
                  {departmentSummary.unmatchedCount}
                </span>{" "}
                {departmentSummary.unmatchedCount === 1 ? "item" : "items"} not found in the catalog
                (custom text). Those are omitted from the department counts above.
              </p>
            ) : null}
          </div>
        ) : null}
        {items.length > 0 && !catalogLoading && !catalog ? (
          <p className="mb-4 text-sm text-amber-800 dark:text-amber-200/90">
            Catalog unavailable — department summary is hidden. The list below still works for
            scraping.
          </p>
        ) : null}
        {items.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-emerald-200/80 bg-emerald-50/70 shadow-sm dark:border-emerald-900/45 dark:bg-emerald-950/30">
            <table className="w-full min-w-[20rem] border-collapse text-sm">
              <caption className="sr-only">Promo grocery watchlist items</caption>
              <thead>
                <tr className="border-b border-emerald-200/60 bg-emerald-100/50 dark:border-emerald-900/50 dark:bg-emerald-950/40">
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    #
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    Item
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              {listLayout === "flat" ? (
                <tbody>
                  {items.map((label, index) => (
                    <tr
                      key={`${label}-${index}`}
                      className="border-b border-emerald-200/40 last:border-0 dark:border-emerald-900/35"
                    >
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">{index + 1}</td>
                      <td className="px-3 py-2 text-foreground">{label}</td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto min-h-11 py-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={busy}
                          aria-label={`Remove ${label}`}
                          onClick={() => void onRemoveAt(index)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              ) : (
                departmentGroups.map((group) => (
                  <tbody key={group.departmentId}>
                    <tr className="border-b border-emerald-300/60 bg-emerald-200/35 dark:border-emerald-800/50 dark:bg-emerald-950/50">
                      <th
                        scope="colgroup"
                        colSpan={3}
                        className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-emerald-950 dark:text-emerald-100/95"
                      >
                        {group.departmentName}
                        <span className="ml-2 font-normal normal-case tabular-nums text-emerald-800/90 dark:text-emerald-200/80">
                          ({group.entries.length})
                        </span>
                      </th>
                    </tr>
                    {group.entries.map(({ label, index }) => (
                      <tr
                        key={`${label}-${index}`}
                        className="border-b border-emerald-200/40 dark:border-emerald-900/35"
                      >
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">{index + 1}</td>
                        <td className="px-3 py-2 text-foreground">{label}</td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto min-h-11 py-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={busy}
                            aria-label={`Remove ${label}`}
                            onClick={() => void onRemoveAt(index)}
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                ))
              )}
            </table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
