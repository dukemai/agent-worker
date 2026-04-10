"use client";

import type { PromoMealPlanMeal, PromoMealPlanMealKind, PromoMealPlanResult } from "@agent/shared";
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

const MEAL_KIND_LABEL: Record<PromoMealPlanMealKind, string> = {
  lunch: "Lunch",
  dinner: "Middag",
  either: "Lunch eller middag",
  snack: "Mellanmål",
  other: "Övrigt",
};

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

function MealPlanMealCard({ meal, index }: { meal: PromoMealPlanMeal; index: number }) {
  const cook = meal.cooking_note?.trim() ?? "";
  const hasCooking = Boolean(cook);
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const toggle = useCallback(() => {
    if (hasCooking) setOpen((v) => !v);
  }, [hasCooking]);

  return (
    <article
      role="listitem"
      className={cn(
        "flex w-[min(20rem,calc(100vw-3rem))] shrink-0 snap-start flex-col rounded-xl border border-border/80 bg-card p-3 shadow-sm ring-1 ring-black/5 dark:ring-white/10 sm:w-80",
        "max-h-[min(36rem,75vh)] overflow-y-auto",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.65rem] font-semibold tabular-nums text-muted-foreground">
          {index + 1}/10
        </p>
        <Badge variant="secondary" className="shrink-0 text-[0.65rem] font-medium">
          {MEAL_KIND_LABEL[meal.meal_kind]}
        </Badge>
      </div>
      <h4 className="mt-1 text-sm font-semibold leading-snug tracking-tight text-primary">
        {meal.title}
      </h4>
      {meal.cuisine_style ? (
        <p className="mt-0.5 text-[0.65rem] text-muted-foreground">{meal.cuisine_style}</p>
      ) : null}
      <p className="mt-2 text-sm leading-snug text-foreground/90">{meal.summary}</p>
      <MealIngredientLines items={meal.ingredients ?? []} />
      {hasCooking ? (
        <button
          type="button"
          className={cn(
            "mt-2 w-full border-0 bg-transparent text-left font-inherit",
            "cursor-pointer rounded-md px-0.5 py-1 outline-none transition-colors -mx-0.5",
            "hover:bg-muted/45 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? "Dölj tillagning" : "Visa tillagning"}
          onClick={toggle}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[0.65rem] text-muted-foreground">
              {open ? "Dölj tillagning" : "Visa tillagning"}
            </span>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </div>
        </button>
      ) : null}
      {hasCooking ? (
        <div id={panelId} role="region" aria-label="Tillagning" hidden={!open}>
          <div className="mt-2 rounded-md bg-muted/50 px-2 py-2">
            <p className="text-xs leading-relaxed text-foreground/95 whitespace-pre-wrap">{cook}</p>
          </div>
        </div>
      ) : null}
      {meal.uses_promotion_titles.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1 border-t border-border/60 pt-2">
          {meal.uses_promotion_titles.map((t) => (
            <Badge
              key={`${meal.title}-${t}`}
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
      aria-label={sample ? "Exempel på måltidsförslag" : "Måltidsförslag från kampanjer"}
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
            {meta.run_id ? (
              <>
                {" "}
                · run{" "}
                <code className="rounded bg-muted px-1 text-[0.65rem]" title={meta.run_id}>
                  {meta.run_id.slice(0, 8)}…
                </code>
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      <blockquote className="border-l-4 border-primary/35 bg-muted/30 py-3 pl-4 pr-3 text-base leading-relaxed text-foreground">
        {plan.intro}
      </blockquote>

      <div>
        <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">10 måltidsförslag</h3>
          <p className="text-[0.7rem] text-muted-foreground sm:text-xs">
            Scroll sideways — varje kort är en rätt med ingredienser i Sverige; kampanjer kan vara
            del av inköpslistan.
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
            aria-label="Tio måltider, scrolla horisontellt"
          >
            {plan.meals.map((meal, i) => (
              <MealPlanMealCard key={`${meal.title}-${i}`} meal={meal} index={i} />
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
