import { scoreInterestAgainstPromotionText, type RecipeIngredient } from "@agent/shared";
import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { ensureCookPlan } from "@/lib/cook-plan-server";
import { SAVED_RECIPE_COLUMNS } from "@/lib/saved-recipe-columns";
import type { SavedRecipeRow } from "@/lib/saved-recipe-row";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_MATCH_IDS = 30;
const MAX_RECOMMENDATIONS = 12;

type WeeklyPromotionMatchForRecipeRecommendation = {
  id: string;
  promotion_id: string;
  interest: string;
  score: number;
  promotion:
    | {
        id: string;
        store_key: string;
        title: string;
        card_text: string;
      }
    | {
        id: string;
        store_key: string;
        title: string;
        card_text: string;
      }[]
    | null;
};

export type PromoRecipeRecommendationSelectedPromotion = {
  matchId: string;
  promotionId: string;
  storeKey: string;
  title: string;
  interest: string;
};

export type PromoRecipeRecommendationMatch = {
  matchId: string;
  promotionTitle: string;
  interest: string;
  score: number;
  reason: string;
};

export type PromoRecipeRecommendation = {
  recipe: SavedRecipeRow;
  score: number;
  onPlan: boolean;
  matchedPromotions: PromoRecipeRecommendationMatch[];
};

export type PromoRecipeRecommendationsResponse = {
  selectedPromotions: PromoRecipeRecommendationSelectedPromotion[];
  recommendations: PromoRecipeRecommendation[];
};

function parseMatchIds(raw: unknown): string[] | { error: string } {
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>).matchIds : null;
  if (!Array.isArray(value)) {
    return { error: "matchIds must be an array" };
  }

  const ids = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return { error: "Select at least one matched promotion" };
  }
  if (ids.length > MAX_MATCH_IDS) {
    return { error: `Select at most ${MAX_MATCH_IDS} matched promotions` };
  }
  if (!ids.every((id) => UUID_RE.test(id))) {
    return { error: "matchIds must be valid ids" };
  }

  return [...new Set(ids)];
}

