"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  RECIPE_LOCALE_STORAGE_KEY,
  type AppLocale,
  parseAppLocale,
} from "@/lib/recipe-locale";

type RecipeLocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
};

const RecipeLocaleContext = createContext<RecipeLocaleContextValue | null>(null);

/** Recipe-only UI language (SV/EN/VI). Wrap recipe generator and cooking views — not the whole dashboard. */
export function RecipeLocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("sv");

  useEffect(() => {
    try {
      const stored = parseAppLocale(localStorage.getItem(RECIPE_LOCALE_STORAGE_KEY));
      setLocaleState(stored);
    } catch {
      /* ignore */
    }
  }, []);

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(RECIPE_LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return (
    <RecipeLocaleContext.Provider value={value}>{children}</RecipeLocaleContext.Provider>
  );
}

export function useRecipeLocale(): RecipeLocaleContextValue {
  const ctx = useContext(RecipeLocaleContext);
  if (!ctx) {
    throw new Error("useRecipeLocale must be used within RecipeLocaleProvider");
  }
  return ctx;
}
