-- Vietnamese meal catalog for recipe-first inspiration and future tourist surfaces.

CREATE TABLE public.vietnamese_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name_vi TEXT NOT NULL,
  name_en TEXT,
  slug TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  region_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  base_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  protein_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  method_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  flavor_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  meal_context_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  typical_ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  tourist_notes JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_confidence NUMERIC(3,2) NOT NULL DEFAULT 0.50
    CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (created_by, slug)
);

CREATE TABLE public.vietnamese_meal_recipe_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES public.vietnamese_meals(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.saved_recipes(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL DEFAULT 'inspired_by'
    CHECK (link_type IN ('canonical', 'variant', 'inspired_by')),
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (meal_id, recipe_id)
);

CREATE INDEX vietnamese_meals_created_by_status_idx
  ON public.vietnamese_meals(created_by, status, created_at DESC);
CREATE INDEX vietnamese_meals_created_by_slug_idx
  ON public.vietnamese_meals(created_by, slug);
CREATE INDEX vietnamese_meals_region_tags_idx
  ON public.vietnamese_meals USING GIN(region_tags);
CREATE INDEX vietnamese_meals_base_tags_idx
  ON public.vietnamese_meals USING GIN(base_tags);
CREATE INDEX vietnamese_meals_protein_tags_idx
  ON public.vietnamese_meals USING GIN(protein_tags);
CREATE INDEX vietnamese_meal_recipe_links_meal_idx
  ON public.vietnamese_meal_recipe_links(meal_id);
CREATE INDEX vietnamese_meal_recipe_links_recipe_idx
  ON public.vietnamese_meal_recipe_links(recipe_id);

ALTER TABLE public.vietnamese_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vietnamese_meal_recipe_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own Vietnamese meals"
ON public.vietnamese_meals
FOR ALL
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users manage own Vietnamese meal recipe links"
ON public.vietnamese_meal_recipe_links
FOR ALL
TO authenticated
USING (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1
    FROM public.vietnamese_meals vm
    WHERE vm.id = vietnamese_meal_recipe_links.meal_id
      AND vm.created_by = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM public.saved_recipes sr
    WHERE sr.id = vietnamese_meal_recipe_links.recipe_id
      AND sr.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1
    FROM public.vietnamese_meals vm
    WHERE vm.id = vietnamese_meal_recipe_links.meal_id
      AND vm.created_by = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM public.saved_recipes sr
    WHERE sr.id = vietnamese_meal_recipe_links.recipe_id
      AND sr.user_id = auth.uid()
  )
);

CREATE TRIGGER update_vietnamese_meals_updated_at
  BEFORE UPDATE ON public.vietnamese_meals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.vietnamese_meals IS
  'Canonical Vietnamese meal catalog used for recipe inspiration and future tourist food discovery.';
COMMENT ON TABLE public.vietnamese_meal_recipe_links IS
  'Links Vietnamese catalog meals to saved recipe rows as canonical, variant, or inspiration matches.';
