"use client";

import { Check } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MAX_PROMO_WATCHLIST_ITEMS } from "@/lib/promo-watchlist";
import type { PromoPickerCatalog, PromoPickerItem } from "@/types/promo-picker-catalog";

const ALL_DEPARTMENTS = "__all__";

export type PromoWatchlistAddItemsProps = {
  catalog: PromoPickerCatalog | undefined;
  catalogLoading: boolean;
  watchlistItems: string[];
  busy: boolean;
  /** Persists the full next watchlist (same contract as the dashboard `persist`). */
  onPersist: (next: string[]) => Promise<void>;
  onError: (message: string | null) => void;
  /** Aggregated error line (same as dashboard) */
  errorMessage: string | null;
};

export function PromoWatchlistAddItems({
  catalog,
  catalogLoading,
  watchlistItems,
  busy,
  onPersist,
  onError,
  errorMessage,
}: PromoWatchlistAddItemsProps) {
  const [departmentId, setDepartmentId] = useState<string>(ALL_DEPARTMENTS);
  const [search, setSearch] = useState("");
  const [customText, setCustomText] = useState("");

  const departments = useMemo(() => {
    const cats = catalog?.categories ?? [];
    return cats
      .filter((c) => c.parentId === null)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "sv"));
  }, [catalog?.categories]);

  const filteredPickerItems = useMemo(() => {
    const items = catalog?.items ?? [];
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (departmentId !== ALL_DEPARTMENTS && it.departmentId !== departmentId) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        it.name.toLowerCase().includes(q) || it.watchlistText.toLowerCase().includes(q)
      );
    });
  }, [catalog?.items, departmentId, search]);

  const itemCountByDepartmentId = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of catalog?.items ?? []) {
      m.set(it.departmentId, (m.get(it.departmentId) ?? 0) + 1);
    }
    return m;
  }, [catalog?.items]);

  const catalogListStats = useMemo(() => {
    const onWatchlist = new Set(watchlistItems);
    let alreadyOnList = 0;
    for (const it of filteredPickerItems) {
      if (onWatchlist.has(it.watchlistText.trim())) {
        alreadyOnList += 1;
      }
    }
    const total = filteredPickerItems.length;
    return {
      total,
      alreadyOnList,
      availableToAdd: total - alreadyOnList,
    };
  }, [filteredPickerItems, watchlistItems]);

  async function addFromCatalog(entry: PromoPickerItem) {
    if (watchlistItems.length >= MAX_PROMO_WATCHLIST_ITEMS) {
      onError(`List is full (max ${MAX_PROMO_WATCHLIST_ITEMS} items).`);
      return;
    }
    const text = entry.watchlistText.trim();
    if (!text || watchlistItems.includes(text)) {
      return;
    }
    onError(null);
    await onPersist([...watchlistItems, text]);
  }

  async function addCustom(event: FormEvent) {
    event.preventDefault();
    const text = customText.trim();
    if (!text) {
      return;
    }
    if (watchlistItems.length >= MAX_PROMO_WATCHLIST_ITEMS) {
      onError(`List is full (max ${MAX_PROMO_WATCHLIST_ITEMS} items).`);
      return;
    }
    if (watchlistItems.includes(text)) {
      setCustomText("");
      return;
    }
    setCustomText("");
    onError(null);
    await onPersist([...watchlistItems, text]);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add items</CardTitle>
        <CardDescription>
          Pick from the ICA Maxi category catalog or add your own phrase. Max{" "}
          {MAX_PROMO_WATCHLIST_ITEMS} items.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {catalogLoading ? (
          <p className="text-sm text-muted-foreground">Loading catalog…</p>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground" id="dept-label">
              Department filter
            </span>
            <Select
              value={departmentId}
              onValueChange={setDepartmentId}
              disabled={!catalog}
            >
              <SelectTrigger
                className="h-9 w-full min-w-[12rem] sm:w-64"
                aria-labelledby="dept-label"
              >
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_DEPARTMENTS}>
                  All departments
                  {catalog?.items?.length != null ? (
                    <span className="text-muted-foreground"> ({catalog.items.length})</span>
                  ) : null}
                </SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                    <span className="text-muted-foreground">
                      {" "}
                      ({itemCountByDepartmentId.get(d.id) ?? 0})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground" id="search-label">
              Search catalog
            </span>
            <Input
              aria-labelledby="search-label"
              placeholder="Filter by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={!catalog}
            />
          </div>
        </div>
        {catalog && !catalogLoading ? (
          <p className="text-xs text-muted-foreground" aria-live="polite">
            <span className="tabular-nums font-medium text-foreground">{catalogListStats.total}</span>{" "}
            {catalogListStats.total === 1 ? "item" : "items"} in this view
            {catalogListStats.total > 0 ? (
              <>
                {" "}
                ·{" "}
                <span className="tabular-nums font-medium text-emerald-700 dark:text-emerald-400">
                  {catalogListStats.availableToAdd}
                </span>{" "}
                available to add
                {catalogListStats.alreadyOnList > 0 ? (
                  <>
                    {" "}
                    ·{" "}
                    <span className="tabular-nums text-foreground/80">
                      {catalogListStats.alreadyOnList}
                    </span>{" "}
                    already on your list
                  </>
                ) : null}
              </>
            ) : null}
          </p>
        ) : null}
        <div className="max-h-64 overflow-y-auto rounded-md border p-2">
          {filteredPickerItems.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              No catalog matches. Try another department or search.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2" role="list">
              {filteredPickerItems.map((it) => {
                const alreadyOnList = watchlistItems.includes(it.watchlistText.trim());
                return (
                  <li key={it.id}>
                    <Button
                      type="button"
                      variant={alreadyOnList ? "outline" : "secondary"}
                      size="sm"
                      className={
                        alreadyOnList
                          ? "h-auto min-h-9 max-w-full cursor-not-allowed whitespace-normal text-left text-muted-foreground"
                          : "h-auto min-h-9 max-w-full whitespace-normal text-left"
                      }
                      disabled={busy || alreadyOnList}
                      title={
                        alreadyOnList
                          ? "Already on your watchlist — remove it in the list below if you want to re-add from here"
                          : undefined
                      }
                      aria-label={
                        alreadyOnList
                          ? `${it.watchlistText} (already on watchlist)`
                          : `Add ${it.watchlistText} to watchlist`
                      }
                      onClick={() => void addFromCatalog(it)}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <span>{it.watchlistText}</span>
                        {alreadyOnList ? (
                          <Check
                            className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                            aria-hidden
                            strokeWidth={2.5}
                          />
                        ) : null}
                      </span>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={addCustom}>
          <div className="min-w-0 flex-1 space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground" id="custom-label">
              Your own text
            </span>
            <Input
              aria-labelledby="custom-label"
              placeholder='e.g. "Arla smör 500g"'
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              disabled={busy}
            />
          </div>
          <Button type="submit" disabled={busy} className="min-h-11 shrink-0">
            Add my own text
          </Button>
        </form>
        {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
        <p className="text-xs text-muted-foreground">
          {watchlistItems.length} / {MAX_PROMO_WATCHLIST_ITEMS} items
        </p>
      </CardContent>
    </Card>
  );
}
