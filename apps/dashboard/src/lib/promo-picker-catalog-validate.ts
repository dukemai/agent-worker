import type { PromoPickerCatalog, PromoPickerCategory, PromoPickerItem } from "@/types/promo-picker-catalog";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isCategory(v: unknown): v is PromoPickerCategory {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    isNonEmptyString(o.id) &&
    isNonEmptyString(o.name) &&
    typeof o.fullURLPath === "string" &&
    (o.parentId === null || isNonEmptyString(o.parentId)) &&
    isNonEmptyString(o.departmentId)
  );
}

function isItem(v: unknown): v is PromoPickerItem {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    isNonEmptyString(o.id) &&
    isNonEmptyString(o.name) &&
    isNonEmptyString(o.watchlistText) &&
    typeof o.fullURLPath === "string" &&
    isNonEmptyString(o.parentCategoryId) &&
    isNonEmptyString(o.departmentId)
  );
}

/**
 * Runtime validation for `public/data/ica-maxi-promo-picker-catalog.json`.
 * Rejects malformed or wrong-version payloads before the picker renders bad data.
 */
export function parsePromoPickerCatalogJson(data: unknown): PromoPickerCatalog {
  if (!data || typeof data !== "object") {
    throw new Error("Promo picker catalog: expected a JSON object");
  }
  const root = data as Record<string, unknown>;
  if (root.schemaVersion !== 1) {
    throw new Error(`Promo picker catalog: unsupported schemaVersion (expected 1)`);
  }
  if (root.retailer !== "ica-maxi") {
    throw new Error("Promo picker catalog: unexpected retailer");
  }
  if (!root.meta || typeof root.meta !== "object") {
    throw new Error("Promo picker catalog: missing meta");
  }
  const meta = root.meta as Record<string, unknown>;
  if (typeof meta.generatedAt !== "string" || meta.generatedAt.trim() === "") {
    throw new Error("Promo picker catalog: meta.generatedAt required");
  }
  if (!Array.isArray(root.categories) || !root.categories.every(isCategory)) {
    throw new Error("Promo picker catalog: invalid categories[]");
  }
  if (!Array.isArray(root.items) || root.items.length === 0 || !root.items.every(isItem)) {
    throw new Error("Promo picker catalog: invalid or empty items[]");
  }
  return data as PromoPickerCatalog;
}
