import { foodDepartmentIdsFromCatalog } from "@/lib/recipe-picker-food-departments";
import type { PromoPickerCatalog, PromoPickerItem } from "@/types/promo-picker-catalog";

export type IngredientSourceLanguage = "sv" | "en" | "vi";

export type IngredientSourceOption = {
  id: string;
  source: "ica-maxi";
  labels: Record<IngredientSourceLanguage, string>;
  aliases: Record<IngredientSourceLanguage, string[]>;
  watchlistText: string;
  itemName: string;
  departmentId: string;
  departmentName: string;
  categoryPath: string;
  productCount: number | null;
};

export type IngredientSourceDepartmentSummary = {
  departmentId: string;
  departmentName: string;
  itemCount: number;
  productCount: number;
};

export type IngredientSourceIndex = {
  generatedAt: string;
  sourceCount: number;
  foodDepartmentCount: number;
  options: IngredientSourceOption[];
  departments: IngredientSourceDepartmentSummary[];
  translationCoverage: Record<IngredientSourceLanguage, { filled: number; missing: number }>;
};

function emptyAliases(): Record<IngredientSourceLanguage, string[]> {
  return { sv: [], en: [], vi: [] };
}

function labelsForItem(item: PromoPickerItem): Record<IngredientSourceLanguage, string> {
  return {
    sv: item.labels?.sv.trim() || item.watchlistText.trim(),
    en: item.labels?.en.trim() ?? "",
    vi: item.labels?.vi.trim() ?? "",
  };
}

function termsForOption(option: IngredientSourceOption): string[] {
  return [
    option.watchlistText,
    option.itemName,
    option.labels.sv,
    option.labels.en,
    option.labels.vi,
    ...option.aliases.sv,
    ...option.aliases.en,
    ...option.aliases.vi,
  ]
    .map((term) => term.trim())
    .filter(Boolean);
}

export function ingredientSourceTerms(option: IngredientSourceOption): string[] {
  return Array.from(new Set(termsForOption(option)));
}

export function normalizeIngredientSourceSearch(value: string): string {
  return value.trim().toLocaleLowerCase("sv-SE");
}

export function ingredientSourceMatchesQuery(
  option: IngredientSourceOption,
  query: string,
): boolean {
  const q = normalizeIngredientSourceSearch(query);
  if (!q) {
    return true;
  }
  const tokens = q.split(/\s+/).filter(Boolean);
  const haystack = normalizeIngredientSourceSearch(
    [
      ...termsForOption(option),
      option.departmentName,
      option.categoryPath,
    ].join(" "),
  );
  return tokens.every((token) => haystack.includes(token));
}

export function buildIngredientSourceIndex(catalog: PromoPickerCatalog): IngredientSourceIndex {
  const foodDeptIds = foodDepartmentIdsFromCatalog(catalog);
  const departmentNameById = new Map<string, string>();
  for (const category of catalog.categories) {
    if (category.parentId === null && foodDeptIds.has(category.departmentId)) {
      departmentNameById.set(category.departmentId, category.name);
    }
  }

  const seen = new Set<string>();
  const options: IngredientSourceOption[] = [];
  for (const item of catalog.items) {
    if (!foodDeptIds.has(item.departmentId)) {
      continue;
    }
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    options.push({
      id: item.id,
      source: "ica-maxi",
      labels: labelsForItem(item),
      aliases: emptyAliases(),
      watchlistText: item.watchlistText.trim(),
      itemName: item.name.trim(),
      departmentId: item.departmentId,
      departmentName: departmentNameById.get(item.departmentId) ?? "Unknown",
      categoryPath: item.fullURLPath,
      productCount: typeof item.productCount === "number" ? item.productCount : null,
    });
  }

  options.sort(
    (a, b) =>
      a.departmentName.localeCompare(b.departmentName, "sv-SE") ||
      a.watchlistText.localeCompare(b.watchlistText, "sv-SE"),
  );

  const departmentMap = new Map<string, IngredientSourceDepartmentSummary>();
  for (const option of options) {
    const current = departmentMap.get(option.departmentId) ?? {
      departmentId: option.departmentId,
      departmentName: option.departmentName,
      itemCount: 0,
      productCount: 0,
    };
    current.itemCount += 1;
    current.productCount += option.productCount ?? 0;
    departmentMap.set(option.departmentId, current);
  }

  const departments = Array.from(departmentMap.values()).sort((a, b) =>
    a.departmentName.localeCompare(b.departmentName, "sv-SE"),
  );

  const translationCoverage: IngredientSourceIndex["translationCoverage"] = {
    sv: { filled: 0, missing: 0 },
    en: { filled: 0, missing: 0 },
    vi: { filled: 0, missing: 0 },
  };
  for (const option of options) {
    for (const language of Object.keys(translationCoverage) as IngredientSourceLanguage[]) {
      if (option.labels[language].trim() || option.aliases[language].length > 0) {
        translationCoverage[language].filled += 1;
      } else {
        translationCoverage[language].missing += 1;
      }
    }
  }

  return {
    generatedAt: catalog.meta.generatedAt,
    sourceCount: options.length,
    foodDepartmentCount: departments.length,
    options,
    departments,
    translationCoverage,
  };
}
