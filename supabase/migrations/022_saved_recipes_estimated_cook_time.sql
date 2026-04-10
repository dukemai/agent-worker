-- Estimated cook time (Swedish-friendly text, e.g. "ca 35 min"), from AI or user edits.

ALTER TABLE saved_recipes
ADD COLUMN estimated_cook_time TEXT NOT NULL DEFAULT '';
