import { NextRequest, NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { id } = await params;
  const payload = await request.json();

  const updateData: any = {};
  if (payload.name !== undefined) updateData.name = payload.name.trim();
  if (payload.birthday_month !== undefined) updateData.birthday_month = parseInt(payload.birthday_month);
  if (payload.birthday_day !== undefined) updateData.birthday_day = parseInt(payload.birthday_day);
  if (payload.birth_year !== undefined) updateData.birth_year = payload.birth_year ? parseInt(payload.birth_year) : null;
  if (payload.category !== undefined) updateData.category = payload.category;
  if (payload.is_recurring !== undefined) updateData.is_recurring = payload.is_recurring;
  if (payload.wishlist !== undefined) updateData.wishlist = payload.wishlist;
  if (payload.notes !== undefined) updateData.notes = payload.notes;
  if (payload.status !== undefined) updateData.status = payload.status;

  const { data: birthday, error } = await auth.supabase
    .from("birthdays")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !birthday) {
    return errorResponse(error?.message ?? "Failed to update birthday", 500);
  }

  return NextResponse.json({ birthday });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { id } = await params;

  const { error } = await auth.supabase
    .from("birthdays")
    .delete()
    .eq("id", id);

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ success: true });
}
