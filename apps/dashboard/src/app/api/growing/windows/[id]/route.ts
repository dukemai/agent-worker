import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { id } = await params;
  if (!id) {
    return errorResponse("Window id is required");
  }

  const payload = (await request.json()) as { verified?: unknown; start_month?: unknown; end_month?: unknown };

  const updates: Record<string, unknown> = {};

  if (payload.verified !== undefined) {
    if (typeof payload.verified !== "boolean") {
      return errorResponse("verified must be a boolean");
    }
    updates.verified = payload.verified;
  }

  if (payload.start_month !== undefined) {
    const n = Number(payload.start_month);
    if (!Number.isInteger(n) || n < 1 || n > 12) {
      return errorResponse("start_month must be 1-12");
    }
    updates.start_month = n;
  }

  if (payload.end_month !== undefined) {
    const n = Number(payload.end_month);
    if (!Number.isInteger(n) || n < 1 || n > 12) {
      return errorResponse("end_month must be 1-12");
    }
    updates.end_month = n;
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse("At least one of verified, start_month, end_month is required");
  }

  const { error } = await auth.supabase
    .from("growing_windows")
    .update(updates)
    .eq("id", id);

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { id } = await params;
  if (!id) {
    return errorResponse("Window id is required");
  }

  const { error } = await auth.supabase.from("growing_windows").delete().eq("id", id);

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ success: true });
}
