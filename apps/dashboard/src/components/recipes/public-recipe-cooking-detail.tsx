"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChefHat,
  Clock,
  ExternalLink,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatRecipeDifficulty } from "@/lib/recipe-difficulty";
import {
  type AppLocale,
  getRecipeDisplayFields,
  type SavedRecipeWithI18n,
} from "@/lib/recipe-locale";
import type { SavedRecipeRow } from "@/lib/saved-recipe-row";
import { cn } from "@/lib/utils";

function markdownInline(text: string) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <span className="block [&:not(:first-child)]:mt-2">{children}</span>,
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-primary underline underline-offset-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

export function PublicRecipeCookingDetail({
  recipe,
  locale,
}: {
  recipe: SavedRecipeRow;
  foodTypeLabel: string;
  locale: AppLocale;
}) {
  const display = getRecipeDisplayFields(recipe as SavedRecipeWithI18n, locale);
  const [checkedSteps, setCheckedSteps] = useState<number[]>([]);
  const [checkedIngredients, setCheckedIngredients] = useState<number[]>([]);
  const [focusedStepIndex, setFocusedStepIndex] = useState(0);

  const totalSteps = display.steps.length;
  const effectiveFocusedStepIndex =
    totalSteps === 0 ? 0 : Math.min(focusedStepIndex, totalSteps - 1);
  const activeStep = totalSteps === 0 ? 0 : effectiveFocusedStepIndex + 1;
  const checkedSet = useMemo(() => new Set(checkedSteps), [checkedSteps]);
  const checkedIngredientSet = useMemo(() => new Set(checkedIngredients), [checkedIngredients]);

  function toggleStep(index: number) {
    setCheckedSteps((current) =>
      current.includes(index) ? current.filter((value) => value !== index) : [...current, index],
    );
  }

  function toggleIngredient(index: number) {
    setCheckedIngredients((current) =>
      current.includes(index) ? current.filter((value) => value !== index) : [...current, index],
    );
  }

  function setAllIngredientsChecked(total: number, checked: boolean) {
    setCheckedIngredients(checked ? Array.from({ length: total }, (_, index) => index) : []);
  }

  function focusPreviousStep() {
    setFocusedStepIndex((current) => Math.max(0, current - 1));
  }

  function focusNextStep() {
    setFocusedStepIndex((current) => Math.min(Math.max(totalSteps - 1, 0), current + 1));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-start gap-3">
            <ChefHat className="mt-1 size-9 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase text-muted-foreground">Cooking</p>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {display.title}
              </h2>
              {display.summary ? (
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{display.summary}</p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {recipe.estimated_cook_time.trim() ? (
              <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1">
                <Clock className="size-3.5" aria-hidden />
                {recipe.estimated_cook_time}
              </span>
            ) : null}
            <span className="rounded-full border px-2.5 py-1">
              {formatRecipeDifficulty(recipe.difficulty)}
            </span>
            {recipe.vegetarian ? <span className="rounded-full border px-2.5 py-1">Vegetarian</span> : null}
            <span className="rounded-full border px-2.5 py-1">
              Step {activeStep} of {Math.max(totalSteps, 1)}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-3 lg:min-w-72">
          <span className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5" aria-hidden />
            Shared recipe
          </span>
          {recipe.similar_recipe_url?.trim() ? (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href={recipe.similar_recipe_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" aria-hidden />
                Original link
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {display.showingSourceFallback && locale !== "sv" ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          Showing Swedish text for ingredients and steps until this recipe is translated.
        </p>
      ) : null}

      <Tabs defaultValue="steps" className="lg:hidden">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="steps">Steps</TabsTrigger>
          <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
        </TabsList>
        <TabsContent value="steps" className="pt-2">
          <CookingSteps
            steps={display.steps}
            checkedSet={checkedSet}
            focusedStepIndex={effectiveFocusedStepIndex}
            onFocusStep={setFocusedStepIndex}
            onPreviousStep={focusPreviousStep}
            onNextStep={focusNextStep}
            onToggleStep={toggleStep}
          />
        </TabsContent>
        <TabsContent value="ingredients" className="pt-2">
          <CookingIngredients
            ingredients={display.ingredients}
            checkedSet={checkedIngredientSet}
            onToggleIngredient={toggleIngredient}
            onSetAllIngredients={setAllIngredientsChecked}
          />
        </TabsContent>
      </Tabs>

      <div className="hidden grid-cols-[minmax(18rem,22rem)_1fr] gap-6 lg:grid">
        <aside className="sticky top-6 h-fit">
          <CookingIngredients
            ingredients={display.ingredients}
            checkedSet={checkedIngredientSet}
            onToggleIngredient={toggleIngredient}
            onSetAllIngredients={setAllIngredientsChecked}
          />
        </aside>
        <CookingSteps
          steps={display.steps}
          checkedSet={checkedSet}
          focusedStepIndex={effectiveFocusedStepIndex}
          onFocusStep={setFocusedStepIndex}
          onPreviousStep={focusPreviousStep}
          onNextStep={focusNextStep}
          onToggleStep={toggleStep}
        />
      </div>
    </div>
  );
}

function CookingIngredients({
  ingredients,
  checkedSet,
  onToggleIngredient,
  onSetAllIngredients,
}: {
  ingredients: SavedRecipeWithI18n["ingredients"];
  checkedSet: Set<number>;
  onToggleIngredient: (index: number) => void;
  onSetAllIngredients: (total: number, checked: boolean) => void;
}) {
  const checkedCount = ingredients.filter((_, index) => checkedSet.has(index)).length;
  const allChecked = ingredients.length > 0 && checkedCount === ingredients.length;

  return (
    <section className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold">Ingredients</h3>
            {ingredients.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {checkedCount}/{ingredients.length} at home
              </p>
            ) : null}
          </div>
          {ingredients.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => onSetAllIngredients(ingredients.length, !allChecked)}
            >
              {allChecked ? "Clear" : "All at home"}
            </Button>
          ) : null}
        </div>
      </div>
      <ul className="divide-y">
        {ingredients.length === 0 ? (
          <li className="px-4 py-3 text-sm text-muted-foreground">No ingredients saved.</li>
        ) : (
          ingredients.map((row, index) => {
            const checked = checkedSet.has(index);
            return (
              <li
                key={`shared-cook-ingredient-${index}`}
                className={cn(
                  "px-4 py-3 text-sm transition-colors",
                  checked ? "bg-emerald-50/70 dark:bg-emerald-950/25" : "",
                )}
              >
                <button
                  type="button"
                  className="flex w-full items-start gap-3 text-left"
                  onClick={() => onToggleIngredient(index)}
                  aria-pressed={checked}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border",
                      checked
                        ? "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
                        : "bg-background",
                    )}
                    aria-hidden
                  >
                    {checked ? <Check className="size-3.5" aria-hidden /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className={cn("block font-medium leading-snug", checked ? "text-muted-foreground" : "")}>
                      {row.ingredient_label || row.text || "Ingredient"}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {row.amount ? <span>{row.amount}</span> : null}
                      {row.text && row.text !== row.ingredient_label ? <span>{row.text}</span> : null}
                    </span>
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}

function CookingSteps({
  steps,
  checkedSet,
  focusedStepIndex,
  onFocusStep,
  onPreviousStep,
  onNextStep,
  onToggleStep,
}: {
  steps: string[];
  checkedSet: Set<number>;
  focusedStepIndex: number;
  onFocusStep: (index: number) => void;
  onPreviousStep: () => void;
  onNextStep: () => void;
  onToggleStep: (index: number) => void;
}) {
  const focusedStep = steps[focusedStepIndex] ?? "";
  const focusedChecked = checkedSet.has(focusedStepIndex);

  return (
    <section className="space-y-4">
      <h3 className="sr-only">Steps</h3>
      {steps.length === 0 ? (
        <div className="rounded-lg border bg-card px-4 py-5 text-sm text-muted-foreground">
          No cooking steps saved yet.
        </div>
      ) : (
        <>
          <article className="rounded-lg border bg-card p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Focused step</p>
                <h3 className="text-lg font-semibold">
                  Step {focusedStepIndex + 1} of {steps.length}
                </h3>
              </div>
              <Button
                type="button"
                variant={focusedChecked ? "secondary" : "outline"}
                size="sm"
                onClick={() => onToggleStep(focusedStepIndex)}
              >
                <Check className="size-4" aria-hidden />
                {focusedChecked ? "Done" : "Mark done"}
              </Button>
            </div>
            <div className="py-5 text-xl leading-relaxed sm:text-2xl">
              {markdownInline(focusedStep)}
            </div>
            <div className="flex items-center justify-between gap-3 border-t pt-3">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={focusedStepIndex === 0}
                onClick={onPreviousStep}
              >
                <ChevronLeft className="size-4" aria-hidden />
                Previous
              </Button>
              <Button
                type="button"
                className="gap-2"
                disabled={focusedStepIndex >= steps.length - 1}
                onClick={onNextStep}
              >
                Next
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            </div>
          </article>

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">All steps</p>
            {steps.map((step, index) => {
              const checked = checkedSet.has(index);
              const focused = index === focusedStepIndex;
              return (
                <article
                  key={`shared-cook-step-${index}`}
                  className={cn(
                    "rounded-lg border bg-card p-4 transition-colors",
                    checked
                      ? "border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-900/45 dark:bg-emerald-950/30"
                      : "",
                    focused && !checked ? "border-primary/40 bg-muted/35" : "",
                  )}
                >
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                        checked
                          ? "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
                          : "bg-background",
                      )}
                      onClick={() => onToggleStep(index)}
                      aria-label={
                        checked ? `Mark step ${index + 1} not done` : `Mark step ${index + 1} done`
                      }
                      aria-pressed={checked}
                    >
                      {checked ? <Check className="size-4" aria-hidden /> : index + 1}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className={cn("text-base leading-relaxed", checked ? "text-muted-foreground" : "")}>
                        {markdownInline(step)}
                      </div>
                      {!focused ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          className="mt-2 px-0"
                          onClick={() => onFocusStep(index)}
                        >
                          Focus
                        </Button>
                      ) : (
                        <p className="mt-2 text-xs font-medium text-primary">Focused</p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
