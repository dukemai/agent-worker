import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { createInviteToken, ensureUserHousehold } from "@/lib/household";

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const result = await ensureUserHousehold(auth.supabase, auth.user);
  if (result.error) {
    return errorResponse(result.error.message, 500);
  }
  if (result.member.role !== "owner") {
    return errorResponse("Only household owners can create invites.", 403);
  }

  const token = createInviteToken();
  const { data, error } = await auth.supabase
    .from("household_invites")
    .insert({
      household_id: result.household.id,
      token,
      role: "collaborator",
      created_by: auth.user.id,
      expires_at: null,
    })
    .select("id, token, role, email, expires_at, accepted_at, created_at")
    .single();

  if (error || !data) {
    return errorResponse(error?.message ?? "Failed to create invite", 500);
  }

  const url = new URL(request.url);
  const inviteUrl = `${url.origin}/invite/${token}`;

  return NextResponse.json({ invite: data, inviteUrl });
}
