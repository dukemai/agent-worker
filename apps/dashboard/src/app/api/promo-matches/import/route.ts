import { getISOWeekNumber } from "@agent/shared";
import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import {
  parseWatchlistMatchesOnlyJson,
  type WatchlistMatchesOnlyPayload,
} from "@/lib/promo-matches-import";

function storeKeyFromPayload(data: WatchlistMatchesOnlyPayload): string {
  const first = data.matches[0]?.promotion.storeKey;
  return typeof first === "string" && first.length > 0 ? first : "unknown";
}

/**
 * Import Playwright `watchlist-matches-only.json`: multipart file `file` or JSON body.
 */
export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }
  const { supabase } = auth;

  let raw: unknown;
  const ct = request.headers.get("content-type") ?? "";

  if (ct.includes("application/json")) {
    try {
      raw = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }
  } else if (ct.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return errorResponse("Expected multipart field file (JSON)", 400);
    }
    const text = await file.text();
    try {
      raw = JSON.parse(text) as unknown;
    } catch {
      return errorResponse("Uploaded file is not valid JSON", 400);
    }
  } else {
    return errorResponse(
      "Use Content-Type application/json or multipart/form-data with file",
      415,
    );
  }

  const parsed = parseWatchlistMatchesOnlyJson(raw);
  if (!parsed.ok) {
    return errorResponse(parsed.error, 400);
  }

  const { data } = parsed;
  const storeKey = storeKeyFromPayload(data);
  const rawJson = raw as Record<string, unknown>;

  const weekNumber = getISOWeekNumber();

  const { data: run, error: runErr } = await supabase
    .from("promo_match_runs")
    .insert({
      store_key: storeKey,
      interests: data.interests,
      raw_json: rawJson,
      week_number: weekNumber,
    })
    .select("id")
    .single();

  if (runErr || !run) {
    return errorResponse(runErr?.message ?? "Failed to create run", 500);
  }

  const runId = run.id;

  if (data.matches.length > 0) {
    const rows = data.matches.map((m, sortOrder) => ({
      run_id: runId,
      sort_order: sortOrder,
      week_number: weekNumber,
      interest: m.interest,
      score: Math.round(m.score),
      promotion_index: m.promotion.index,
      title: m.promotion.title,
      card_text: m.promotion.cardText,
      price_hint: m.promotion.priceHint ?? null,
      image_url: m.promotion.imageUrl ?? null,
      source_url: m.promotion.sourceUrl,
      store_key: m.promotion.storeKey,
    }));

    const { error: itemsErr } = await supabase.from("promo_match_items").insert(rows);
    if (itemsErr) {
      await supabase.from("promo_match_runs").delete().eq("id", runId);
      return errorResponse(itemsErr.message, 500);
    }
  }

  return NextResponse.json({
    runId,
    itemCount: data.matches.length,
    storeKey,
  });
}
