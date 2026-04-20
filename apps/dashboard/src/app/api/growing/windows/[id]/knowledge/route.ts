import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import {
  fetchGrowingProfile,
  fetchGrowingWindowsByIds,
  generateWeeklySupportingKnowledge,
} from "@agent/shared";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { id } = await params;
  if (!id) {
    return errorResponse("window id is required");
  }

  const profile = await fetchGrowingProfile(auth.supabase);
  if (!profile) {
    return errorResponse("No growing profile found. Create a profile first.", 404);
  }

  const windows = await fetchGrowingWindowsByIds(auth.supabase, [id]);
  if (!windows.length) {
    return errorResponse("Growing window not found", 404);
  }

  try {
    const related = await generateWeeklySupportingKnowledge(auth.supabase, windows, profile, 3);
    return NextResponse.json({ knowledge: related[0]?.knowledge ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load related knowledge";
    return errorResponse(message, 500);
  }
}
