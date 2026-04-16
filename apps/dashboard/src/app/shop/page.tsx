import type { Metadata } from "next";
import Link from "next/link";
import { ShopPanel } from "@/components/shop/shop-panel";

export const metadata: Metadata = {
  title: "Shared shopping list",
  description: "Open a shared shopping list from the link you received.",
};

export default function ShopIndexPage() {
  return (
    <ShopPanel>
      <div className="text-center font-serif">
        <h1 className="text-xl font-semibold italic leading-snug text-stone-900">Need a link</h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-600">
          This address needs a list code in the URL — the same as in the link someone shared, for
          example{" "}
          <span className="rounded bg-stone-200/80 px-1.5 py-0.5 font-mono text-xs text-stone-800">
            /shop/…
          </span>
          .
        </p>
        <p className="mt-8">
          <Link
            href="/"
            className="text-sm font-medium text-stone-700 underline decoration-stone-400/80 underline-offset-4 hover:text-stone-900"
          >
            Back to dashboard
          </Link>
        </p>
      </div>
    </ShopPanel>
  );
}
