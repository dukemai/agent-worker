-- Trip Ops preference catalog plus structured participant fields.

ALTER TABLE trips
  ADD COLUMN adult_count INT NOT NULL DEFAULT 0 CHECK (adult_count >= 0 AND adult_count <= 50),
  ADD COLUMN kid_count INT NOT NULL DEFAULT 0 CHECK (kid_count >= 0 AND kid_count <= 50),
  ADD COLUMN kid_ages INT[] NOT NULL DEFAULT '{}',
  ADD COLUMN selected_preferences TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN logistics_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN already_done_items JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE trip_preference_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (
    category IN ('pace', 'kids', 'weather', 'food', 'nature', 'culture', 'logistics', 'budget', 'planning')
  ),
  label TEXT NOT NULL,
  description TEXT,
  preference_text TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX trip_preference_suggestions_user_category_idx
  ON trip_preference_suggestions(user_id, category, active, sort_order);

CREATE TRIGGER trigger_trip_preference_suggestions_updated_at
  BEFORE UPDATE ON public.trip_preference_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_trip_ops_updated_at();

ALTER TABLE trip_preference_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own trip preference suggestions"
ON trip_preference_suggestions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

