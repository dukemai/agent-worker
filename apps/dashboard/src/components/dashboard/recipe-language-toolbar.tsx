"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/dashboard/locale-switcher";
import { useRecipeLocale } from "@/components/dashboard/recipe-locale-provider";
import {
  type AppLocale,
  type SavedRecipeWithI18n,
  recipeNeedsAiTranslation,
} from "@/lib/recipe-locale";

async function translateRecipeRequest(
  recipeId: string,
  target: "en" | "vi",
): Promise<{ recipe: SavedRecipeWithI18n }> {
  const res = await fetch(`/api/recipes/${encodeURIComponent(recipeId)}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale: target }),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? "Translation failed");
  }
  return res.json() as Promise<{ recipe: SavedRecipeWithI18n }>;
}

const TRANSLATE_HINT: Record<AppLocale, string | null> = {
  sv: null,
  en: "Translate recipe to English with AI (saves for next time).",
  vi: "Translate recipe to Vietnamese with AI (saves for next time).",
};

export function RecipeLanguageToolbar({
  recipeId,
  recipe,
  onTranslated,
  className,
}: {
  recipeId: string;
  recipe: SavedRecipeWithI18n;
  onTranslated: (recipe: SavedRecipeWithI18n) => void;
  className?: string;
}) {
  const { locale } = useRecipeLocale();
  const queryClient = useQueryClient();

  const translateMutation = useMutation({
    mutationFn: async () => {
      if (locale !== "en" && locale !== "vi") {
        throw new Error("Pick English or Vietnamese to translate.");
      }
      return translateRecipeRequest(recipeId, locale);
    },
    onSuccess: (data) => {
      onTranslated(data.recipe);
      void queryClient.invalidateQueries({ queryKey: ["saved-recipes"] });
      void queryClient.invalidateQueries({ queryKey: ["recipe", recipeId] });
    },
  });

  const needs = recipeNeedsAiTranslation(recipe, locale);
  const hint = TRANSLATE_HINT[locale];

  return (
    <div className={className}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Languages className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="text-xs font-medium text-muted-foreground">Recipe language</span>
          <LocaleSwitcher compact />
        </div>
        {locale !== "sv" && needs ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={translateMutation.isPending}
            onClick={() => void translateMutation.mutateAsync()}
          >
            {translateMutation.isPending
              ? "Translating…"
              : locale === "en"
                ? "Translate with AI (EN)"
                : "Translate with AI (VI)"}
          </Button>
        ) : null}
      </div>
      {hint && needs ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
      {translateMutation.error ? (
        <p className="mt-2 text-xs text-destructive">
          {translateMutation.error instanceof Error
            ? translateMutation.error.message
            : "Translation failed"}
        </p>
      ) : null}
    </div>
  );
}
