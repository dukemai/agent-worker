import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { extractTripKnowledge, getTripKnowledgeExtractionTags } from "@/lib/trip-knowledge-extraction";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) return auth.error;

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return errorResponse("GEMINI_API_KEY is not configured on the server.", 503);
  }

  const { id } = await params;
  const { data: knowledge, error: knowledgeError } = await auth.supabase
    .from("trip_knowledge_items")
    .select("*, trips!inner(id, title, destination)")
    .eq("id", id)
    .maybeSingle();

  if (knowledgeError) return errorResponse(knowledgeError.message, 500);
  if (!knowledge) return errorResponse("Trip knowledge not found", 404);
  if (!knowledge.raw_markdown?.trim()) {
    return errorResponse("Add markdown inspiration before extracting knowledge.");
  }

  let extraction: Awaited<ReturnType<typeof extractTripKnowledge>>;
  try {
    extraction = await extractTripKnowledge(apiKey, {
      tripTitle: knowledge.trips.title,
      destination: knowledge.trips.destination,
      knowledgeTitle: knowledge.title,
      sourceUrl: knowledge.source_url,
      rawMarkdown: knowledge.raw_markdown,
      focus: knowledge.extraction_focus ?? "both",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to extract trip knowledge";
    await auth.supabase
      .from("trip_knowledge_items")
      .update({ status: "failed", error_message: message })
      .eq("id", id);
    return errorResponse(message, 500);
  }

  const { data: updatedKnowledge, error: updateError } = await auth.supabase
    .from("trip_knowledge_items")
    .update({
      extraction,
      tags: getTripKnowledgeExtractionTags(extraction),
      status: "processed",
      error_message: null,
      extracted_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updateError || !updatedKnowledge) {
    return errorResponse(updateError?.message ?? "Failed to save extracted trip knowledge", 500);
  }

  return NextResponse.json({ knowledge: updatedKnowledge });
}
