-- Saved AI-generated recipes (recipe generator, Phase 9).

CREATE TABLE saved_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  meal_kind TEXT NOT NULL DEFAULT 'other',
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  food_type_id TEXT NOT NULL,
  vegetarian BOOLEAN NOT NULL DEFAULT false,
  ingredient_picks JSONB NOT NULL DEFAULT '[]'::jsonb,
  tested BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'ai_generator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX saved_recipes_user_created_idx ON saved_recipes(user_id, created_at DESC);

ALTER TABLE saved_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own saved recipes"
ON saved_recipes
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
