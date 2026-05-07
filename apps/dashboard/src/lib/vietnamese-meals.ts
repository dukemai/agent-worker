import type {
  VietnameseMealDraft,
  VietnameseMealIngredientRole,
  VietnameseMealTouristNotes,
  VietnameseMealTypicalIngredient,
} from "@agent/shared";

export const VIETNAMESE_MEAL_STATUS_VALUES = ["draft", "published", "archived"] as const;
export type VietnameseMealStatus = (typeof VIETNAMESE_MEAL_STATUS_VALUES)[number];

export const VIETNAMESE_MEAL_LINK_TYPE_VALUES = ["canonical", "variant", "inspired_by"] as const;
export type VietnameseMealRecipeLinkType = (typeof VIETNAMESE_MEAL_LINK_TYPE_VALUES)[number];

export const VIETNAMESE_MEAL_COLUMNS =
  "id, created_by, name_vi, name_en, slug, summary, status, region_tags, base_tags, protein_tags, method_tags, flavor_tags, meal_context_tags, typical_ingredients, tourist_notes, ai_confidence, created_at, updated_at";

export const VIETNAMESE_MEAL_LINK_COLUMNS =
  "id, meal_id, recipe_id, link_type, notes, created_by, created_at";

const MAX_NAME_COUNT = 30;
const MAX_TAGS = 12;
const MAX_INGREDIENTS = 24;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type VietnameseMealRow = {
  id: string;
  created_by: string;
  name_vi: string;
  name_en: string | null;
  slug: string;
  summary: string;
  status: VietnameseMealStatus;
  region_tags: string[];
  base_tags: string[];
  protein_tags: string[];
  method_tags: string[];
  flavor_tags: string[];
  meal_context_tags: string[];
  typical_ingredients: VietnameseMealTypicalIngredient[];
  tourist_notes: VietnameseMealTouristNotes;
  ai_confidence: number;
  created_at: string;
  updated_at: string;
  linked_recipe_count?: number;
};

export type VietnameseMealLinkRow = {
  id: string;
  meal_id: string;
  recipe_id: string;
  link_type: VietnameseMealRecipeLinkType;
  notes: string;
  created_by: string;
  created_at: string;
};

export type SaveVietnameseMealBody = Omit<
  VietnameseMealDraft,
  "warnings"
> & {
  slug?: string;
};

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function normalizeVietnameseMealNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const names: string[] = [];
  const seen = new Set<string>();
  for (const value of raw) {
    if (typeof value !== "string") continue;
    const name = cleanText(value, 120);
    const key = name.toLocaleLowerCase("vi-VN");
    if (!name || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
    if (names.length >= MAX_NAME_COUNT) break;
  }
  return names;
}

export function slugifyVietnameseMealName(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return base || `meal-${Date.now()}`;
}

export function parseVietnameseMealDraft(body: unknown): SaveVietnameseMealBody | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Expected meal object" };
  }
  const o = body as Record<string, unknown>;
  const name_vi = cleanText(o.name_vi, 120);
  if (!name_vi) {
    return { error: "name_vi is required" };
  }
  const status = parseStatus(o.status);
  if (!status) {
    return { error: "status is invalid" };
  }
  const ingredients = parseTypicalIngredients(o.typical_ingredients);
  if ("error" in ingredients) {
    return ingredients;
  }
  const notes = parseTouristNotes(o.tourist_notes);
  if ("error" in notes) {
    return notes;
  }
  return {
    name_vi,
    name_en: cleanText(o.name_en, 160),
    slug: cleanSlug(o.slug) || slugifyVietnameseMealName(name_vi),
    summary: cleanText(o.summary, 900),
    status,
    region_tags: cleanTagArray(o.region_tags),
    base_tags: cleanTagArray(o.base_tags),
    protein_tags: cleanTagArray(o.protein_tags),
    method_tags: cleanTagArray(o.method_tags),
    flavor_tags: cleanTagArray(o.flavor_tags),
    meal_context_tags: cleanTagArray(o.meal_context_tags),
    typical_ingredients: ingredients,
    tourist_notes: notes,
    ai_confidence: cleanConfidence(o.ai_confidence),
  };
}

