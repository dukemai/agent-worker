import type { SupabaseClient, User } from "@supabase/supabase-js";

export type HouseholdRole = "owner" | "collaborator";

export type HouseholdRow = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type HouseholdMemberRow = {
  id: string;
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  display_name: string;
  created_at: string;
};

export async function getUserHousehold(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ household: HouseholdRow | null; member: HouseholdMemberRow | null; error: Error | null }> {
  const { data: member, error: memberError } = await supabase
    .from("household_members")
    .select("id, household_id, user_id, role, display_name, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (memberError) {
    return { household: null, member: null, error: new Error(memberError.message) };
  }
  if (!member) {
    return { household: null, member: null, error: null };
  }

  const { data: household, error: householdError } = await supabase
    .from("households")
    .select("id, name, created_by, created_at, updated_at")
    .eq("id", member.household_id)
    .maybeSingle();

  if (householdError) {
    return { household: null, member: null, error: new Error(householdError.message) };
  }

  return {
    household: (household as HouseholdRow | null) ?? null,
    member: member as HouseholdMemberRow,
    error: null,
  };
}

export async function ensureUserHousehold(
  supabase: SupabaseClient,
  user: User,
): Promise<{ household: HouseholdRow; member: HouseholdMemberRow; error: Error | null }> {
  const existing = await getUserHousehold(supabase, user.id);
  if (existing.error) {
    return { household: null as never, member: null as never, error: existing.error };
  }
  if (existing.household && existing.member) {
    return { household: existing.household, member: existing.member, error: null };
  }

  const emailName = user.email?.split("@")[0]?.trim() || "Family";
  const { data: household, error: householdError } = await supabase
    .from("households")
    .insert({
      name: `${emailName}'s family`,
      created_by: user.id,
    })
    .select("id, name, created_by, created_at, updated_at")
    .single();

  if (householdError || !household) {
    return {
      household: null as never,
      member: null as never,
      error: new Error(householdError?.message ?? "Failed to create household"),
    };
  }

  const { data: member, error: memberError } = await supabase
    .from("household_members")
    .insert({
      household_id: household.id,
      user_id: user.id,
      role: "owner",
      display_name: user.email ?? "",
    })
    .select("id, household_id, user_id, role, display_name, created_at")
    .single();

  if (memberError || !member) {
    return {
      household: null as never,
      member: null as never,
      error: new Error(memberError?.message ?? "Failed to create household member"),
    };
  }

  return {
    household: household as HouseholdRow,
    member: member as HouseholdMemberRow,
    error: null,
  };
}

export function createInviteToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}
