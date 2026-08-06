import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

const text = (value: unknown, max = 500) => typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;
  const { data, error } = await auth.supabase.from("book_inspiration_sessions").select("*").order("updated_at", { ascending: false });
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ sessions: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) return auth.error;
  const body = await request.json() as Record<string, unknown>;
  const intention = text(body.intention, 1000);
  if (!intention) return errorResponse("intention is required");
  const brief = body.brief && typeof body.brief === "object" && !Array.isArray(body.brief) ? body.brief : {};
  const { data, error } = await auth.supabase.from("book_inspiration_sessions").insert({ user_id: auth.user.id, intention, brief }).select("*").single();
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ session: data }, { status: 201 });
}
