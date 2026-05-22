import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { WeeklyPromotionMatchRule, WeeklyPromotionMatchRulesByInterest } from "@agent/shared";
import { parsePromoPickerCatalogJson } from "@/lib/promo-picker-catalog-validate";
import type { PromoPickerCatalog, PromoPickerCategory, PromoPickerItem } from "@/types/promo-picker-catalog";

type MatchRuleOverride = {
  aliases?: string[];
  blockedTerms?: string[];
  allowedCategoryTerms?: string[];
};

const MATCH_RULE_OVERRIDES: Record<string, MatchRuleOverride> = {
  "ägg": {
    blockedTerms: ["vägg", "lägg"],
  },
  "svamp": {
    aliases: ["champinjon", "champinjoner", "portabello", "skogschampinjon"],
    blockedTerms: ["rengöringssvamp", "disksvamp", "tvättsvamp"],
  },
  "smör": {
    blockedTerms: ["smörgås", "smörgåsmat"],
  },
};

let cachedCatalog: PromoPickerCatalog | null = null;

function normalizeRuleKey(value: string): string {
  return value.toLocaleLowerCase("sv-SE").replace(/\s+/g, " ").trim();
}

function splitCategoryTerms(value: string): string[] {
  return value
    .split(/[^A-Za-zÅÄÖåäö0-9]+/u)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3);
}

function categoryLineageTerms(
  item: PromoPickerItem,
  categoryById: Map<string, PromoPickerCategory>,
): string[] {
  const terms = new Set<string>();
  for (const value of [item.fullURLPath, item.name, item.watchlistText, item.labels?.sv]) {
    if (value) {
      splitCategoryTerms(value).forEach((term) => terms.add(term));
    }
  }

  let category = categoryById.get(item.parentCategoryId);
  const visited = new Set<string>();
  while (category && !visited.has(category.id)) {
    visited.add(category.id);
    splitCategoryTerms(category.name).forEach((term) => terms.add(term));
    splitCategoryTerms(category.fullURLPath).forEach((term) => terms.add(term));
    category = category.parentId ? categoryById.get(category.parentId) : undefined;
  }

  return [...terms];
}

function loadPromoPickerCatalog(): PromoPickerCatalog {
  if (cachedCatalog) {
    return cachedCatalog;
  }
  const path = join(process.cwd(), "public", "data", "ica-maxi-promo-picker-catalog.json");
  const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
  cachedCatalog = parsePromoPickerCatalogJson(raw);
  return cachedCatalog;
}

function buildRuleForCatalogItem(
  item: PromoPickerItem,
  categoryById: Map<string, PromoPickerCategory>,
): WeeklyPromotionMatchRule {
  const key = normalizeRuleKey(item.watchlistText);
  const override = MATCH_RULE_OVERRIDES[key];
  const aliases = new Set(
    [item.watchlistText, item.name, item.labels?.sv, ...(override?.aliases ?? [])]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0),
  );

  return {
    aliases: [...aliases],
    blockedTerms: override?.blockedTerms,
    allowedCategoryTerms: [...new Set([...categoryLineageTerms(item, categoryById), ...(override?.allowedCategoryTerms ?? [])])],
  };
}

export function buildPromoWatchlistMatchRules(watchlistItems: string[]): WeeklyPromotionMatchRulesByInterest {
  const catalog = loadPromoPickerCatalog();
  const categoryById = new Map(catalog.categories.map((category) => [category.id, category]));
  const itemByWatchlistText = new Map(catalog.items.map((item) => [normalizeRuleKey(item.watchlistText), item]));
  const rules: WeeklyPromotionMatchRulesByInterest = {};

  for (const raw of watchlistItems) {
    const key = normalizeRuleKey(raw);
    const item = itemByWatchlistText.get(key);
    if (item) {
      rules[key] = buildRuleForCatalogItem(item, categoryById);
      continue;
    }

    const override = MATCH_RULE_OVERRIDES[key];
    if (override) {
      rules[key] = {
        aliases: [raw, ...(override.aliases ?? [])],
        blockedTerms: override.blockedTerms,
        allowedCategoryTerms: override.allowedCategoryTerms,
      };
    }
  }

  return rules;
}
