import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import {
  parseVietnameseMealDraft,
  VIETNAMESE_MEAL_COLUMNS,
  type VietnameseMealRow,
} from "@/lib/vietnamese-meals";

const VALID_TAG_FILTERS = new Set([
  "region",
  "base",
  "protein",
  "method",
  "flavor",
  "context",
]);

const TAG_COLUMN_BY_FILTER: Record<string, string> = {
  region: "region_tags",
  base: "base_tags",
  protein: "protein_tags",
  method: "method_tags",
  flavor: "flavor_tags",
  context: "meal_context_tags",
};

export async function GET(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status")?.trim();
  const search = url.searchParams.get("search")?.trim();
  const tagKind = url.searchParams.get("tagKind")?.trim() ?? "";
  const tag = url.searchParams.get("tag")?.trim().toLocaleLowerCase("sv-SE") ?? "";

  let query = auth.supabase
    .from("vietnamese_meals")
    .select(VIETNAMESE_MEAL_COLUMNS)
    .eq("created_by", auth.user.id)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    if (!["draft", "published", "archived"].includes(status)) {
      return errorResponse("status is invalid", 400);
    }
    query = query.eq("status", status);
  }
  if (search) {
    const pattern = `%${search.replace(/[%_]/g, "")}%`;
    query = query.or(`name_vi.ilike.${pattern},name_en.ilike.${pattern},summary.ilike.${pattern}`);
  }
  if (tag || tagKind) {
    if (!tag || !VALID_TAG_FILTERS.has(tagKind)) {
      return errorResponse("tagKind and tag must both be valid when filtering by tag", 400);
    }
    query = query.contains(TAG_COLUMN_BY_FILTER[tagKind], [tag]);
  }

  const { data, error } = await query;
  if (error) {
    return errorResponse(error.message, 500);
  }

  const rows = (data ?? []) as VietnameseMealRow[];
  const ids = rows.map((row) => row.id);
  let linkCounts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: links, error: linkError } = await auth.supabase
      .from("vietnamese_meal_recipe_links")
      .select("meal_id")
      .in("meal_id", ids);
    if (linkError) {
      return errorResponse(linkError.message, 500);
    }
    linkCounts = new Map<string, number>();
    for (const link of links ?? []) {
      const mealId = String(link.meal_id);
      linkCounts.set(mealId, (linkCounts.get(mealId) ?? 0) + 1);
    }
  }

  return NextResponse.json({
    meals: rows.map((row) => ({
      ...row,
      linked_recipe_count: linkCounts.get(row.id) ?? 0,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Expected JSON body", 400);
  }

  const rawMeals =
    body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).meals)
      ? ((body as Record<string, unknown>).meals as unknown[])
      : [body];
  if (rawMeals.length === 0 || rawMeals.length > 30) {
    return errorResponse("meals must contain 1-30 rows", 400);
  }

  const rows = [];
  for (const raw of rawMeals) {
    const parsed = parseVietnameseMealDraft(raw);
    if ("error" in parsed) {
      return errorResponse(parsed.error, 400);
    }
    rows.push({
      created_by: auth.user.id,
      name_vi: parsed.name_vi,
      name_en: parsed.name_en || null,
      slug: parsed.slug,
      summary: parsed.summary,
      status: parsed.status,
      region_tags: parsed.region_tags,
      base_tags: parsed.base_tags,
      protein_tags: parsed.protein_tags,
      method_tags: parsed.method_tags,
      flavor_tags: parsed.flavor_tags,
      meal_context_tags: parsed.meal_context_tags,
      typical_ingredients: parsed.typical_ingredients,
      tourist_notes: parsed.tourist_notes,
      ai_confidence: parsed.ai_confidence,
    });
  }

  const { data, error } = await auth.supabase
    .from("vietnamese_meals")
    .insert(rows)
    .select(VIETNAMESE_MEAL_COLUMNS);

  if (error) {
    const statusCode = error.code === "23505" ? 409 : 500;
    return errorResponse(error.message, statusCode);
  }

  return NextResponse.json({ meals: data ?? [] });
}
