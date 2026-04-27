import { suggestPromoFavoritesForFoodStyle } from "@agent/shared";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { parsePromoPickerCatalogJson } from "@/lib/promo-picker-catalog-validate";

function cleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

async function loadIcaCatalogForPrompt() {
  const file = await readFile(
    join(process.cwd(), "public", "data", "ica-maxi-promo-picker-catalog.json"),
    "utf8",
  );
  const catalog = parsePromoPickerCatalogJson(JSON.parse(file) as unknown);
  const categoryById = new Map(catalog.categories.map((category) => [category.id, category]));
  const departmentNameById = new Map(
    catalog.categories
      .filter((category) => category.parentId === null)
      .map((category) => [category.id, category.name]),
  );

  return {
    categories: catalog.categories.map((category) => ({
      id: category.id,
      name: category.name,
      path: category.fullURLPath,
    })),
    items: catalog.items.map((item) => {
      const category = categoryById.get(item.parentCategoryId);
      return {
        watchlistText: item.watchlistText,
        categoryName: category?.name ?? "",
        departmentName: departmentNameById.get(item.departmentId) ?? "",
      };
    }),
  };
}

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return errorResponse(
      "GEMINI_API_KEY is not configured on the server. Add it to the dashboard environment.",
      503,
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const styleLabel = cleanString(body.styleLabel);
  if (!styleLabel) {
    return errorResponse("styleLabel is required", 400);
  }

  try {
    const catalog = await loadIcaCatalogForPrompt();
    const result = await suggestPromoFavoritesForFoodStyle(apiKey, {
      styleLabel,
      categories: catalog.categories,
      items: catalog.items,
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to generate food-style suggestions",
      502,
    );
  }
}
