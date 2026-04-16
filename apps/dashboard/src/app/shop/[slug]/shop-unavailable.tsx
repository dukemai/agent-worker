import Link from "next/link";
import { ShopPanel } from "@/components/shop/shop-panel";
import { Button } from "@/components/ui/button";

/** RPC or env failure — not a missing slug. */
export function ShopUnavailable({ message }: { message: string }) {
  return (
    <ShopPanel>
      <div className="text-center font-serif">
        <h1 className="text-xl font-semibold italic text-stone-900">Could not load list</h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-600">
          The shopping list service is not available right now. This is usually a configuration issue
          (for example Supabase URL/key or database migration not applied).
        </p>
        {process.env.NODE_ENV === "development" ? (
          <p className="mt-5 rounded border border-stone-300/80 bg-stone-200/40 p-3 text-left font-mono text-xs text-stone-700">
            {message}
          </p>
        ) : null}
        <div className="mt-8 flex justify-center">
          <Button
            asChild
            variant="outline"
            className="border-stone-300 bg-white font-serif text-stone-800 hover:bg-stone-50"
          >
            <Link href="/">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </ShopPanel>
  );
}
