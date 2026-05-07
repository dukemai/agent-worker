import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import {
  isUuid,
  parseVietnameseMealPatch,
  VIETNAMESE_MEAL_COLUMNS,
} from "@/lib/vietnamese-meals";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const { id } = await params;
  if (!isUuid(id)) {
    return errorResponse("Invalid id", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Expected JSON body", 400);
  }
  const parsed = parseVietnameseMealPatch(body);
  if ("error" in parsed) {
    return errorResponse(parsed.error, 400);
  }

  const { data, error } = await auth.supabase
    .from("vietnamese_meals")
    .update(parsed.patch)
    .eq("id", id)
    .eq("created_by", auth.user.id)
    .select(VIETNAMESE_MEAL_COLUMNS)
    .maybeSingle();

  if (error) {
    const statusCode = error.code === "23505" ? 409 : 500;
    return errorResponse(error.message, statusCode);
  }
  if (!data) {
    return errorResponse("Vietnamese meal not found", 404);
  }

  return NextResponse.json({ meal: data });
}

export async function DELETE(_: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const { id } = await params;
  if (!isUuid(id)) {
    return errorResponse("Invalid id", 400);
  }

  const { data, error } = await auth.supabase
    .from("vietnamese_meals")
    .delete()
    .eq("id", id)
    .eq("created_by", auth.user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return errorResponse(error.message, 500);
  }
  if (!data) {
    return errorResponse("Vietnamese meal not found", 404);
  }

  return NextResponse.json({ deleted: true, id });
}
