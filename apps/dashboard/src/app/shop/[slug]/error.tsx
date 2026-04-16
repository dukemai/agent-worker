"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ShopPanel } from "@/components/shop/shop-panel";
import { Button } from "@/components/ui/button";

export default function ShopSlugError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[shop]", error);
  }, [error]);

  return (
    <ShopPanel>
      <div className="text-center font-serif">
        <h1 className="text-xl font-semibold italic text-stone-900">Something went wrong</h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-600">
          This page could not load the shopping list. Try again, or open the link from the person who
          shared it.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-stone-300 bg-white font-serif text-stone-800 hover:bg-stone-50"
            onClick={() => reset()}
          >
            Try again
          </Button>
          <Button
            asChild
            variant="secondary"
            className="bg-stone-600 font-serif text-stone-50 hover:bg-stone-700"
          >
            <Link href="/">Dashboard</Link>
          </Button>
        </div>
      </div>
    </ShopPanel>
  );
}
