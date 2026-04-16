import { foodDepartmentIdsFromCatalog } from "@/lib/recipe-picker-food-departments";
import type { PromoPickerCatalog } from "@/types/promo-picker-catalog";

/**
 * True when `interest` equals a catalog `watchlistText` and that row sits in a
 * recipe-relevant food department (same top-level aisles as the recipe ingredient picker).
 */
export function isInterestFoodCatalogItem(
  interest: string,
  catalog: PromoPickerCatalog | undefined,
): boolean {
  if (!catalog?.items?.length) {
    return false;
  }
  const trimmed = interest.trim();
  if (!trimmed) {
    return false;
  }
  const foodDeptIds = foodDepartmentIdsFromCatalog(catalog);
  for (const it of catalog.items) {
    if (it.watchlistText.trim() === trimmed && foodDeptIds.has(it.departmentId)) {
      return true;
    }
  }
  return false;
}