function asIngredients(value: unknown): RecipeIngredient[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((row): row is RecipeIngredient => {
    if (!row || typeof row !== "object") {
      return false;
    }
    const r = row as Record<string, unknown>;
    return (
      typeof r.text === "string" &&
      typeof r.ingredient_label === "string" &&
      typeof r.amount === "string"
    );
  });
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function selectedPromotionFromMatch(
  match: WeeklyPromotionMatchForRecipeRecommendation,
): PromoRecipeRecommendationSelectedPromotion | null {
  const promotion = Array.isArray(match.promotion) ? match.promotion[0] : match.promotion;
  if (!promotion) {
    return null;
  }
  return {
    matchId: match.id,
    promotionId: promotion.id,
    storeKey: promotion.store_key,
    title: promotion.title,
    interest: match.interest,
  };
}

function uniqueSignals(...values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.replace(/\s+/g, " ").trim();
    if (trimmed.length < 2) {
      continue;
    }
    const key = trimmed.toLocaleLowerCase("sv-SE");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function scoreRecipeForPromotion(
  recipe: SavedRecipeRow,
  selectedPromotion: PromoRecipeRecommendationSelectedPromotion,
): {
  bestIngredientScore: number;
  bestOverallScore: number;
  match: PromoRecipeRecommendationMatch | null;
} {
  const ingredients = asIngredients(recipe.ingredients);
  const ingredientHaystack = [
    ...asStringArray(recipe.ingredient_picks),
    ...ingredients.flatMap((ingredient) => [
      ingredient.ingredient_label,
      ingredient.text,
      ingredient.amount,
    ]),
  ].join("\n");
  const contextHaystack = [recipe.title, recipe.summary, recipe.title_en, recipe.title_vi].join("\n");
  const signals = uniqueSignals(selectedPromotion.interest, selectedPromotion.title);

  let bestIngredientScore = 0;
  let bestContextScore = 0;
  let bestSignal = selectedPromotion.interest;
  for (const signal of signals) {
    const ingredientScore = scoreInterestAgainstPromotionText(signal, ingredientHaystack);
    if (ingredientScore > bestIngredientScore) {
      bestIngredientScore = ingredientScore;
      bestSignal = signal;
    }
    const contextScore = scoreInterestAgainstPromotionText(signal, contextHaystack);
    if (contextScore > bestContextScore) {
      bestContextScore = contextScore;
      if (bestIngredientScore === 0) {
        bestSignal = signal;
      }
    }
  }

  const bestOverallScore =
    bestIngredientScore > 0 ? bestIngredientScore : Math.floor(bestContextScore * 0.7);
  if (bestOverallScore <= 0) {
    return { bestIngredientScore, bestOverallScore: 0, match: null };
  }

  return {
    bestIngredientScore,
    bestOverallScore,
    match: {
      matchId: selectedPromotion.matchId,
      promotionTitle: selectedPromotion.title,
      interest: selectedPromotion.interest,
      score: bestOverallScore,
      reason:
        bestIngredientScore > 0
          ? `${bestSignal} matched recipe ingredients`
          : `${bestSignal} matched recipe title or summary`,
    },
  };
}

function rankRecommendations(
  recipes: SavedRecipeRow[],
  selectedPromotions: PromoRecipeRecommendationSelectedPromotion[],
  planRecipeIds: Set<string>,
): PromoRecipeRecommendation[] {
  const ranked = recipes
    .map((recipe) => {
      let bestIngredientScore = 0;
      let totalScore = 0;
      const matchedPromotions: PromoRecipeRecommendationMatch[] = [];
      for (const selectedPromotion of selectedPromotions) {
        const scored = scoreRecipeForPromotion(recipe, selectedPromotion);
        bestIngredientScore = Math.max(bestIngredientScore, scored.bestIngredientScore);
        totalScore += scored.bestOverallScore;
        if (scored.match) {
          matchedPromotions.push(scored.match);
        }
      }

      return {
        recommendation: {
          recipe,
          score: totalScore,
          onPlan: planRecipeIds.has(recipe.id),
          matchedPromotions,
        } satisfies PromoRecipeRecommendation,
        bestIngredientScore,
      };
    })
    .filter((item) => item.recommendation.score > 0)
    .sort((a, b) => {
      if (b.bestIngredientScore !== a.bestIngredientScore) {
        return b.bestIngredientScore - a.bestIngredientScore;
      }
      if (b.recommendation.score !== a.recommendation.score) {
        return b.recommendation.score - a.recommendation.score;
      }
      if (b.recommendation.recipe.tested !== a.recommendation.recipe.tested) {
        return b.recommendation.recipe.tested ? 1 : -1;
      }
      return (
        new Date(b.recommendation.recipe.created_at).getTime() -
        new Date(a.recommendation.recipe.created_at).getTime()
      );
    });

  return ranked.slice(0, MAX_RECOMMENDATIONS).map((item) => item.recommendation);
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

  const matchIds = parseMatchIds(body);
  if ("error" in matchIds) {
    return errorResponse(matchIds.error, 400);
  }

  const { data: matchRows, error: matchError } = await auth.supabase
    .from("weekly_promotion_matches")
    .select(
      "id, promotion_id, interest, score, promotion:weekly_promotions(id, store_key, title, card_text)",
    )
    .in("id", matchIds);

  if (matchError) {
    return errorResponse(matchError.message, 500);
  }

  const selectedPromotions = ((matchRows ?? []) as WeeklyPromotionMatchForRecipeRecommendation[])
    .map(selectedPromotionFromMatch)
    .filter((item): item is PromoRecipeRecommendationSelectedPromotion => item !== null);

  if (selectedPromotions.length === 0) {
    return errorResponse("No matched promotions found", 404);
  }

  const { data: recipeRows, error: recipeError } = await auth.supabase
    .from("saved_recipes")
    .select(SAVED_RECIPE_COLUMNS)
    .eq("user_id", auth.user.id);

  if (recipeError) {
    return errorResponse(recipeError.message, 500);
  }

  let planRecipeIds = new Set<string>();
  try {
    const plan = await ensureCookPlan(auth.supabase, auth.user.id);
    const { data: planItems, error: planItemsError } = await auth.supabase
      .from("cook_plan_items")
      .select("recipe_id")
      .eq("plan_id", plan.id);
    if (planItemsError) {
      return errorResponse(planItemsError.message, 500);
    }
    planRecipeIds = new Set((planItems ?? []).map((item) => item.recipe_id));
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Cook plan error", 500);
  }

  const recommendations = rankRecommendations(
    (recipeRows ?? []) as SavedRecipeRow[],
    selectedPromotions,
    planRecipeIds,
  );

  return NextResponse.json({
    selectedPromotions,
    recommendations,
  } satisfies PromoRecipeRecommendationsResponse);
}
