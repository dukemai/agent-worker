"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChefHat,
  Clock,
  Lock,
  MonitorSmartphone,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { RecipeLanguageToolbar } from "@/components/dashboard/recipe-language-toolbar";
import { useRecipeLocale } from "@/components/dashboard/recipe-locale-provider";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatRecipeDifficulty } from "@/lib/recipe-difficulty";
import {
  getRecipeDisplayFields,
  type SavedRecipeWithI18n,
} from "@/lib/recipe-locale";
import { cn } from "@/lib/utils";
import {
  fetchRecipeForCooking,
  markRecipeTested,
  type RecipeCookPayload,
} from "@/components/recipes/recipe-cooking-api";

type RecipeCookingViewProps = {
  recipeId: string;
};

type WakeLockSentinelLike = {
  release: () => Promise<void>;
  addEventListener?: (type: "release", listener: () => void) => void;
};

const STEP_STORAGE_PREFIX = "dadops-recipe-cooking-steps";
const INGREDIENT_STORAGE_PREFIX = "dadops-recipe-cooking-ingredients";
const FOCUS_STEP_STORAGE_PREFIX = "dadops-recipe-cooking-focus-step";

function stepStorageKey(recipeId: string): string {
  return `${STEP_STORAGE_PREFIX}:${recipeId}`;
}

function ingredientStorageKey(recipeId: string): string {
  return `${INGREDIENT_STORAGE_PREFIX}:${recipeId}`;
}

function focusStepStorageKey(recipeId: string): string {
  return `${FOCUS_STEP_STORAGE_PREFIX}:${recipeId}`;
}

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

