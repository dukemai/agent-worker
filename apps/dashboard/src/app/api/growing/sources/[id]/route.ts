import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { id } = await params;
  if (!id) {
    return errorResponse("Source id is required");
  }

  const { data, error } = await auth.supabase
    .from("growing_sources")
    .select("id, url, title, channel, description, status, error_message, tips_extracted, created_at, processed_at, transcript")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return errorResponse(error.message, 500);
  }
  if (!data) {
    return errorResponse("Source not found", 404);
  }

  return NextResponse.json(data);
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { id } = await params;
  if (!id) {
    return errorResponse("Source id is required");
  }

  const payload = (await request.json()) as { transcript?: unknown; title?: unknown; channel?: unknown; description?: unknown };
  const transcript = payload.transcript === undefined
    ? undefined
    : payload.transcript === null || payload.transcript === ""
      ? null
      : typeof payload.transcript === "string"
        ? payload.transcript
        : undefined;
  const title = payload.title === undefined ? undefined : payload.title === null ? null : typeof payload.title === "string" ? payload.title : undefined;
  const channel = payload.channel === undefined ? undefined : payload.channel === null ? null : typeof payload.channel === "string" ? payload.channel : undefined;
  const description = payload.description === undefined ? undefined : payload.description === null ? null : typeof payload.description === "string" ? payload.description : undefined;

  const updates: Record<string, unknown> = {};
  if (transcript !== undefined) updates.transcript = transcript;
  if (title !== undefined) updates.title = title;
  if (channel !== undefined) updates.channel = channel;
  if (description !== undefined) updates.description = description;

  if (Object.keys(updates).length === 0) {
    return errorResponse("At least one of transcript, title, channel, description is required");
  }

  const { error } = await auth.supabase
    .from("growing_sources")
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
    return errorResponse("Source id is required");
  }

  const { error } = await auth.supabase.from("growing_sources").delete().eq("id", id);
  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ success: true });
}

export async function POST(_request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { id } = await params;
  if (!id) {
    return errorResponse("Source id is required");
  }

  const { data: source, error: fetchError } = await auth.supabase
    .from("growing_sources")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return errorResponse(fetchError.message, 500);
  }
  if (!source) {
    return errorResponse("Source not found", 404);
  }

  const workerUrl = process.env.GROWING_WORKER_URL;
  if (!workerUrl?.trim()) {
    return NextResponse.json(
      { success: false, error: "Manual extraction not configured (GROWING_WORKER_URL)" },
      { status: 503 }
    );
  }

  const processUrl = `${workerUrl.replace(/\/$/, "")}/process-growing`;
  const response = await fetch(processUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_id: id }),
  });

  const result = (await response.json()) as { success: boolean; tips_extracted?: number; error?: string };
  const status = response.ok ? 200 : response.status === 400 ? 400 : 502;
  return NextResponse.json(result, { status });
}
