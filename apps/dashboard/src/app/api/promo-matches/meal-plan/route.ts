import { generatePromoMealPlanForWeek } from "@agent/shared";
import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import type { PromoMealPlanResponseMeta } from "@/types/promo-meal-plan";

/**
 * POST: build a Swedish week meal sketch from the latest imported `promo_match_*` rows (Gemini).
 * Requires `GEMINI_API_KEY` on the dashboard server.
 */
export async function POST() {
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

  const { data: run, error: runErr } = await auth.supabase
    .from("promo_match_runs")
    .select("id, store_key, interests")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (runErr) {
    return errorResponse(runErr.message, 500);
  }

  if (!run) {
    return errorResponse("No promo import found. Import watchlist-matches-only.json first.", 404);
  }

  const { data: items, error: itemsErr } = await auth.supabase
    .from("promo_match_items")
    .select("title, card_text, price_hint, interest, week_number")
    .eq("run_id", run.id)
    .order("sort_order", { ascending: true });

  if (itemsErr) {
    return errorResponse(itemsErr.message, 500);
  }

  const list = items ?? [];
  if (list.length === 0) {
    return errorResponse("Latest import has no matched offers to plan from.", 400);
  }

  const isoWeek = list[0]?.week_number;
  if (typeof isoWeek !== "number") {
    return errorResponse("Promotion rows are missing week_number.", 500);
  }

  const interestsUnknown = run.interests;
  const interests = Array.isArray(interestsUnknown)
    ? interestsUnknown.filter((x): x is string => typeof x === "string")
    : [];

  try {
    const plan = await generatePromoMealPlanForWeek(apiKey, {
      isoWeek,
      storeKey: run.store_key,
      interests,
      promotions: list.map((row) => ({
        title: row.title,
        card_text: row.card_text,
        price_hint: row.price_hint,
        matched_interest: row.interest,
      })),
    });

    const meta: PromoMealPlanResponseMeta = {
      iso_week: isoWeek,
      promotion_count: list.length,
      store_key: run.store_key,
      generated_at: new Date().toISOString(),
    };

    return NextResponse.json({ plan, meta });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return errorResponse(`Meal plan generation failed: ${msg}`, 502);
  }
}
