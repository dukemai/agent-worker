"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RECIPE_LOCALES, type AppLocale } from "@/lib/recipe-locale";
import { useRecipeLocale } from "@/components/dashboard/recipe-locale-provider";

const LABELS: Record<AppLocale, string> = {
  sv: "SV",
  en: "EN",
  vi: "VI",
};

export function LocaleSwitcher({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { locale, setLocale } = useRecipeLocale();

  return (
    <div
      className={cn(
        "inline-flex rounded-md border bg-muted/40 p-0.5",
        compact ? "text-xs" : "text-sm",
        className,
      )}
      role="group"
      aria-label="Recipe language"
    >
      {RECIPE_LOCALES.map((code) => (
        <Button
          key={code}
          type="button"
          variant={locale === code ? "secondary" : "ghost"}
          size={compact ? "sm" : "default"}
          className={cn(
            "h-7 px-2.5 font-medium",
            compact && "h-6 px-2 text-[0.7rem]",
            locale === code && "shadow-sm",
          )}
          onClick={() => setLocale(code)}
        >
          {LABELS[code]}
        </Button>
      ))}
    </div>
  );
}
