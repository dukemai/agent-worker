"use client";

import type { PromoMealSuggestion, PromoMealSuggestionMealKind } from "@/lib/promo-meal-suggestions-sample";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const MEAL_KIND_LABEL: Record<PromoMealSuggestionMealKind, string> = {
  lunch: "Lunch",
  dinner: "Middag",
  either: "Lunch eller middag",
  snack: "Mellanmål / tillbehör",
  other: "Övrigt",
};

type PromoMealSuggestionsMockupProps = {
  suggestions: PromoMealSuggestion[];
  /** When true, show ribbon — data is illustrative until API exists */
  sample?: boolean;
  className?: string;
};

export function PromoMealSuggestionsMockup({
  suggestions,
  sample = false,
  className,
}: PromoMealSuggestionsMockupProps) {
  return (
    <section
      className={cn("space-y-4", className)}
      aria-label="Måltidsförslag från kampanjer"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            10 måltidsförslag
          </h3>
          <p className="mt-0.5 max-w-prose text-xs leading-snug text-muted-foreground sm:text-sm">
            Kortlista du kan handla efter — kopplad till dina importerade erbjudanden. (
            {suggestions.length} kort i mockupen.)
          </p>
          <p className="mt-1 text-[0.7rem] text-muted-foreground sm:text-xs">
            Scrolla åt sidan — samma horisontella spår som veckoplanen.
          </p>
        </div>
        {sample ? (
          <Badge
            variant="outline"
            className="w-fit shrink-0 border-amber-500/50 text-amber-900 dark:text-amber-100"
          >
            Mockup · exempeldata
          </Badge>
        ) : null}
      </div>

      <div
        className={cn(
          "-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-2",
          "scroll-smooth [scrollbar-width:thin]",
        )}
      >
        <ul
          className="flex w-max min-w-full list-none snap-x snap-mandatory gap-3 p-0 pb-1"
          role="list"
          aria-label="Måltidsförslag, scrolla horisontellt"
        >
          {suggestions.map((s) => (
            <li
              key={s.id}
              role="listitem"
              className={cn(
                "w-[min(20rem,calc(100vw-3rem))] shrink-0 snap-start sm:w-80",
              )}
            >
              <Card
                className={cn(
                  "flex h-full max-h-[min(32rem,70vh)] flex-col overflow-y-auto rounded-xl border-border/80 shadow-sm ring-1 ring-black/5 dark:ring-white/10",
                )}
              >
                <CardHeader className="space-y-2 pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-sm font-semibold leading-snug text-pretty pr-2">
                      {s.title}
                    </CardTitle>
                    <Badge variant="secondary" className="shrink-0 text-[0.65rem] font-medium">
                      {MEAL_KIND_LABEL[s.meal_kind]}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs leading-relaxed text-pretty">
                    {s.summary}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                      Ingredienser
                    </p>
                    <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs leading-snug text-foreground/90 marker:text-muted-foreground/80">
                      {s.ingredients.map((line, i) => (
                        <li key={`${s.id}-ing-${i}`}>{line}</li>
                      ))}
                    </ul>
                  </div>
                  {s.uses_promotion_titles.length > 0 ? (
                    <div>
                      <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                        Från erbjudanden
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {s.uses_promotion_titles.map((t) => (
                          <Badge
                            key={`${s.id}-${t}`}
                            variant="outline"
                            className="max-w-full truncate px-1.5 py-0 text-[0.65rem] font-normal"
                            title={t}
                          >
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
