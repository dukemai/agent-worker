import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { canUserAccessRecipe } from "@/lib/recipe-collaboration-search";
import { SAVED_RECIPE_COLUMNS } from "@/lib/saved-recipe-columns";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type Params = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const { id } = await params;
  if (!id || !UUID_RE.test(id)) {
    return errorResponse("Invalid id", 400);
  }

  const access = await canUserAccessRecipe(auth.supabase, auth.user, id);
  if (access.error) {
    return errorResponse(access.error.message, 500);
  }
  if (!access.canAccess) {
    return errorResponse("Recipe not found", 404);
  }

  const serviceSupabase = createServiceRoleClient();
  const supabase = serviceSupabase ?? auth.supabase;
  const { data, error } = await supabase
    .from("saved_recipes")
    .select(`${SAVED_RECIPE_COLUMNS}, user_id`)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return errorResponse(error.message, 500);
  }
  if (!data) {
    return errorResponse("Recipe not found", 404);
  }

  const { user_id: userId, ...recipe } = data as Record<string, unknown>;

  return NextResponse.json({
    recipe,
    canEditRecipe: userId === auth.user.id,
  });
}
