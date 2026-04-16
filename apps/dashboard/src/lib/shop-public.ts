import { createAnonSupabase } from "@/lib/supabase/anon";

export type PublicShopItem = {
  sort_order: number;
  label: string;
  quantity: string | null;
};

export type PublicShopPayload = {
  title: string;
  slug: string;
  items: PublicShopItem[];
};

export type PublicShopResult =
  | { ok: true; payload: PublicShopPayload }
  | { ok: false; kind: "not_found" }
  | { ok: false; kind: "error"; message: string };

/**
 * Loads a shared shopping list by public slug (anon RPC). Used by /shop/[slug] and metadata.
 */
export async function getSharedShopBySlug(slug: string): Promise<PublicShopResult> {
  const trimmed = slug?.trim();
  if (!trimmed) {
    return { ok: false, kind: "not_found" };
  }

  try {
    const supabase = createAnonSupabase();
    const { data, error } = await supabase.rpc("get_shared_shopping_list_by_slug", {
      p_slug: trimmed,
    });

    if (error) {
      return { ok: false, kind: "error", message: error.message };
    }

    if (data == null) {
      return { ok: false, kind: "not_found" };
    }

    const raw = data as Record<string, unknown>;
    const title = typeof raw.title === "string" ? raw.title : "";
    const payloadSlug = typeof raw.slug === "string" ? raw.slug : trimmed;
    const itemsRaw = raw.items;
    const items: PublicShopItem[] = Array.isArray(itemsRaw)
      ? itemsRaw.filter((x): x is PublicShopItem => {
          if (!x || typeof x !== "object") {
            return false;
          }
          const o = x as Record<string, unknown>;
          return typeof o.label === "string" && typeof o.sort_order === "number";
        })
      : [];

    return {
      ok: true,
      payload: {
        title: title || "Shopping list",
        slug: payloadSlug,
        items,
      },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, kind: "error", message };
  }
}
