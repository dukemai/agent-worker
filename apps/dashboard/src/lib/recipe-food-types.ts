import { readFileSync } from "node:fs";
import { join } from "node:path";

type RecipeFoodTypesFile = {
  schemaVersion: number;
  options: { id: string; label: string }[];
};

let cached: { ids: Set<string>; byId: Map<string, string> } | null = null;

function load(): { ids: Set<string>; byId: Map<string, string> } {
  if (cached) {
    return cached;
  }
  const path = join(process.cwd(), "public", "data", "recipe-food-types.json");
  const raw = JSON.parse(readFileSync(path, "utf8")) as RecipeFoodTypesFile;
  const byId = new Map<string, string>();
  for (const o of raw.options) {
    byId.set(o.id, o.label);
  }
  cached = { ids: new Set(byId.keys()), byId };
  return cached;
}

export function getFoodTypeLabelSv(id: string): string | null {
  return load().byId.get(id) ?? null;
}

export function isValidFoodTypeId(id: string): boolean {
  return load().ids.has(id);
}
