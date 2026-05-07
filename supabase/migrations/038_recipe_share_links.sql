-- Read-only recipe and food-style share links.

CREATE TABLE public.recipe_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  public_slug TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('recipe', 'food_style')),
  recipe_id UUID REFERENCES public.saved_recipes(id) ON DELETE CASCADE,
  food_type_id TEXT,
  title TEXT NOT NULL DEFAULT '',
  disabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT recipe_share_links_scope_target_chk CHECK (
    (scope_type = 'recipe' AND recipe_id IS NOT NULL AND food_type_id IS NULL)
    OR
    (scope_type = 'food_style' AND recipe_id IS NULL AND food_type_id IS NOT NULL)
  )
);

CREATE INDEX recipe_share_links_user_idx
  ON public.recipe_share_links(user_id, updated_at DESC);

CREATE UNIQUE INDEX recipe_share_links_active_recipe_idx
  ON public.recipe_share_links(user_id, recipe_id)
  WHERE disabled_at IS NULL AND scope_type = 'recipe';

CREATE UNIQUE INDEX recipe_share_links_active_food_style_idx
  ON public.recipe_share_links(user_id, food_type_id)
  WHERE disabled_at IS NULL AND scope_type = 'food_style';

CREATE OR REPLACE FUNCTION public.handle_recipe_share_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recipe_share_links_updated_at
  BEFORE UPDATE ON public.recipe_share_links
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_recipe_share_links_updated_at();

ALTER TABLE public.recipe_share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own recipe share links"
ON public.recipe_share_links
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_recipe_share_by_slug(p_slug text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT CASE
    WHEN l.id IS NULL THEN NULL
    ELSE jsonb_build_object(
      'share', jsonb_build_object(
        'id', l.id,
        'slug', l.public_slug,
        'scope_type', l.scope_type,
        'recipe_id', l.recipe_id,
        'food_type_id', l.food_type_id,
        'title', l.title,
        'created_at', l.created_at
      ),
      'recipes', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', r.id,
              'title', r.title,
              'title_en', r.title_en,
              'title_vi', r.title_vi,
              'summary', r.summary,
              'meal_kind', r.meal_kind,
              'ingredients', r.ingredients,
              'steps', r.steps,
              'food_type_id', r.food_type_id,
              'vegetarian', r.vegetarian,
              'ingredient_picks', r.ingredient_picks,
              'tested', r.tested,
              'want_to_try', r.want_to_try,
              'estimated_cook_time', r.estimated_cook_time,
              'difficulty', r.difficulty,
              'source', r.source,
              'similar_recipe_url', r.similar_recipe_url,
              'created_at', r.created_at,
              'i18n', r.i18n,
              'forked_from_id', r.forked_from_id
            )
            ORDER BY r.title
          )
          FROM public.saved_recipes r
          WHERE r.user_id = l.user_id
            AND (
              (l.scope_type = 'recipe' AND r.id = l.recipe_id)
              OR
              (l.scope_type = 'food_style' AND r.food_type_id = l.food_type_id)
            )
        ),
        '[]'::jsonb
      )
    )
  END
  FROM public.recipe_share_links l
  WHERE l.public_slug = p_slug
    AND l.disabled_at IS NULL
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_recipe_share_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recipe_share_by_slug(text) TO anon, authenticated;

COMMENT ON FUNCTION public.get_recipe_share_by_slug(text) IS
  'Returns a public-safe read-only recipe share payload by opaque slug.';
