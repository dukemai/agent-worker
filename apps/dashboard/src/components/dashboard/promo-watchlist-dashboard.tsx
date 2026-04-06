"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  MAX_PROMO_WATCHLIST_ITEMS,
  PROMO_WATCHLIST_KEY,
  parsePromoWatchlistValue,
  serializePromoWatchlist,
} from "@/lib/promo-watchlist";
import type { PromoPickerCatalog, PromoPickerItem } from "@/types/promo-picker-catalog";
import { PromoWeeklyMatchesSection } from "@/components/dashboard/promo-weekly-matches-section";

async function fetchPromoWatchlist(): Promise<string[]> {
  const response = await fetch(
    `/api/context/${encodeURIComponent(PROMO_WATCHLIST_KEY)}`,
    { cache: "no-store" },
  );
  if (response.status === 404) {
    return [];
  }
  if (!response.ok) {
    const json = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(json.error ?? "Failed to load watchlist");
  }
  const row = (await response.json()) as { value: string };
  return parsePromoWatchlistValue(row.value);
}

async function fetchPickerCatalog(): Promise<PromoPickerCatalog> {
  const response = await fetch("/data/ica-maxi-promo-picker-catalog.json", {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load picker catalog");
  }
  return response.json() as Promise<PromoPickerCatalog>;
}

async function throwApiError(response: Response, fallback: string): Promise<never> {
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(json.error ?? fallback);
}

const ALL_DEPARTMENTS = "__all__";

export function PromoWatchlistDashboard() {
  const [departmentId, setDepartmentId] = useState<string>(ALL_DEPARTMENTS);
  const [search, setSearch] = useState("");
  const [customText, setCustomText] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const catalogQuery = useQuery({
    queryKey: ["promo-picker-catalog"],
    queryFn: fetchPickerCatalog,
  });

  const watchlistQuery = useQuery({
    queryKey: ["context", PROMO_WATCHLIST_KEY],
    queryFn: fetchPromoWatchlist,
  });

  const saveMutation = useMutation({
    mutationFn: async (items: string[]) => {
      const response = await fetch(
        `/api/context/${encodeURIComponent(PROMO_WATCHLIST_KEY)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: serializePromoWatchlist(items) }),
        },
      );
      if (!response.ok) {
        await throwApiError(response, "Failed to save watchlist");
      }
      return response.json();
    },
    onSuccess: async () => {
      setLocalError(null);
      await queryClient.invalidateQueries({ queryKey: ["context", PROMO_WATCHLIST_KEY] });
      await queryClient.invalidateQueries({ queryKey: ["context"] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/context/${encodeURIComponent(PROMO_WATCHLIST_KEY)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        await throwApiError(response, "Failed to clear watchlist");
      }
      return response.json();
    },
    onSuccess: async () => {
      setLocalError(null);
      await queryClient.invalidateQueries({ queryKey: ["context", PROMO_WATCHLIST_KEY] });
      await queryClient.invalidateQueries({ queryKey: ["context"] });
    },
  });

  const departments = useMemo(() => {
    const cats = catalogQuery.data?.categories ?? [];
    return cats
      .filter((c) => c.parentId === null)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "sv"));
  }, [catalogQuery.data?.categories]);

  const filteredPickerItems = useMemo(() => {
    const items = catalogQuery.data?.items ?? [];
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (departmentId !== ALL_DEPARTMENTS && it.departmentId !== departmentId) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        it.name.toLowerCase().includes(q) ||
        it.watchlistText.toLowerCase().includes(q)
      );
    });
  }, [catalogQuery.data?.items, departmentId, search]);

  const items = watchlistQuery.data ?? [];
  const busy =
    saveMutation.isPending ||
    clearMutation.isPending ||
    watchlistQuery.isFetching;

  async function persist(next: string[]) {
    setLocalError(null);
    try {
      await saveMutation.mutateAsync(next);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function addFromCatalog(entry: PromoPickerItem) {
    if (items.length >= MAX_PROMO_WATCHLIST_ITEMS) {
      setLocalError(`List is full (max ${MAX_PROMO_WATCHLIST_ITEMS} items).`);
      return;
    }
    const text = entry.watchlistText.trim();
    if (!text || items.includes(text)) {
      return;
    }
    await persist([...items, text]);
  }

  async function addCustom(event: FormEvent) {
    event.preventDefault();
    const text = customText.trim();
    if (!text) {
      return;
    }
    if (items.length >= MAX_PROMO_WATCHLIST_ITEMS) {
      setLocalError(`List is full (max ${MAX_PROMO_WATCHLIST_ITEMS} items).`);
      return;
    }
    if (items.includes(text)) {
      setCustomText("");
      return;
    }
    setCustomText("");
    await persist([...items, text]);
  }

  async function removeAt(index: number) {
    const next = items.filter((_, i) => i !== index);
    await persist(next);
  }

  async function clearAll() {
    if (
      !window.confirm(
        "Remove every item from your promo grocery watchlist? This cannot be undone from here.",
      )
    ) {
      return;
    }
    setLocalError(null);
    try {
      await clearMutation.mutateAsync();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Clear failed");
    }
  }

  const mutationError =
    saveMutation.error instanceof Error ? saveMutation.error.message : null;
  const clearError =
    clearMutation.error instanceof Error ? clearMutation.error.message : null;
  const catalogError =
    catalogQuery.error instanceof Error ? catalogQuery.error.message : null;
  const listError =
    watchlistQuery.error instanceof Error ? watchlistQuery.error.message : null;
  const error = localError ?? mutationError ?? clearError ?? catalogError ?? listError;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Promo grocery watchlist</CardTitle>
          <CardDescription>
            Items you want to watch for on weekly offers. Stored as{" "}
            <code className="rounded bg-muted px-1 text-xs">{PROMO_WATCHLIST_KEY}</code> in
            family context. Example store (ICA Maxi):{" "}
            <a
              className="text-primary underline underline-offset-4"
              href="https://www.ica.se/erbjudanden/maxi-ica-stormarknad-barkarbystaden-1003408/"
              target="_blank"
              rel="noreferrer"
            >
              Barkarbystaden erbjudanden
            </a>
            . Scraper sync:{" "}
            <code className="rounded bg-muted px-1 text-xs">pnpm promo:download-watchlist</code>.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add items</CardTitle>
          <CardDescription>
            Pick from the ICA Maxi category catalog or add your own phrase. Max{" "}
            {MAX_PROMO_WATCHLIST_ITEMS} items.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {catalogQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading catalog…</p>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground" id="dept-label">
                Department filter
              </span>
              <Select
                value={departmentId}
                onValueChange={setDepartmentId}
                disabled={!catalogQuery.data}
              >
                <SelectTrigger className="w-full min-w-[12rem] sm:w-64" aria-labelledby="dept-label">
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_DEPARTMENTS}>All departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
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
                disabled={!catalogQuery.data}
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-md border p-2">
            {filteredPickerItems.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                No catalog matches. Try another department or search.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2" role="list">
                {filteredPickerItems.map((it) => (
                  <li key={it.id}>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-auto min-h-9 max-w-full whitespace-normal text-left"
                      disabled={busy || items.includes(it.watchlistText.trim())}
                      onClick={() => void addFromCatalog(it)}
                    >
                      {it.watchlistText}
                    </Button>
                  </li>
                ))}
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
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <p className="text-xs text-muted-foreground">
            {items.length} / {MAX_PROMO_WATCHLIST_ITEMS} items
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Current list</CardTitle>
            <CardDescription>
              These strings are what scrapers match against promotions (rough text match later).
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full shrink-0 sm:w-auto"
            disabled={busy || items.length === 0}
            onClick={() => void clearAll()}
          >
            Clear entire list
          </Button>
        </CardHeader>
        <CardContent>
          {watchlistQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading watchlist…</p>
          ) : null}
          {!watchlistQuery.isLoading && items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items yet. Add from the catalog above.</p>
          ) : null}
          {items.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[20rem] border-collapse text-sm">
                <caption className="sr-only">Promo grocery watchlist items</caption>
                <thead>
                  <tr className="border-b bg-muted/50">
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
                <tbody>
                  {items.map((label, index) => (
                    <tr key={`${label}-${index}`} className="border-b last:border-0">
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">
                        {index + 1}
                      </td>
                      <td className="px-3 py-2">{label}</td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto min-h-11 py-2"
                          disabled={busy}
                          aria-label={`Remove ${label}`}
                          onClick={() => void removeAt(index)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <PromoWeeklyMatchesSection />
    </main>
  );
}
