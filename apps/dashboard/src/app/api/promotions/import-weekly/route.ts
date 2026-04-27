import { getISOWeekNumber } from "@agent/shared";
import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import {
  makeWeeklyPromotionDedupeKey,
  parseWeeklyPromotionsJson,
} from "@/lib/weekly-promotions-import";

async function readJsonBody(request: Request): Promise<
  | { ok: true; raw: unknown }
  | { ok: false; response: NextResponse }
> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return { ok: true, raw: await request.json() };
    } catch {
      return { ok: false, response: errorResponse("Invalid JSON body", 400) };
    }
  }

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return { ok: false, response: errorResponse("Expected multipart field file", 400) };
    }
    try {
      return { ok: true, raw: JSON.parse(await file.text()) as unknown };
    } catch {
      return { ok: false, response: errorResponse("Uploaded file is not valid JSON", 400) };
    }
  }

  return {
    ok: false,
    response: errorResponse(
      "Use Content-Type application/json or multipart/form-data with file",
      415,
    ),
  };
}

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return body.response;
  }

  const parsed = parseWeeklyPromotionsJson(body.raw);
  if (!parsed.ok) {
    return errorResponse(parsed.error, 400);
  }

  const now = new Date();
  const weekNumber = getISOWeekNumber(now);
  const isoYear = now.getUTCFullYear();
  const rawJson = body.raw as Record<string, unknown>;

  const { data: run, error: runError } = await auth.supabase
    .from("promotion_import_runs")
    .insert({
      store_key: parsed.data.storeKey,
      iso_year: isoYear,
      week_number: weekNumber,
      source: "manual_upload",
      imported_count: parsed.data.promotions.length,
      raw_json: rawJson,
    })
    .select("id")
    .single();

  if (runError || !run) {
    return errorResponse(runError?.message ?? "Failed to create promotion import", 500);
  }

  const seen = new Set<string>();
  const rows = parsed.data.promotions.flatMap((promotion, sortOrder) => {
    const dedupeKey = makeWeeklyPromotionDedupeKey(promotion);
    if (seen.has(dedupeKey)) {
      return [];
    }
    seen.add(dedupeKey);
    return [
      {
        run_id: run.id,
        sort_order: sortOrder,
        store_key: promotion.storeKey,
        promotion_index: promotion.index,
        title: promotion.title,
        card_text: promotion.cardText,
        price_hint: promotion.priceHint ?? null,
        image_url: promotion.imageUrl ?? null,
        source_url: promotion.sourceUrl,
        category_key: promotion.categoryKey ?? null,
        category_name: promotion.categoryName ?? null,
        dedupe_key: dedupeKey,
        raw_json: promotion.raw,
      },
    ];
  });

  const { error: itemError } = await auth.supabase.from("weekly_promotions").insert(rows);
  if (itemError) {
    await auth.supabase.from("promotion_import_runs").delete().eq("id", run.id);
    return errorResponse(itemError.message, 500);
  }

  if (rows.length !== parsed.data.promotions.length) {
    await auth.supabase
      .from("promotion_import_runs")
      .update({ imported_count: rows.length })
      .eq("id", run.id);
  }

  return NextResponse.json({
    runId: run.id,
    storeKey: parsed.data.storeKey,
    weekNumber,
    isoYear,
    itemCount: rows.length,
  });
}
