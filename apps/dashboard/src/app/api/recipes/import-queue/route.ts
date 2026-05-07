import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import {
  parseCreateRecipeImportQueueBody,
  RECIPE_IMPORT_QUEUE_SELECT,
  withRecipeImportMarkdownPreview,
  type RecipeImportQueueRow,
} from "@/lib/recipe-import-queue";

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const { data, error } = await auth.supabase
    .from("recipe_import_queue")
    .select(RECIPE_IMPORT_QUEUE_SELECT)
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return errorResponse(error.message, 500);
  }

  const items = ((data ?? []) as RecipeImportQueueRow[]).map(withRecipeImportMarkdownPreview);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Expected JSON body", 400);
  }

  const parsed = parseCreateRecipeImportQueueBody(body);
  if ("error" in parsed) {
    return errorResponse(parsed.error, 400);
  }

  const { data, error } = await auth.supabase
    .from("recipe_import_queue")
    .insert({
      user_id: auth.user.id,
      source_url: parsed.source_url,
      source_label: parsed.source_label,
      source_markdown: parsed.source_markdown,
      status: "pending",
      attempts: 0,
      last_error: null,
    })
    .select(RECIPE_IMPORT_QUEUE_SELECT)
    .single();

  if (error) {
    return errorResponse(error.message, 500);
  }

  const item = withRecipeImportMarkdownPreview(data as RecipeImportQueueRow);
  return NextResponse.json({ item }, { status: 201 });
}
