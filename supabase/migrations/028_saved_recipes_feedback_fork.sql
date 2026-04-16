-- Optional feedback after cooking; optional fork lineage for "my version" copies.
ALTER TABLE public.saved_recipes
ADD COLUMN IF NOT EXISTS forked_from_id UUID REFERENCES public.saved_recipes(id) ON DELETE SET NULL;

ALTER TABLE public.saved_recipes
ADD COLUMN IF NOT EXISTS easy_to_follow BOOLEAN;

ALTER TABLE public.saved_recipes
ADD COLUMN IF NOT EXISTS enjoy_rating SMALLINT;

ALTER TABLE public.saved_recipes
ADD CONSTRAINT saved_recipes_enjoy_rating_range_chk
CHECK (enjoy_rating IS NULL OR (enjoy_rating >= 1 AND enjoy_rating <= 5));

CREATE INDEX IF NOT EXISTS saved_recipes_forked_from_idx ON public.saved_recipes (forked_from_id)
WHERE forked_from_id IS NOT NULL;

COMMENT ON COLUMN public.saved_recipes.forked_from_id IS 'If set, this row was duplicated from another saved recipe (user fork).';
COMMENT ON COLUMN public.saved_recipes.easy_to_follow IS 'User feedback: was the recipe easy to follow? NULL = not set.';
COMMENT ON COLUMN public.saved_recipes.enjoy_rating IS 'User feedback: 1–5 how much they liked the result. NULL = not set.';
