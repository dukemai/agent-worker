-- Cook plan (queue of saved recipes) + shared shopping lists (opaque slug, public read via RPC).

-- One rolling plan per user (MVP).
CREATE TABLE cook_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX cook_plans_user_idx ON cook_plans(user_id);

CREATE TABLE cook_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES cook_plans(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES saved_recipes(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE (plan_id, recipe_id)
);

CREATE INDEX cook_plan_items_plan_idx ON cook_plan_items(plan_id);
CREATE INDEX cook_plan_items_recipe_idx ON cook_plan_items(recipe_id);

CREATE TABLE shared_shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  public_slug TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  title TEXT NOT NULL DEFAULT '',
  source_cook_plan_id UUID REFERENCES cook_plans(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX shared_shopping_lists_user_idx ON shared_shopping_lists(user_id);

CREATE TABLE shared_shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES shared_shopping_lists(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  label TEXT NOT NULL,
  quantity TEXT,
  line_state TEXT NOT NULL CHECK (line_state IN ('at_home', 'need', 'want')),
  source_recipe_id UUID REFERENCES saved_recipes(id) ON DELETE SET NULL
);

CREATE INDEX shared_shopping_list_items_list_idx ON shared_shopping_list_items(list_id);

-- updated_at
CREATE OR REPLACE FUNCTION public.handle_cook_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cook_plans_updated_at
  BEFORE UPDATE ON public.cook_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_cook_plans_updated_at();

CREATE OR REPLACE FUNCTION public.handle_shared_shopping_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_shared_shopping_lists_updated_at
  BEFORE UPDATE ON public.shared_shopping_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_shared_shopping_lists_updated_at();

-- RLS
ALTER TABLE cook_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE cook_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_shopping_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own cook plans"
ON cook_plans
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own cook plan items"
ON cook_plan_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM cook_plans p
    WHERE p.id = cook_plan_items.plan_id AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cook_plans p
    WHERE p.id = cook_plan_items.plan_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users manage own shared shopping lists"
ON shared_shopping_lists
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own shared shopping list items"
ON shared_shopping_list_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM shared_shopping_lists l
    WHERE l.id = shared_shopping_list_items.list_id AND l.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM shared_shopping_lists l
    WHERE l.id = shared_shopping_list_items.list_id AND l.user_id = auth.uid()
  )
);

-- Public read: only rows for the slug; no broad table SELECT for anon.
CREATE OR REPLACE FUNCTION public.get_shared_shopping_list_by_slug(p_slug text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT CASE
    WHEN l.id IS NULL THEN NULL
    ELSE jsonb_build_object(
      'title', l.title,
      'slug', l.public_slug,
      'items', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'sort_order', i.sort_order,
              'label', i.label,
              'quantity', i.quantity,
              'line_state', i.line_state
            )
            ORDER BY i.sort_order, i.id
          )
          FROM shared_shopping_list_items i
          WHERE i.list_id = l.id
            AND i.line_state IN ('need', 'want')
        ),
        '[]'::jsonb
      )
    )
  END
  FROM shared_shopping_lists l
  WHERE l.public_slug = p_slug
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_shared_shopping_list_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_shopping_list_by_slug(text) TO anon, authenticated;

COMMENT ON FUNCTION public.get_shared_shopping_list_by_slug(text) IS
  'Returns a public-safe JSON payload for a shared list by slug (need/want lines only).';
