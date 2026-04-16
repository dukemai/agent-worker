"use client";

import { useCallback, useState } from "react";
import type { PublicShopItem } from "@/lib/shop-public";
import { cn } from "@/lib/utils";

export function ShopListItems({ items }: { items: PublicShopItem[] }) {
  const [checked, setChecked] = useState<Set<number>>(() => new Set());

  const toggle = useCallback((index: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  return (
    <ul className="mt-4 list-none divide-y divide-stone-200 font-serif" role="list">
      {items.map((item, i) => {
        const isChecked = checked.has(i);
        const id = `shop-item-${i}`;
        return (
          <li key={`${item.sort_order}-${i}`} className="flex items-start gap-3 py-3 text-stone-900">
            <input
              id={id}
              type="checkbox"
              checked={isChecked}
              onChange={() => toggle(i)}
              className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-stone-300 accent-stone-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-500"
            />
            <label
              htmlFor={id}
              className={cn(
                "min-w-0 flex-1 cursor-pointer select-none pt-px leading-snug",
                isChecked && "text-stone-500 line-through decoration-stone-400",
              )}
            >
              {item.label}
            </label>
          </li>
        );
      })}
    </ul>
  );
}
