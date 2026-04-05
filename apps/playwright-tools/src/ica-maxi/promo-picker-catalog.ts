import { readFileSync } from "node:fs";
import * as path from "node:path";
import { scoreInterestAgainstHaystack } from "../match-promotions";

export type IcaPromoPickerCategory = {
  id: string;
  name: string;
  fullURLPath: string;
  parentId: string | null;
  departmentId: string;
};

export type IcaPromoPickerItem = {
  id: string;
  name: string;
  watchlistText: string;
  fullURLPath: string;
  parentCategoryId: string;
  departmentId: string;
  retailerCategoryId?: string;
  productCount?: number;
};

export type IcaPromoPickerCatalog = {
  schemaVersion: number;
  retailer: string;
  categories: IcaPromoPickerCategory[];
  items: IcaPromoPickerItem[];
};

/** Repo-root `docs/requirements/ica-maxi-promo-picker-catalog.json` relative to this file (`src/ica-maxi`). */
export function icaMaxiPromoPickerCatalogPath(): string {
  return path.join(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "docs",
    "requirements",
    "ica-maxi-promo-picker-catalog.json",
  );
}

let cached: IcaPromoPickerCatalog | null = null;

export function loadIcaMaxiPromoPickerCatalog(): IcaPromoPickerCatalog {
  if (cached) {
    return cached;
  }
  const raw = readFileSync(icaMaxiPromoPickerCatalogPath(), "utf8");
  cached = JSON.parse(raw) as IcaPromoPickerCatalog;
  return cached;
}

const MIN_SCORE = 50;

/**
 * Map free-text watchlist strings to ICA **department** names (top-level Handla departments from the picker catalog)
 * using the same scoring rules as promotion matching (`watchlistText` + item `name` as haystack).
 */
export function resolveIcaMaxiDepartmentsForInterests(
  interests: string[],
  catalog: IcaPromoPickerCatalog,
): string[] {
  const categoryById = new Map(catalog.categories.map((c) => [c.id, c]));
  const departmentNames = new Set<string>();

  const cleaned = [
    ...new Set(
      interests.map((s) => s.trim()).filter((s) => s.length >= 2),
    ),
  ];

  for (const interest of cleaned) {
    for (const item of catalog.items) {
      const hay = `${item.watchlistText}\n${item.name}`;
      if (scoreInterestAgainstHaystack(interest, hay) < MIN_SCORE) {
        continue;
      }
      const dept = categoryById.get(item.departmentId);
      if (dept?.name) {
        departmentNames.add(dept.name);
      }
    }
  }

  return [...departmentNames].sort((a, b) => a.localeCompare(b, "sv"));
}

/**
 * Weekly-offers filter chips on ica.se include aisles that are **not** represented as Handla
 * top-level `categories[].name` in `ica-maxi-promo-picker-catalog.json`. They are still scraped
 * whenever we run department-scoped extraction (chips not on this week’s page are skipped).
 */
export const ICA_MAXI_WEEKLY_OFFERS_EXTRA_DEPARTMENTS: readonly string[] = [
  "Färskvaror",
  "Djupfryst",
];

/** Union catalog-resolved departments with promotion-page-only filter names; sorted, deduped. */
export function mergeIcaMaxiWeeklyOffersDepartments(fromCatalog: string[]): string[] {
  return [
    ...new Set([...fromCatalog, ...ICA_MAXI_WEEKLY_OFFERS_EXTRA_DEPARTMENTS]),
  ].sort((a, b) => a.localeCompare(b, "sv"));
}
