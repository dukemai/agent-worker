import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { cleanText, isOneOf } from "@/lib/trip-ops";
import {
  generateTripStoryContentScaffold,
  sanitizeStoryContentLeads,
  sanitizeStoryContentMaterials,
  tripStoryContentStyles,
  type TripStoryContentStyle,
} from "@/lib/trip-story-content";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) return auth.error;

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return errorResponse("GEMINI_API_KEY is not configured on the server.", 503);
  }

  const { id } = await params;
  const payload = await readRequestBody(request);
  if (payload.error) return payload.error;

  const subject = cleanText(payload.value.subject, 180);
  const area = cleanText(payload.value.area, 80);
  const contentStyle: TripStoryContentStyle = isOneOf(payload.value.content_style, tripStoryContentStyles)
    ? payload.value.content_style
    : "concise_trip_guide";
  const selectedMaterials = sanitizeStoryContentMaterials(payload.value.selected_materials);
  const selectedResearchLeads = sanitizeStoryContentLeads(payload.value.selected_research_leads);

  if (selectedMaterials.length === 0) return errorResponse("Select at least one story material");

  const { data: trip, error: tripError } = await auth.supabase
    .from("trips")
    .select("id, title, destination")
    .eq("id", id)
    .maybeSingle();
  if (tripError) return errorResponse(tripError.message, 500);
  if (!trip) return errorResponse("Trip not found", 404);

  let scaffold: Awaited<ReturnType<typeof generateTripStoryContentScaffold>>;
  try {
    scaffold = await generateTripStoryContentScaffold(apiKey, {
      tripTitle: trip.title,
      destination: trip.destination,
      subject: subject ?? null,
      area: area ?? null,
      style: contentStyle,
      selectedMaterials,
      selectedResearchLeads,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate story content";
    return errorResponse(message, 500);
  }

  const { data: content, error } = await auth.supabase
    .from("trip_story_contents")
    .insert({
      trip_id: id,
      subject: scaffold.subject || subject || getFallbackSubject(selectedMaterials, selectedResearchLeads),
      area: area ?? null,
      content_style: contentStyle,
      selected_materials: selectedMaterials,
      scaffold,
      status: "generated",
    })
    .select("*")
    .single();

  if (error || !content) {
    return errorResponse(error?.message ?? "Failed to save story content", 500);
  }

  return NextResponse.json({ content }, { status: 201 });
}

function getFallbackSubject(materials: ReturnType<typeof sanitizeStoryContentMaterials>, leads: ReturnType<typeof sanitizeStoryContentLeads>) {
  return leads[0]?.related_place ?? leads[0]?.title ?? materials[0]?.related_place ?? materials[0]?.title ?? "Selected destination story";
}

async function readRequestBody(request: Request): Promise<{ value: Record<string, unknown>; error?: never } | { value?: never; error: NextResponse }> {
  const text = await request.text();
  if (!text.trim()) return { value: {} };

  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { error: errorResponse("Request body must be an object", 400) };
    }
    return { value: parsed as Record<string, unknown> };
  } catch {
    return { error: errorResponse("Invalid JSON request body", 400) };
  }
}
