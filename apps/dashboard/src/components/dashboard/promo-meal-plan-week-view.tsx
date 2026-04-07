"use client";

import type { PromoMealPlanDay, PromoMealPlanResult } from "@agent/shared";
import { ChevronDown } from "lucide-react";
import { useCallback, useId, useState } from "react";
import type { PromoMealPlanResponseMeta } from "@/types/promo-meal-plan";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PromoMealPlanWeekViewProps = {
  plan: PromoMealPlanResult;
  meta: PromoMealPlanResponseMeta | null;
  /** When true, show a ribbon so this is not mistaken for a live AI response. */
  sample?: boolean;
  className?: string;
};

function mealToggleClass(active: boolean) {
  return active
    ? cn(
        "cursor-pointer rounded-md px-0.5 py-0.5 outline-none transition-colors -mx-0.5",
        "hover:bg-muted/45 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )
    : undefined;
}

function MealIngredientLines({ items }: { items: string[] }) {
  const lines = items.map((s) => s.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <div className="mt-1.5">
      <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">
        Ingredienser
      </p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs leading-snug text-foreground/88 marker:text-muted-foreground/80">
        {lines.map((line, i) => (
          <li key={`${i}-${line.slice(0, 28)}`}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

function MealPlanDayCard({ day }: { day: PromoMealPlanDay }) {
  const lunchCook = day.lunch_cooking_note?.trim() ?? "";
  const dinnerCook = day.dinner_cooking_note?.trim() ?? "";
  const hasLunchCooking = Boolean(lunchCook);
  const hasDinnerCooking = Boolean(dinnerCook);
  const [openLunch, setOpenLunch] = useState(false);
  const [openDinner, setOpenDinner] = useState(false);
  const baseId = useId();
  const lunchPanelId = `${baseId}-lunch`;
  const dinnerPanelId = `${baseId}-dinner`;

  const toggleLunch = useCallback(() => {
    if (hasLunchCooking) setOpenLunch((v) => !v);
  }, [hasLunchCooking]);
  const toggleDinner = useCallback(() => {
    if (hasDinnerCooking) setOpenDinner((v) => !v);
  }, [hasDinnerCooking]);

  return (
    <article
      role="listitem"
      className={cn(
        "flex w-[min(20rem,calc(100vw-3rem))] shrink-0 snap-start flex-col rounded-xl border border-border/80 bg-card p-3 shadow-sm ring-1 ring-black/5 dark:ring-white/10 sm:w-80",
        "max-h-[min(32rem,70vh)] overflow-y-auto",
      )}
    >
      <h4 className="text-sm font-semibold tracking-tight text-primary">{day.day_label}</h4>
      <div className="mt-3 flex flex-1 flex-col gap-3 text-sm">
        {day.breakfast?.trim() ? (
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
              Frukost
            </p>
            <p className="mt-0.5 leading-snug text-foreground/90">{day.breakfast}</p>
            <MealIngredientLines items={day.breakfast_ingredients ?? []} />
          </div>
        ) : null}
        <div className="space-y-1.5">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Lunch
          </p>
          <p className="leading-snug text-foreground/90">{day.lunch}</p>
          <MealIngredientLines items={day.lunch_ingredients ?? []} />
          {hasLunchCooking ? (
            <button
              type="button"
              className={cn(
                mealToggleClass(true),
                "w-full border-0 bg-transparent text-left font-inherit",
              )}
              aria-expanded={openLunch}
              aria-controls={lunchPanelId}
              aria-label={
                openLunch
                  ? `Dölj tillagning lunch ${day.day_label}`
                  : `Visa tillagning lunch ${day.day_label}`
              }
              onClick={toggleLunch}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[0.65rem] text-muted-foreground">
                  {openLunch ? "Dölj tillagning" : "Visa tillagning · lunch"}
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    openLunch && "rotate-180",
                  )}
                  aria-hidden
                />
              </div>
            </button>
          ) : null}
        </div>
        {hasLunchCooking ? (
          <div
            id={lunchPanelId}
            role="region"
            aria-label={`Tillagning lunch ${day.day_label}`}
            hidden={!openLunch}
          >
            <div className="rounded-md bg-muted/50 px-2 py-2">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                Tillagning · lunch
              </p>
              <p className="mt-1 text-xs leading-relaxed text-foreground/95 whitespace-pre-wrap">
                {lunchCook}
              </p>
            </div>
          </div>
        ) : null}
        <div className="space-y-1.5">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Middag
          </p>
          <p className="font-medium leading-snug text-foreground">{day.dinner}</p>
          <MealIngredientLines items={day.dinner_ingredients ?? []} />
          {hasDinnerCooking ? (
            <button
              type="button"
              className={cn(
                mealToggleClass(true),
                "w-full border-0 bg-transparent text-left font-inherit",
              )}
              aria-expanded={openDinner}
              aria-controls={dinnerPanelId}
              aria-label={
                openDinner
                  ? `Dölj tillagning middag ${day.day_label}`
                  : `Visa tillagning middag ${day.day_label}`
              }
              onClick={toggleDinner}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[0.65rem] text-muted-foreground">
                  {openDinner ? "Dölj tillagning" : "Visa tillagning · middag"}
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    openDinner && "rotate-180",
                  )}
                  aria-hidden
                />
              </div>
            </button>
          ) : null}
        </div>
        {hasDinnerCooking ? (
          <div
            id={dinnerPanelId}
            role="region"
            aria-label={`Tillagning middag ${day.day_label}`}
            hidden={!openDinner}
          >
            <div className="rounded-md bg-muted/50 px-2 py-2">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                Tillagning · middag
              </p>
              <p className="mt-1 text-xs leading-relaxed text-foreground/95 whitespace-pre-wrap">
                {dinnerCook}
              </p>
            </div>
          </div>
        ) : null}
      </div>
      {day.uses_promotion_titles.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1 border-t border-border/60 pt-2">
          {day.uses_promotion_titles.map((t) => (
            <Badge
              key={`${day.day_label}-${t}`}
              variant="outline"
              className="max-w-full truncate px-1.5 py-0 text-[0.65rem] font-normal"
              title={t}
            >
              {t}
            </Badge>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function formatGeneratedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("sv-SE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function PromoMealPlanWeekView({
  plan,
  meta,
  sample = false,
  className,
}: PromoMealPlanWeekViewProps) {
  return (
    <section
      className={cn("space-y-6", className)}
      aria-label={sample ? "Exempel på veckoplan" : "Veckoplan för måltider"}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {sample ? (
            <Badge variant="outline" className="border-amber-500/50 text-amber-800 dark:text-amber-200">
              Sample preview
            </Badge>
          ) : null}
          {meta ? (
            <Badge variant="secondary" className="font-semibold">
              ISO week {meta.iso_week}
            </Badge>
          ) : null}
        </div>
        {meta ? (
          <p className="text-xs text-muted-foreground">
            {sample ? "Example metadata · " : null}
            {!sample ? <>Generated {formatGeneratedAt(meta.generated_at)} · </> : null}
            {meta.promotion_count} offers · {meta.store_key}
          </p>
        ) : null}
      </div>

      <blockquote className="border-l-4 border-primary/35 bg-muted/30 py-3 pl-4 pr-3 text-base leading-relaxed text-foreground">
        {plan.intro}
      </blockquote>

      <div>
        <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Week at a glance</h3>
          <p className="text-[0.7rem] text-muted-foreground sm:text-xs">
            Scroll sideways — <span className="font-medium text-foreground/80">Ingredienser</span>{" "}
            listas under varje måltid; använd{" "}
            <span className="font-medium text-foreground/80">Visa tillagning</span> för lunch/middag
            när det finns steg.
          </p>
        </div>
        <div
          className={cn(
            "-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-2",
            "scroll-smooth [scrollbar-width:thin]",
          )}
        >
          <div
            className="flex w-max min-w-full snap-x snap-mandatory gap-3 pb-1"
            role="list"
            aria-label="Dagar i veckoplanen, scrolla horisontellt"
          >
            {plan.days.map((day, i) => (
              <MealPlanDayCard key={`${day.day_label}-${i}`} day={day} />
            ))}
          </div>
        </div>
      </div>

      {plan.shopping_reminders.length > 0 ? (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Inköp &amp; påminnelser</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {plan.shopping_reminders.map((line, idx) => (
                <li key={`rem-${idx}-${line.slice(0, 32)}`} className="flex gap-2.5">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary/70" aria-hidden />
                  <span className="leading-relaxed">{line}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
