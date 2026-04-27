import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Expected JSON body", 400);
  }

  const token =
    body && typeof body === "object" && typeof (body as { token?: unknown }).token === "string"
      ? (body as { token: string }).token.trim()
      : "";
  if (!token) {
    return errorResponse("Invite token is required", 400);
  }

  const { data: invite, error: inviteError } = await auth.supabase
    .from("household_invites")
    .select("id, household_id, role, accepted_at, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (inviteError) {
    return errorResponse(inviteError.message, 500);
  }
  if (!invite) {
    return errorResponse("Invite not found", 404);
  }
  if (invite.accepted_at) {
    return errorResponse("Invite has already been accepted", 409);
  }
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return errorResponse("Invite has expired", 410);
  }

  const { data: member, error: memberError } = await auth.supabase
    .from("household_members")
    .upsert(
      {
        household_id: invite.household_id,
        user_id: auth.user.id,
        role: invite.role,
        display_name: auth.user.email ?? "",
      },
      { onConflict: "household_id,user_id" },
    )
    .select("id, household_id, user_id, role, display_name, created_at")
    .single();

  if (memberError || !member) {
    return errorResponse(memberError?.message ?? "Failed to join household", 500);
  }

  const { error: updateError } = await auth.supabase
    .from("household_invites")
    .update({
      accepted_by: auth.user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invite.id);

  if (updateError) {
    return errorResponse(updateError.message, 500);
  }

  return NextResponse.json({ member });
}
