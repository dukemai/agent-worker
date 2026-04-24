import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, isServiceRoleKeySameAsAnonKey } from "@/lib/supabase/service-role";
import { errorResponse } from "@/lib/api";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = createServiceRoleClient();

  if (!supabase) {
    return errorResponse("Server configuration error (missing service role key)", 500);
  }

  const { data: birthday, error } = await supabase
    .from("birthdays")
    .select("name, birthday_month, birthday_day, wishlist, category")
    .eq("id", id)
    .single();

  if (error || !birthday) {
    return errorResponse("Birthday record not found", 404);
  }

  // Only allow public access to Close Circle
  if (!["family", "close_friend"].includes(birthday.category)) {
    return errorResponse("This record is not shareable", 403);
  }

  return NextResponse.json({ birthday });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const payload = await request.json();
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return errorResponse(
      isServiceRoleKeySameAsAnonKey()
        ? "SUPABASE_SERVICE_ROLE_KEY must be the service_role secret from Supabase (Settings → API), not the anon/publishable key."
        : "Server misconfiguration",
      503,
    );
  }

  // First verify it's a Close Circle record
  const { data: check, error: checkError } = await supabase
    .from("birthdays")
    .select("category")
    .eq("id", id)
    .single();

  if (checkError || !check) {
    return errorResponse("Birthday record not found", 404);
  }

  if (!["family", "close_friend"].includes(check.category)) {
    return errorResponse("This record is not shareable", 403);
  }

  const { data: updated, error: updateError } = await supabase
    .from("birthdays")
    .update({ wishlist: payload.wishlist })
    .eq("id", id)
    .select("name, wishlist")
    .single();

  if (updateError) {
    return errorResponse(updateError.message, 500);
  }

  return NextResponse.json({ birthday: updated });
}
