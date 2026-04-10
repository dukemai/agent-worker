import type { PromoPickerCatalog, PromoPickerItem } from "@/types/promo-picker-catalog";

export type WatchlistDepartmentSummary = {
  departmentId: string;
  departmentName: string;
  count: number;
};

export type WatchlistSummaryByDepartment = {
  /** Top-level ICA departments (Handla “department” / root category) with at least one matched list item. */
  byDepartment: WatchlistDepartmentSummary[];
  /** Phrases that do not match any catalog `watchlistText` (e.g. custom text). */
  unmatchedCount: number;
};

/**
 * Maps watchlist strings to ICA catalog rows by exact `watchlistText` (trimmed), then groups
 * by each item’s `departmentId` and the top-level category name for that id.
 */
export function summarizeWatchlistByDepartment(
  watchlistItems: string[],
  catalog: PromoPickerCatalog | undefined,
): WatchlistSummaryByDepartment {
  if (!catalog?.items?.length) {
    return { byDepartment: [], unmatchedCount: watchlistItems.length };
  }

  const byWatchlistText = new Map<string, PromoPickerItem>();
  for (const it of catalog.items) {
    const key = it.watchlistText.trim();
    if (!byWatchlistText.has(key)) {
      byWatchlistText.set(key, it);
    }
  }

  const categoryById = new Map(catalog.categories.map((c) => [c.id, c]));
  const topLevelNameByDeptId = new Map<string, string>();
  for (const c of catalog.categories) {
    if (c.parentId === null) {
      topLevelNameByDeptId.set(c.id, c.name);
    }
  }

  function departmentLabel(departmentId: string): string {
    const top = topLevelNameByDeptId.get(departmentId);
    if (top) {
      return top;
    }
    return categoryById.get(departmentId)?.name ?? "Unknown department";
  }

  const counts = new Map<string, number>();
  let unmatched = 0;

  for (const raw of watchlistItems) {
    const text = raw.trim();
    const item = byWatchlistText.get(text);
    if (!item) {
      unmatched += 1;
      continue;
    }
    const deptId = item.departmentId;
    counts.set(deptId, (counts.get(deptId) ?? 0) + 1);
  }

  const byDepartment = [...counts.entries()]
    .map(([departmentId, count]) => ({
      departmentId,
      departmentName: departmentLabel(departmentId),
      count,
    }))
    .sort((a, b) => a.departmentName.localeCompare(b.departmentName, "sv"));

  return { byDepartment, unmatchedCount: unmatched };
}
