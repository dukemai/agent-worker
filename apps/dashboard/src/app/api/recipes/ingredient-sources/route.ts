import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { loadIngredientSourceIndex } from "@/lib/ingredient-source-server";

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  try {
    return NextResponse.json({ index: loadIngredientSourceIndex() });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to load ingredient sources",
      500,
    );
  }
}
