import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { getCookbookOwnerUserId, isCookbookPublicConfigured, PUBLIC_COOKBOOK_RECIPE_COLUMNS } from "@/lib/cookbook-public";
import { createServiceRoleClient, isServiceRoleKeySameAsAnonKey } from "@/lib/supabase/service-role";

type Params = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  if (!id || !UUID_RE.test(id)) {
    return errorResponse("Invalid id", 400);
  }

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
      .eq("id", id)
      .eq("user_id", ownerId)
      .maybeSingle();

    if (error) {
      return errorResponse(error.message, 500);
    }
    if (!data) {
      return errorResponse("Recipe not found", 404);
    }

    return NextResponse.json({ recipe: data, mode: "public" as const });
  }

  const auth = await getAuthedSupabase();
  if (auth.supabase && auth.user) {
    const { data, error } = await auth.supabase
      .from("saved_recipes")
      .select(PUBLIC_COOKBOOK_RECIPE_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return errorResponse(error.message, 500);
    }
    if (!data) {
      return errorResponse("Recipe not found", 404);
    }

    return NextResponse.json({ recipe: data, mode: "session_preview" as const });
  }

  return errorResponse(
    "Public cookbook is not configured. Add COOKBOOK_PUBLIC_USER_ID and SUPABASE_SERVICE_ROLE_KEY to .env.local for anonymous visitors, or sign in to preview your own library.",
    503,
  );
}
