import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

const LINE_STATES = new Set(["at_home", "need"]);

type LineInput = {
  label: string;
  quantity: string | null;
  line_state: "at_home" | "need";
  source_recipe_id: string | null;
};

function parseLines(raw: unknown): LineInput[] | { error: string } {
  if (!Array.isArray(raw)) {
    return { error: "lines must be an array" };
  }
  const out: LineInput[] = [];
  let i = 0;
  for (const row of raw) {
    if (!row || typeof row !== "object") {
      return { error: `Invalid line at index ${i}` };
    }
    const o = row as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label.trim() : "";
    const line_state = typeof o.line_state === "string" ? o.line_state.trim() : "";
    if (!label || label.length > 500) {
      return { error: `Line ${i}: label is required (max 500 chars)` };
    }
    if (!LINE_STATES.has(line_state)) {
      return { error: `Line ${i}: line_state must be at_home or need` };
    }
    let quantity: string | null = null;
    if (o.quantity !== undefined && o.quantity !== null) {
      if (typeof o.quantity !== "string") {
        return { error: `Line ${i}: quantity must be string or null` };
      }
      quantity = o.quantity.trim().slice(0, 120) || null;
    }
    let source_recipe_id: string | null = null;
    if (o.source_recipe_id !== undefined && o.source_recipe_id !== null) {
      if (typeof o.source_recipe_id !== "string") {
        return { error: `Line ${i}: source_recipe_id must be string or null` };
      }
      source_recipe_id = o.source_recipe_id.trim() || null;
    }
    out.push({
      label,
      quantity,
      line_state: line_state as LineInput["line_state"],
      source_recipe_id,
    });
    i += 1;
    if (i > 500) {
      return { error: "Too many lines" };
    }
  }
  return out;
}

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const { data, error } = await auth.supabase
    .from("shared_shopping_lists")
    .select("id, public_slug, title, source_cook_plan_id, created_at, updated_at")
    .eq("user_id", auth.user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ lists: data ?? [] });
}

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

  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const title = typeof o.title === "string" ? o.title.trim().slice(0, 200) : "";
  const sourceCookPlanId =
    o.sourceCookPlanId === null || o.sourceCookPlanId === undefined
      ? null
      : typeof o.sourceCookPlanId === "string"
        ? o.sourceCookPlanId.trim()
        : null;
  if (o.sourceCookPlanId !== null && o.sourceCookPlanId !== undefined && !sourceCookPlanId) {
    return errorResponse("sourceCookPlanId must be a non-empty string if set", 400);
  }

  const parsed = parseLines(o.lines);
  if ("error" in parsed) {
    return errorResponse(parsed.error, 400);
  }
  const lines = parsed;
  if (lines.length === 0) {
    return errorResponse("lines must include at least one row", 400);
  }

  if (sourceCookPlanId) {
    const { data: planRow } = await auth.supabase
      .from("cook_plans")
      .select("id")
      .eq("id", sourceCookPlanId)
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (!planRow) {
      return errorResponse("sourceCookPlanId not found", 404);
    }
  }

  const { data: list, error: insertListError } = await auth.supabase
    .from("shared_shopping_lists")
    .insert({
      user_id: auth.user.id,
      title: title || "Shopping list",
      source_cook_plan_id: sourceCookPlanId,
    })
    .select("id, public_slug, title, source_cook_plan_id, created_at, updated_at")
    .single();

  if (insertListError || !list) {
    return errorResponse(insertListError?.message ?? "Failed to create list", 500);
  }

  const rows = lines.map((line, index) => ({
    list_id: list.id,
    sort_order: index,
    label: line.label,
    quantity: line.quantity,
    line_state: line.line_state,
    source_recipe_id: line.source_recipe_id,
  }));

  const { error: itemsError } = await auth.supabase.from("shared_shopping_list_items").insert(rows);

  if (itemsError) {
    await auth.supabase.from("shared_shopping_lists").delete().eq("id", list.id);
    return errorResponse(itemsError.message, 500);
  }

  return NextResponse.json({ list });
}
