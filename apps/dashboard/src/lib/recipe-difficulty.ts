import type { RecipeDifficulty } from "@agent/shared";

export const RECIPE_DIFFICULTIES: RecipeDifficulty[] = ["easy", "medium", "hard"];

export const DEFAULT_RECIPE_DIFFICULTY: RecipeDifficulty = "medium";

export function normalizeRecipeDifficulty(value: unknown): RecipeDifficulty {
  return value === "easy" || value === "medium" || value === "hard"
    ? value
    : DEFAULT_RECIPE_DIFFICULTY;
}

export function formatRecipeDifficulty(value: unknown): string {
  const difficulty = normalizeRecipeDifficulty(value);
  if (difficulty === "easy") {
    return "Easy";
  }
  if (difficulty === "hard") {
    return "Hard";
  }
  return "Medium";
}
