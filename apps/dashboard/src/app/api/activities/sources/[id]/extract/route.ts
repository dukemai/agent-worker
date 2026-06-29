import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { extractActivitiesFromMarkdown } from "@/lib/activity-extraction";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return errorResponse("GEMINI_API_KEY is not configured on the server.", 503);
  }

  const { id } = await params;
  if (!id) return errorResponse("Source id is required");

  const { data: source, error: fetchError } = await auth.supabase
    .from("activity_sources")
    .select("id, title, source_url, raw_markdown, status")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return errorResponse(fetchError.message, 500);
  if (!source) return errorResponse("Source not found", 404);

  const rawMarkdown = typeof source.raw_markdown === "string" ? source.raw_markdown.trim() : "";
  if (!rawMarkdown) return errorResponse("Source Markdown is empty");

  await auth.supabase
    .from("activity_sources")
    .update({ status: "processing", error_message: null })
    .eq("id", id);

  try {
    const extracted = await extractActivitiesFromMarkdown(apiKey, {
      title: source.title,
      sourceUrl: source.source_url,
      rawMarkdown,
    });

    const localPayload = extracted.reusable_activities.map((item) => ({
      source_id: id,
      activity_key: item.activity_key,
      title: item.title,
      description: item.description,
      activity_type: item.activity_type,
      age_min: item.age_min,
      age_max: item.age_max,
      age_notes: item.age_notes,
      address: item.address,
      area: item.area,
      location_url: item.location_url,
      cost_level: item.cost_level,
      price_text: item.price_text,
      cost_notes: item.cost_notes,
      booking_required: item.booking_required,
      booking_notes: item.booking_notes,
      weather_fit: item.weather_fit,
      energy_level: item.energy_level,
      usual_duration_minutes: item.usual_duration_minutes,
      tags: item.tags,
      status: "active",
      is_evergreen: true,
    }));

    if (localPayload.length > 0) {
      const { error } = await auth.supabase
        .from("local_activities")
        .upsert(localPayload, { onConflict: "activity_key" });
      if (error) throw new Error(error.message);
    }

    const reusableKeys = extracted.seasonal_instances
      .map((item) => item.reusable_activity_key)
      .filter((key): key is string => Boolean(key));
    const { data: linkedActivities, error: linkedError } =
      reusableKeys.length > 0
        ? await auth.supabase
            .from("local_activities")
            .select("id, activity_key")
            .in("activity_key", reusableKeys)
        : { data: [], error: null };
    if (linkedError) throw new Error(linkedError.message);

    const activityIdByKey = new Map((linkedActivities ?? []).map((row) => [row.activity_key, row.id]));
    const seasonalPayload = extracted.seasonal_instances.map((item) => ({
      source_id: id,
      activity_id: item.reusable_activity_key ? activityIdByKey.get(item.reusable_activity_key) ?? null : null,
      instance_key: item.instance_key,
      season: item.season,
      title: item.title,
      description: item.description,
      valid_from: item.valid_from,
      valid_until: item.valid_until,
      occurrence_dates: item.occurrence_dates,
      time_text: item.time_text,
      address: item.address,
      area: item.area,
      cost_level: item.cost_level,
      price_text: item.price_text,
      cost_notes: item.cost_notes,
      booking_required: item.booking_required,
      booking_deadline: item.booking_deadline,
      booking_url: item.booking_url,
      weather_fit: item.weather_fit,
      energy_level: item.energy_level,
      age_min: item.age_min,
      age_max: item.age_max,
      age_notes: item.age_notes,
      tags: item.tags,
      status: "active",
      extraction_confidence: item.extraction_confidence,
    }));

    if (seasonalPayload.length > 0) {
      const { error } = await auth.supabase
        .from("seasonal_activity_instances")
        .upsert(seasonalPayload, { onConflict: "source_id,instance_key" });
      if (error) throw new Error(error.message);
    }

    const activitiesExtracted = localPayload.length + seasonalPayload.length;
    const { error: doneError } = await auth.supabase
      .from("activity_sources")
      .update({
        status: "processed",
        error_message: null,
        activities_extracted: activitiesExtracted,
        processed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (doneError) throw new Error(doneError.message);

    return NextResponse.json({
      success: true,
      reusable_activities: localPayload.length,
      seasonal_instances: seasonalPayload.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown activity extraction error";
    await auth.supabase
      .from("activity_sources")
      .update({
        status: "failed",
        error_message: message.slice(0, 800),
        processed_at: new Date().toISOString(),
      })
      .eq("id", id);
    return errorResponse(message, 500);
  }
}
