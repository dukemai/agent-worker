-- Cached AI translations for recipe body (summary, ingredients, steps) + display title per locale.
ALTER TABLE public.saved_recipes
ADD COLUMN IF NOT EXISTS i18n JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.saved_recipes.i18n IS 'Optional { "en": {...}, "vi": {...} } with title, summary, ingredients[], steps[]';
