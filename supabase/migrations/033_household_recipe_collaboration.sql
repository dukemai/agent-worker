-- Household collaboration foundation: invite members and review recipe candidates together.

CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Family',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'collaborator')),
  display_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (household_id, user_id)
);

CREATE TABLE household_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'collaborator' CHECK (role IN ('collaborator')),
  email TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE recipe_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_url TEXT,
  notes TEXT NOT NULL DEFAULT '',
  raw_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'want_to_try', 'looks_good', 'needs_changes', 'accepted', 'rejected')),
  converted_recipe_id UUID REFERENCES saved_recipes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE recipe_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES saved_recipes(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES recipe_candidates(id) ON DELETE CASCADE,
  reviewer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (
    status IN ('want_to_try', 'looks_good', 'needs_changes', 'tested_keep', 'tested_skip')
  ),
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (recipe_id IS NOT NULL OR candidate_id IS NOT NULL)
);

ALTER TABLE saved_recipes
  ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE SET NULL;

ALTER TABLE birthdays
  ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE SET NULL;

CREATE INDEX households_created_by_idx ON households(created_by);
CREATE INDEX household_members_user_idx ON household_members(user_id);
CREATE INDEX household_members_household_idx ON household_members(household_id);
CREATE INDEX household_invites_token_idx ON household_invites(token);
CREATE INDEX recipe_candidates_household_status_idx
  ON recipe_candidates(household_id, status, created_at DESC);
CREATE INDEX recipe_reviews_household_created_idx ON recipe_reviews(household_id, created_at DESC);
CREATE INDEX saved_recipes_household_idx ON saved_recipes(household_id);
CREATE INDEX birthdays_household_idx ON birthdays(household_id);

ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_reviews ENABLE ROW LEVEL SECURITY;

-- Keep collaboration tables API-mediated for now, aligned with the app's single-household trust model.
CREATE POLICY "Authenticated full access"
ON households FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated full access"
ON household_members FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated full access"
ON household_invites FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated full access"
ON recipe_candidates FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated full access"
ON recipe_reviews FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Household members can read shared recipes"
ON saved_recipes
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR (
    household_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = saved_recipes.household_id
        AND hm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Household members can read shared birthdays"
ON birthdays
FOR SELECT
TO authenticated
USING (
  household_id IS NULL
  OR EXISTS (
    SELECT 1
    FROM household_members hm
    WHERE hm.household_id = birthdays.household_id
      AND hm.user_id = auth.uid()
  )
);

CREATE TRIGGER update_households_updated_at
  BEFORE UPDATE ON households
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipe_candidates_updated_at
  BEFORE UPDATE ON recipe_candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
