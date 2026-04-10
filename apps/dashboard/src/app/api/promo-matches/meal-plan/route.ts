import { generatePromoMealPlanForWeek } from "@agent/shared";
import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import type { PromoMealPlanResponseMeta } from "@/types/promo-meal-plan";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST JSON `{ runId }`: build a Swedish week meal sketch from that import’s `promo_match_*` rows (Gemini).
 * Requires `GEMINI_API_KEY` on the dashboard server.
 */
export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Expected JSON body with runId", 400);
  }

  const runIdRaw =
    typeof body === "object" && body !== null && "runId" in body
      ? (body as { runId: unknown }).runId
      : undefined;
  const runId = typeof runIdRaw === "string" ? runIdRaw.trim() : "";
  if (!runId || !UUID_RE.test(runId)) {
    return errorResponse("Body must include runId (UUID of a promo_match_runs row).", 400);
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
    .select("id, store_key, interests, week_number")
    .eq("id", runId)
    .maybeSingle();

  if (runErr) {
    return errorResponse(runErr.message, 500);
  }

  if (!run) {
    return errorResponse("No promo import found for that runId.", 404);
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
    return errorResponse("This import has no matched offers to plan from.", 400);
  }

  const isoWeek =
    typeof run.week_number === "number" && Number.isFinite(run.week_number)
      ? run.week_number
      : list[0]?.week_number;
  if (typeof isoWeek !== "number" || !Number.isFinite(isoWeek)) {
    return errorResponse("Could not determine ISO week for this import.", 500);
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
      run_id: run.id,
    };

    return NextResponse.json({ plan, meta });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return errorResponse(`Meal plan generation failed: ${msg}`, 502);
  }
}