export function RecipeCookingView({ recipeId }: RecipeCookingViewProps) {
  const queryClient = useQueryClient();
  const { locale } = useRecipeLocale();
  const [checkedSteps, setCheckedSteps] = useState<number[]>([]);
  const [checkedIngredients, setCheckedIngredients] = useState<number[]>([]);
  const [focusedStepIndex, setFocusedStepIndex] = useState(0);
  const [wakeLock, setWakeLock] = useState<WakeLockSentinelLike | null>(null);
  const [wakeLockError, setWakeLockError] = useState<string | null>(null);

  const recipeQuery = useQuery({
    queryKey: ["recipe-cook", recipeId],
    queryFn: () => fetchRecipeForCooking(recipeId),
  });

  const testedMutation = useMutation({
    mutationFn: () => markRecipeTested(recipeId),
    onSuccess: async (recipe) => {
      queryClient.setQueryData<RecipeCookPayload>(["recipe-cook", recipeId], (old) =>
        old ? { ...old, recipe } : old,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["saved-recipes"] }),
        queryClient.invalidateQueries({ queryKey: ["recipe", recipeId] }),
      ]);
    },
  });

  const payload = recipeQuery.data;
  const recipe = payload?.recipe;
  const display = useMemo(
    () => (recipe ? getRecipeDisplayFields(recipe as SavedRecipeWithI18n, locale) : null),
    [recipe, locale],
  );

  const totalSteps = display?.steps.length ?? 0;
  const checkedSet = useMemo(() => new Set(checkedSteps), [checkedSteps]);
  const checkedIngredientSet = useMemo(() => new Set(checkedIngredients), [checkedIngredients]);
  const effectiveFocusedStepIndex =
    totalSteps === 0 ? 0 : Math.min(focusedStepIndex, totalSteps - 1);
  const activeStep = totalSteps === 0 ? 0 : effectiveFocusedStepIndex + 1;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(stepStorageKey(recipeId));
        const parsed = raw ? (JSON.parse(raw) as unknown) : [];
        if (Array.isArray(parsed)) {
          setCheckedSteps(parsed.filter((value): value is number => Number.isInteger(value)));
        }
      } catch {
        setCheckedSteps([]);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [recipeId]);

  useEffect(() => {
    window.localStorage.setItem(stepStorageKey(recipeId), JSON.stringify(checkedSteps));
  }, [checkedSteps, recipeId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(ingredientStorageKey(recipeId));
        const parsed = raw ? (JSON.parse(raw) as unknown) : [];
        if (Array.isArray(parsed)) {
          setCheckedIngredients(parsed.filter((value): value is number => Number.isInteger(value)));
        }
      } catch {
        setCheckedIngredients([]);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [recipeId]);

  useEffect(() => {
    window.localStorage.setItem(ingredientStorageKey(recipeId), JSON.stringify(checkedIngredients));
  }, [checkedIngredients, recipeId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(focusStepStorageKey(recipeId));
        const parsed = raw ? Number.parseInt(raw, 10) : 0;
        setFocusedStepIndex(Number.isInteger(parsed) && parsed >= 0 ? parsed : 0);
      } catch {
        setFocusedStepIndex(0);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [recipeId]);

  useEffect(() => {
    window.localStorage.setItem(focusStepStorageKey(recipeId), String(focusedStepIndex));
  }, [focusedStepIndex, recipeId]);

  useEffect(() => {
    return () => {
      void wakeLock?.release().catch(() => undefined);
    };
  }, [wakeLock]);

  function toggleStep(index: number) {
    setCheckedSteps((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
    );
  }

  function toggleIngredient(index: number) {
    setCheckedIngredients((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
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

  async function toggleWakeLock() {
    setWakeLockError(null);
    if (wakeLock) {
      await wakeLock.release();
      setWakeLock(null);
      return;
    }
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
    };
    if (!nav.wakeLock) {
      setWakeLockError("Screen lock is not available in this browser.");
      return;
    }
    try {
      const lock = await nav.wakeLock.request("screen");
      lock.addEventListener?.("release", () => setWakeLock(null));
      setWakeLock(lock);
    } catch {
      setWakeLockError("Could not keep the screen awake.");
    }
  }

  if (recipeQuery.isLoading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-sm text-muted-foreground">Loading cooking view...</p>
      </main>
    );
  }

  if (recipeQuery.error || !recipe || !display) {
    return (
      <main className="mx-auto max-w-4xl space-y-4 px-4 py-8">
        <p className="text-sm text-destructive">
          {recipeQuery.error instanceof Error ? recipeQuery.error.message : "Recipe not found"}
        </p>
        <Button asChild variant="outline">
          <Link href="/recipes?tab=cook">Back to recipes</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <Button asChild variant="ghost" size="sm" className="w-fit gap-2 px-0">
            <Link href="/recipes?tab=cook">
              <ArrowLeft className="size-4" aria-hidden />
              Recipes
            </Link>
          </Button>
          <div className="flex items-start gap-3">
            <ChefHat className="mt-1 size-9 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase text-muted-foreground">Cooking</p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {display.title}
              </h1>
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
          <RecipeLanguageToolbar
            className="rounded-md border bg-card p-3"
            recipeId={recipe.id}
            recipe={recipe as SavedRecipeWithI18n}
            onTranslated={(translated) => {
              queryClient.setQueryData<RecipeCookPayload>(["recipe-cook", recipeId], (old) =>
                old ? { ...old, recipe: translated as typeof recipe } : old,
              );
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={wakeLock ? "secondary" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => void toggleWakeLock()}
            >
              <MonitorSmartphone className="size-4" aria-hidden />
              {wakeLock ? "Screen awake" : "Keep awake"}
            </Button>
            {payload.canEditRecipe ? (
              <Button
                type="button"
                variant={recipe.tested ? "secondary" : "outline"}
                size="sm"
                className="gap-2"
                disabled={recipe.tested || testedMutation.isPending}
                onClick={() => testedMutation.mutate()}
              >
                <CheckCircle2 className="size-4" aria-hidden />
                {recipe.tested ? "Tested" : testedMutation.isPending ? "Saving..." : "Mark tested"}
              </Button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground">
                <Lock className="size-3.5" aria-hidden />
                Shared recipe
              </span>
            )}
          </div>
          {wakeLockError ? <p className="text-xs text-destructive">{wakeLockError}</p> : null}
          {testedMutation.error ? (
            <p className="text-xs text-destructive">
              {testedMutation.error instanceof Error
                ? testedMutation.error.message
                : "Could not update recipe"}
            </p>
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
    </main>
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
            <h2 className="text-base font-semibold">Ingredients</h2>
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
              key={`cook-ingredient-${index}`}
              className={cn(
                "px-4 py-3 text-sm transition-colors",
                checked
                  ? "bg-emerald-50/70 dark:bg-emerald-950/25"
                  : "",
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
      <h2 className="sr-only">Steps</h2>
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
                  key={`cook-step-${index}`}
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
                      <div
                        className={cn(
                          "text-base leading-relaxed",
                          checked ? "text-muted-foreground" : "",
                        )}
                      >
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
