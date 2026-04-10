import type { PromoPickerCatalog } from "@/types/promo-picker-catalog";

/**
 * ICA Maxi Handla **top-level** department names that are food-related for recipe
 * ingredient picking (excludes apotek, hem, kläder, städ, etc.).
 * Keep strings in sync with `public/data/ica-maxi-promo-picker-catalog.json` root categories.
 */
export const RECIPE_FOOD_TOP_LEVEL_DEPARTMENT_NAMES = new Set([
  "Bröd & Kakor",
  "Dryck",
  "Fisk & Skaldjur",
  "Frukt & Grönt",
  "Fryst",
  "Färdigmat",
  "Glass, Godis & Snacks",
  "Grill",
  "Kött, Chark & Fågel",
  "Mejeri & Ost",
  "Skafferi",
  "Vegetariskt",
]);

/** `departmentId` values for food top-level rows in the catalog (derived from names). */
export function foodDepartmentIdsFromCatalog(catalog: PromoPickerCatalog): Set<string> {
  const ids = new Set<string>();
  for (const c of catalog.categories) {
    if (c.parentId !== null) {
      continue;
    }
    if (RECIPE_FOOD_TOP_LEVEL_DEPARTMENT_NAMES.has(c.name)) {
      ids.add(c.departmentId);
    }
  }
  return ids;
}
