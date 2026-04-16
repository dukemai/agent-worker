import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { getCookbookOwnerUserId, isCookbookPublicConfigured, PUBLIC_COOKBOOK_RECIPE_COLUMNS } from "@/lib/cookbook-public";
import { createServiceRoleClient, isServiceRoleKeySameAsAnonKey } from "@/lib/supabase/service-role";

export async function GET() {
  if (isCookbookPublicConfigured()) {
    const ownerId = getCookbookOwnerUserId()!;
    const supabase = createServiceRoleClient();
    if (!supabase) {
      return errorResponse(
        isServiceRoleKeySameAsAnonKey()
          ? "SUPABASE_SERVICE_ROLE_KEY must be the service_role secret from Supabase (Settings → API), not the anon/publishable key."
          : "Server misconfiguration",
        503,
      );
    }
    const { data, error } = await supabase
      .from("saved_recipes")
      .select(PUBLIC_COOKBOOK_RECIPE_COLUMNS)
      .eq("user_id", ownerId)
      .order("created_at", { ascending: false });
    if (error) {
      return errorResponse(error.message, 500);
    }
    const recipes = data ?? [];
    if (process.env.NODE_ENV === "development" && recipes.length === 0) {
      console.warn(
        "[cookbook] Public list is empty for COOKBOOK_PUBLIC_USER_ID. " +
          "That UUID must be auth.users.id for the account that owns rows in saved_recipes, " +
          "and NEXT_PUBLIC_SUPABASE_URL must be the same project. Or unset the public env vars to use signed-in preview.",
        ownerId,
      );
    }

    return NextResponse.json({ recipes, mode: "public" as const });
  }

  const auth = await getAuthedSupabase();
  if (auth.supabase && auth.user) {
    const { data, error } = await auth.supabase
      .from("saved_recipes")
      .select(PUBLIC_COOKBOOK_RECIPE_COLUMNS)
      .order("created_at", { ascending: false });

    if (error) {
      return errorResponse(error.message, 500);
    }

    return NextResponse.json({ recipes: data ?? [], mode: "session_preview" as const });
  }

  return errorResponse(
    "Public cookbook is not configured. Add COOKBOOK_PUBLIC_USER_ID and SUPABASE_SERVICE_ROLE_KEY to .env.local for anonymous visitors, or sign in to preview your own library.",
    503,
  );
}
