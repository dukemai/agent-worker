import Link from "next/link";
import { ShopPanel } from "@/components/shop/shop-panel";
import { Button } from "@/components/ui/button";

export default function ShopNotFound() {
  return (
    <ShopPanel>
      <div className="text-center font-serif">
        <h1 className="text-xl font-semibold italic text-stone-900">List not found</h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-600">
          This link does not match a shopping list, or it may have been removed. Ask the owner for an
          updated link.
        </p>
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
