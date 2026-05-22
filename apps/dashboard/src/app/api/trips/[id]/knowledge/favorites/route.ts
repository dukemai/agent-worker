import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { cleanText, isOneOf } from "@/lib/trip-ops";

const favoriteTypes = ["place", "activity"] as const;

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) return auth.error;

  const { id } = await params;
  const payload = await request.json();
  if (!isOneOf(payload.item_type, favoriteTypes)) return errorResponse("Invalid favorite item_type");

  const name = cleanText(payload.name, 180);
  const area = cleanText(payload.area, 120) ?? "Unknown area";
  if (!name) return errorResponse("name is required");

  const { data: trip, error: tripError } = await auth.supabase
    .from("trips")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (tripError) return errorResponse(tripError.message, 500);
  if (!trip) return errorResponse("Trip not found", 404);

  const { data: favorite, error } = await auth.supabase
    .from("trip_knowledge_favorites")
    .upsert(
      {
        trip_id: id,
        item_type: payload.item_type,
        name,
        area,
      },
      { onConflict: "trip_id,item_type,name,area" }
    )
    .select("*")
    .single();

  if (error || !favorite) {
    return errorResponse(error?.message ?? "Failed to save knowledge favorite", 500);
  }

  return NextResponse.json({ favorite }, { status: 201 });
}