export function parseVietnameseMealPatch(
  body: unknown,
): { patch: Record<string, unknown> } | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Expected JSON body" };
  }
  const o = body as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  if (Object.prototype.hasOwnProperty.call(o, "name_vi")) {
    const name = cleanText(o.name_vi, 120);
    if (!name) return { error: "name_vi is required" };
    patch.name_vi = name;
    if (!Object.prototype.hasOwnProperty.call(o, "slug")) {
      patch.slug = slugifyVietnameseMealName(name);
    }
  }
  if (Object.prototype.hasOwnProperty.call(o, "name_en")) {
    patch.name_en = cleanText(o.name_en, 160) || null;
  }
  if (Object.prototype.hasOwnProperty.call(o, "slug")) {
    const slug = cleanSlug(o.slug);
    if (!slug) return { error: "slug is invalid" };
    patch.slug = slug;
  }
  if (Object.prototype.hasOwnProperty.call(o, "summary")) {
    patch.summary = cleanText(o.summary, 900);
  }
  if (Object.prototype.hasOwnProperty.call(o, "status")) {
    const status = parseStatus(o.status);
    if (!status) return { error: "status is invalid" };
    patch.status = status;
  }

  for (const key of [
    "region_tags",
    "base_tags",
    "protein_tags",
    "method_tags",
    "flavor_tags",
    "meal_context_tags",
  ]) {
    if (Object.prototype.hasOwnProperty.call(o, key)) {
      patch[key] = cleanTagArray(o[key]);
    }
  }
  if (Object.prototype.hasOwnProperty.call(o, "typical_ingredients")) {
    const ingredients = parseTypicalIngredients(o.typical_ingredients);
    if ("error" in ingredients) return ingredients;
    patch.typical_ingredients = ingredients;
  }
  if (Object.prototype.hasOwnProperty.call(o, "tourist_notes")) {
    const notes = parseTouristNotes(o.tourist_notes);
    if ("error" in notes) return notes;
    patch.tourist_notes = notes;
  }
  if (Object.prototype.hasOwnProperty.call(o, "ai_confidence")) {
    patch.ai_confidence = cleanConfidence(o.ai_confidence);
  }

  if (Object.keys(patch).length === 0) {
    return { error: "Body must include at least one editable field" };
  }
  return { patch };
}

export function parseRecipeLinkBody(
  body: unknown,
): { recipe_id: string; link_type: VietnameseMealRecipeLinkType; notes: string } | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Expected JSON body" };
  }
  const o = body as Record<string, unknown>;
  const recipe_id = typeof o.recipe_id === "string" ? o.recipe_id.trim() : "";
  if (!isUuid(recipe_id)) {
    return { error: "recipe_id is invalid" };
  }
  const link_type =
    typeof o.link_type === "string" &&
    VIETNAMESE_MEAL_LINK_TYPE_VALUES.includes(o.link_type as VietnameseMealRecipeLinkType)
      ? (o.link_type as VietnameseMealRecipeLinkType)
      : "inspired_by";
  return {
    recipe_id,
    link_type,
    notes: cleanText(o.notes, 500),
  };
}

function parseStatus(value: unknown): VietnameseMealStatus | null {
  return typeof value === "string" &&
    VIETNAMESE_MEAL_STATUS_VALUES.includes(value as VietnameseMealStatus)
    ? (value as VietnameseMealStatus)
    : null;
}

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function cleanSlug(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function cleanTagArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const tag = cleanText(item, 48).toLocaleLowerCase("sv-SE");
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

function cleanConfidence(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0.5;
  return Math.round(Math.max(0, Math.min(1, n)) * 100) / 100;
}

function parseTypicalIngredientRole(value: unknown): VietnameseMealIngredientRole {
  return value === "main" ||
    value === "broth" ||
    value === "sauce" ||
    value === "garnish" ||
    value === "optional"
    ? value
    : "main";
}

function parseTypicalIngredients(
  value: unknown,
): VietnameseMealTypicalIngredient[] | { error: string } {
  if (!Array.isArray(value)) return [];
  const out: VietnameseMealTypicalIngredient[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") {
      return { error: "Invalid typical ingredient row" };
    }
    const o = raw as Record<string, unknown>;
    const name = cleanText(o.name, 100);
    const name_vi = cleanText(o.name_vi, 100);
    if (!name && !name_vi) {
      return { error: "Typical ingredient rows require name or name_vi" };
    }
    out.push({
      name: name || name_vi,
      name_vi,
      role: parseTypicalIngredientRole(o.role),
      notes: cleanText(o.notes, 180),
    });
    if (out.length >= MAX_INGREDIENTS) break;
  }
  return out;
}

function parseTouristNotes(value: unknown): VietnameseMealTouristNotes | { error: string } {
  if (!value || typeof value !== "object") {
    return {
      taste_description: "",
      ordering_context: "",
      allergen_hints: [],
      adventurousness: "medium",
    };
  }
  const o = value as Record<string, unknown>;
  const adventurousness =
    o.adventurousness === "familiar" ||
    o.adventurousness === "adventurous" ||
    o.adventurousness === "medium"
      ? o.adventurousness
      : "medium";
  return {
    taste_description: cleanText(o.taste_description, 300),
    ordering_context: cleanText(o.ordering_context, 300),
    allergen_hints: cleanTagArray(o.allergen_hints).slice(0, 10),
    adventurousness,
  };
}
