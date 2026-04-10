-- Optional link to a similar published recipe (user-provided).

ALTER TABLE saved_recipes
ADD COLUMN similar_recipe_url TEXT NOT NULL DEFAULT '';
