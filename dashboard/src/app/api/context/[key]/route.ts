import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

type Params = { params: Promise<{ key: string }> };

export async function GET(_: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { key } = await params;
  const { data, error } = await auth.supabase
    .from("family_context")
    .select("key, value, last_updated")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    return errorResponse(error.message, 500);
  }
  if (!data) {
    return errorResponse("Context key not found", 404);
  }

  return NextResponse.json(data);
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { key } = await params;
  const payload = (await request.json()) as { value?: unknown };
  if (typeof payload.value !== "string" || payload.value.trim().length === 0) {
    return errorResponse("value is required");
  }

  const { data, error } = await auth.supabase
    .from("family_context")
    .upsert(
      {
        key,
        value: payload.value.trim(),
        last_updated: new Date().toISOString(),
      },
      { onConflict: "key" }
    )
    .select("key, value, last_updated")
    .single();

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json(data);
}

export async function DELETE(_: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { key } = await params;
  const { data, error } = await auth.supabase
    .from("family_context")
    .delete()
    .eq("key", key)
    .select("key")
    .maybeSingle();

  if (error) {
    return errorResponse(error.message, 500);
  }
  if (!data) {
    return errorResponse("Context key not found", 404);
  }

  return NextResponse.json({ success: true });
}
