import { NextRequest, NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { getUserHousehold } from "@/lib/household";

export async function GET(request: NextRequest) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const category = request.nextUrl.searchParams.get("category");
  const status = request.nextUrl.searchParams.get("status") || "active";

  let query = auth.supabase
    .from("birthdays")
    .select("*")
    .eq("status", status)
    .order("birthday_month", { ascending: true })
    .order("birthday_day", { ascending: true });

  if (category) {
    query = query.eq("category", category);
  }

  const { data: birthdays, error } = await query;

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ birthdays: birthdays ?? [] });
}

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const payload = await request.json();

  if (!payload.name || !payload.birthday_month || !payload.birthday_day || !payload.category) {
    return errorResponse("name, birthday_month, birthday_day, and category are required");
  }

  const household = await getUserHousehold(auth.supabase, auth.user.id);
  if (household.error) {
    return errorResponse(household.error.message, 500);
  }

  const { data: birthday, error } = await auth.supabase
    .from("birthdays")
    .insert({
      name: payload.name.trim(),
      birthday_month: parseInt(payload.birthday_month),
      birthday_day: parseInt(payload.birthday_day),
      birth_year: payload.birth_year ? parseInt(payload.birth_year) : null,
      category: payload.category,
      is_recurring: payload.is_recurring !== undefined ? payload.is_recurring : true,
      wishlist: payload.wishlist || null,
      notes: payload.notes || null,
      status: "active",
      household_id: household.household?.id ?? null,
    })
    .select("*")
    .single();

  if (error || !birthday) {
    return errorResponse(error?.message ?? "Failed to create birthday", 500);
  }

  return NextResponse.json({ birthday }, { status: 201 });
}
