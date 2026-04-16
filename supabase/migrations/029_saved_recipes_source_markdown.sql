-- Optional raw markdown pasted when fulfilling a recipe from an external source.

ALTER TABLE public.saved_recipes
ADD COLUMN IF NOT EXISTS source_markdown TEXT NULL;

COMMENT ON COLUMN public.saved_recipes.source_markdown IS
  'Optional full markdown pasted from a trusted recipe source (blog, book site, etc.).';
