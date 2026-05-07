"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { FoodStyleIngredientMappingManager } from "@/components/dashboard/food-style-ingredient-mapping-manager";
import { Button } from "@/components/ui/button";

export function FoodStyleIngredientMappingPage() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6">
      <Button asChild variant="ghost" className="gap-2">
        <Link href="/recipes?tab=manage">
          <ArrowLeft className="size-4" aria-hidden />
          Recipe library
        </Link>
      </Button>

      <FoodStyleIngredientMappingManager />
    </main>
  );
}
