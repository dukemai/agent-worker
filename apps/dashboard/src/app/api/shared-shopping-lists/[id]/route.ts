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

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const { id } = await context.params;
  if (!id) {
    return errorResponse("Missing id", 400);
  }

  const { data: list, error: listError } = await auth.supabase
    .from("shared_shopping_lists")
    .select("id, public_slug, title, source_cook_plan_id, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (listError) {
    return errorResponse(listError.message, 500);
  }
  if (!list) {
    return errorResponse("Not found", 404);
  }

  const { data: items, error: itemsError } = await auth.supabase
    .from("shared_shopping_list_items")
    .select("id, sort_order, label, quantity, line_state, source_recipe_id")
    .eq("list_id", list.id)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (itemsError) {
    return errorResponse(itemsError.message, 500);
  }

  return NextResponse.json({ list, items: items ?? [] });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const { id } = await context.params;
  if (!id) {
    return errorResponse("Missing id", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Expected JSON body", 400);
  }

  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  const { data: list, error: listError } = await auth.supabase
    .from("shared_shopping_lists")
    .select("id")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (listError) {
    return errorResponse(listError.message, 500);
  }
  if (!list) {
    return errorResponse("Not found", 404);
  }

  const title =
    typeof o.title === "string" ? o.title.trim().slice(0, 200) : undefined;

  let lines: LineInput[] | undefined;
  if (o.lines !== undefined) {
    const parsed = parseLines(o.lines);
    if ("error" in parsed) {
      return errorResponse(parsed.error, 400);
    }
    lines = parsed;
  }

  if (title !== undefined) {
    const { error: uErr } = await auth.supabase
      .from("shared_shopping_lists")
      .update({ title: title || "Shopping list" })
      .eq("id", id);
    if (uErr) {
      return errorResponse(uErr.message, 500);
    }
  }

  if (lines !== undefined) {
    if (lines.length === 0) {
      return errorResponse("lines must include at least one row", 400);
    }
    const { error: delErr } = await auth.supabase
      .from("shared_shopping_list_items")
      .delete()
      .eq("list_id", id);
    if (delErr) {
      return errorResponse(delErr.message, 500);
    }
    const rows = lines.map((line, index) => ({
      list_id: id,
      sort_order: index,
      label: line.label,
      quantity: line.quantity,
      line_state: line.line_state,
      source_recipe_id: line.source_recipe_id,
    }));
    const { error: insErr } = await auth.supabase.from("shared_shopping_list_items").insert(rows);
    if (insErr) {
      return errorResponse(insErr.message, 500);
    }
  }

  const { data: listOut, error: listOutError } = await auth.supabase
    .from("shared_shopping_lists")
    .select("id, public_slug, title, source_cook_plan_id, created_at, updated_at")
    .eq("id", id)
    .single();

  if (listOutError || !listOut) {
    return errorResponse(listOutError?.message ?? "Reload failed", 500);
  }

  const { data: itemsOut, error: itemsOutError } = await auth.supabase
    .from("shared_shopping_list_items")
    .select("id, sort_order, label, quantity, line_state, source_recipe_id")
    .eq("list_id", id)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (itemsOutError) {
    return errorResponse(itemsOutError.message, 500);
  }

  return NextResponse.json({ list: listOut, items: itemsOut ?? [] });
}
