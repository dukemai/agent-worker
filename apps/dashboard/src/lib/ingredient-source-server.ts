import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildIngredientSourceIndex } from "@/lib/ingredient-source-index";
import { parsePromoPickerCatalogJson } from "@/lib/promo-picker-catalog-validate";

export function loadIngredientSourceIndex() {
  const path = join(process.cwd(), "public", "data", "ica-maxi-promo-picker-catalog.json");
  const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
  return buildIngredientSourceIndex(parsePromoPickerCatalogJson(raw));
}
