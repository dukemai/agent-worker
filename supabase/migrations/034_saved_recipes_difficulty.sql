-- Recipe cooking difficulty for planning and review.

ALTER TABLE public.saved_recipes
ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'medium';

ALTER TABLE public.saved_recipes
ADD CONSTRAINT saved_recipes_difficulty_chk
CHECK (difficulty IN ('easy', 'medium', 'hard'));

COMMENT ON COLUMN public.saved_recipes.difficulty IS
  'Cooking difficulty: easy, medium, or hard.';
