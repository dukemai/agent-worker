import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { ensureUserHousehold } from "@/lib/household";

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const result = await ensureUserHousehold(auth.supabase, auth.user);
  if (result.error) {
    return errorResponse(result.error.message, 500);
  }

  const { data: members, error: membersError } = await auth.supabase
    .from("household_members")
    .select("id, household_id, user_id, role, display_name, created_at")
    .eq("household_id", result.household.id)
    .order("created_at", { ascending: true });

  if (membersError) {
    return errorResponse(membersError.message, 500);
  }

  return NextResponse.json({
    household: result.household,
    member: result.member,
    members: members ?? [],
  });
}
