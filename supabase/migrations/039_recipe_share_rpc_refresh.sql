-- Ensure the public recipe-share RPC exists in deployed Supabase projects and
-- refresh PostgREST's schema cache so anon clients can call it immediately.

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

NOTIFY pgrst, 'reload schema';
