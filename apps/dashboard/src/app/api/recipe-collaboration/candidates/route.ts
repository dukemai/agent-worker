import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { ensureUserHousehold, getUserHousehold } from "@/lib/household";

export type RecipeCandidateRow = {
  id: string;
  household_id: string;
  submitted_by: string;
  title: string;
  source_url: string | null;
  notes: string;
  raw_text: string;
  image_urls: string[];
  status: string;
  converted_recipe_id: string | null;
  created_at: string;
  updated_at: string;
};

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";
}

function cleanLongText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanUrl(value: unknown): string | null {
  const raw = cleanText(value, 600);
  if (!raw) {
    return null;
  }
  try {
    const url = new URL(raw);
    return url.toString();
  } catch {
    return null;
  }
}

function cleanImageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const urls = new Set<string>();
  for (const item of value) {
    const url = cleanUrl(item);
    if (url) {
      urls.add(url);
    }
    if (urls.size >= 6) {
      break;
    }
  }
  return Array.from(urls);
}

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const household = await getUserHousehold(auth.supabase, auth.user.id);
  if (household.error) {
    return errorResponse(household.error.message, 500);
  }
  if (!household.household) {
    return NextResponse.json({ candidates: [] satisfies RecipeCandidateRow[] });
  }

  const { data, error } = await auth.supabase
    .from("recipe_candidates")
    .select(
      "id, household_id, submitted_by, title, source_url, notes, raw_text, image_urls, status, converted_recipe_id, created_at, updated_at",
    )
    .eq("household_id", household.household.id)
    .order("created_at", { ascending: false });

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ candidates: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse("Expected JSON body", 400);
  }

  const title = cleanText(body.title, 180);
  if (!title) {
    return errorResponse("Title is required", 400);
  }

  const sourceUrl = cleanUrl(body.sourceUrl);
  const notes = cleanLongText(body.notes, 6000);
  const ingredientNotes = cleanLongText(body.ingredientNotes, 2000);
  const cookingNotes = cleanLongText(body.cookingNotes, 3000);
  const rawText = cleanLongText(body.rawText, 12000);
  const imageUrls = cleanImageUrls(body.imageUrls);
  const noteSections = [
    ingredientNotes ? `Ingredient notes:\n${ingredientNotes}` : "",
    cookingNotes ? `Cooking notes:\n${cookingNotes}` : "",
    notes ? `Recipe notes:\n${notes}` : "",
  ].filter(Boolean);
  const combinedNotes = noteSections.length > 0 ? noteSections.join("\n\n") : notes;

  const household = await ensureUserHousehold(auth.supabase, auth.user);
  if (household.error) {
    return errorResponse(household.error.message, 500);
  }

  const { data, error } = await auth.supabase
    .from("recipe_candidates")
    .insert({
      household_id: household.household.id,
      submitted_by: auth.user.id,
      title,
      source_url: sourceUrl,
      notes: combinedNotes,
      raw_text: rawText,
      image_urls: imageUrls,
      status: "new",
    })
    .select(
      "id, household_id, submitted_by, title, source_url, notes, raw_text, image_urls, status, converted_recipe_id, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    return errorResponse(error?.message ?? "Failed to create recipe candidate", 500);
  }

  return NextResponse.json({ candidate: data }, { status: 201 });
}
