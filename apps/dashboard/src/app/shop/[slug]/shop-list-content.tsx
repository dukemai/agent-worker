import type { PublicShopPayload } from "@/lib/shop-public";
import { ShopListItems } from "@/components/shop/shop-list-items";
import { ShopPanel } from "@/components/shop/shop-panel";

export function ShopListContent({ payload }: { payload: PublicShopPayload }) {
  const items = payload.items ?? [];

  return (
    <ShopPanel>
      <header className="border-b border-stone-200 pb-4">
        <p className="font-serif text-[0.7rem] font-medium uppercase tracking-[0.2em] text-stone-500">
          Shopping list
        </p>
        <h1 className="mt-2 font-serif text-2xl font-semibold italic leading-tight tracking-tight text-stone-900 sm:text-[1.65rem]">
          {payload.title}
        </h1>
      </header>

      {items.length === 0 ? (
        <p className="mt-5 font-serif text-sm leading-relaxed text-stone-600">
          Nothing to buy on this list right now.
        </p>
      ) : (
        <ShopListItems items={items} />
      )}
    </ShopPanel>
  );
}
