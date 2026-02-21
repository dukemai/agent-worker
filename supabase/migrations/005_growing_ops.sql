CREATE TABLE IF NOT EXISTS growing_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL DEFAULT 'Stockholm',
  country_code TEXT NOT NULL DEFAULT 'SE',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  space_type TEXT NOT NULL DEFAULT 'balcony',
  experience_level TEXT NOT NULL DEFAULT 'beginner',
  interests TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT growing_profiles_space_type_check CHECK (space_type IN ('balcony', 'indoor', 'yard', 'mixed')),
  CONSTRAINT growing_profiles_experience_check CHECK (experience_level IN ('beginner', 'intermediate', 'advanced'))
);

CREATE TABLE IF NOT EXISTS growing_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_key TEXT NOT NULL UNIQUE,
  item_name TEXT NOT NULL,
  suggestion_kind TEXT NOT NULL,
  action_type TEXT,
  start_month INT NOT NULL,
  end_month INT NOT NULL,
  priority INT NOT NULL DEFAULT 5,
  suggested_bucket TEXT NOT NULL DEFAULT 'this_week',
  stockholm_note TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT growing_windows_suggestion_kind_check CHECK (suggestion_kind IN ('action', 'inspiration')),
  CONSTRAINT growing_windows_action_type_check CHECK (action_type IN ('seed', 'transplant', 'prune', 'harvest', 'protect', 'plan', 'inspire')),
  CONSTRAINT growing_windows_start_month_check CHECK (start_month BETWEEN 1 AND 12),
  CONSTRAINT growing_windows_end_month_check CHECK (end_month BETWEEN 1 AND 12),
  CONSTRAINT growing_windows_bucket_check CHECK (suggested_bucket IN ('today', 'this_week', 'later'))
);

CREATE TABLE IF NOT EXISTS growing_suggestions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES growing_profiles(id) ON DELETE SET NULL,
  window_id UUID REFERENCES growing_windows(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  details TEXT NOT NULL,
  suggestion_kind TEXT NOT NULL,
  suggested_bucket TEXT NOT NULL DEFAULT 'this_week',
  week_start_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  converted_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT growing_suggestions_kind_check CHECK (suggestion_kind IN ('action', 'inspiration')),
  CONSTRAINT growing_suggestions_bucket_check CHECK (suggested_bucket IN ('today', 'this_week', 'later')),
  CONSTRAINT growing_suggestions_status_check CHECK (status IN ('pending', 'dismissed', 'converted', 'done'))
);

CREATE UNIQUE INDEX IF NOT EXISTS growing_suggestions_unique_week_window
ON growing_suggestions_log (week_start_date, window_id);

INSERT INTO growing_windows (item_key, item_name, suggestion_kind, action_type, start_month, end_month, priority, suggested_bucket, stockholm_note, tags)
VALUES
  ('seed_tomato_indoors', 'Start tomatoes indoors', 'action', 'seed', 2, 4, 10, 'this_week', 'Stockholm frost risk lasts long; start tomatoes indoors before moving out after frost.', ARRAY['tomato', 'vegetable', 'indoor']),
  ('seed_chili_indoors', 'Start chili indoors', 'action', 'seed', 1, 3, 9, 'this_week', 'Chili needs a long season in Stockholm. Early indoor sowing works best.', ARRAY['chili', 'vegetable', 'indoor']),
  ('seed_herbs_window', 'Sow basil and herbs on a windowsill', 'action', 'seed', 3, 9, 8, 'this_week', 'Quick wins for daily cooking; keep close to light and rotate pots weekly.', ARRAY['herb', 'basil', 'indoor']),
  ('harden_seedlings', 'Harden seedlings before transplant', 'action', 'protect', 4, 6, 9, 'this_week', 'Expose seedlings to outdoor conditions gradually over 7-10 days.', ARRAY['seedling', 'transplant']),
  ('transplant_after_frost', 'Transplant warm-season crops after frost', 'action', 'transplant', 5, 6, 10, 'this_week', 'In Stockholm, wait until nights are stable and above roughly 8C.', ARRAY['tomato', 'chili', 'transplant']),
  ('succession_sow_salad', 'Succession sow salad greens', 'action', 'seed', 4, 8, 7, 'this_week', 'Sow small batches every 2-3 weeks for continuous harvest.', ARRAY['salad', 'leafy']),
  ('watering_mulch_check', 'Check watering rhythm and mulch moisture retention', 'action', 'plan', 5, 9, 7, 'this_week', 'Balcony containers dry quickly; mulch helps reduce stress on warm days.', ARRAY['watering', 'mulch', 'balcony']),
  ('harvest_berries', 'Harvest berries and preserve extras', 'action', 'harvest', 7, 9, 6, 'later', 'Stockholm summer can produce short but abundant berry harvest windows.', ARRAY['berry', 'harvest']),
  ('prune_fruit_trees', 'Prune fruit trees in late winter', 'action', 'prune', 2, 3, 6, 'later', 'Prune before active spring growth for shape and airflow.', ARRAY['tree', 'prune']),
  ('protect_autumn_crops', 'Protect crops from early autumn cold nights', 'action', 'protect', 9, 10, 8, 'this_week', 'Use fleece/cover on colder nights to extend harvest.', ARRAY['cold', 'protect']),
  ('inspire_vertical_herb_wall', 'Try a vertical herb wall idea for small spaces', 'inspiration', 'inspire', 1, 12, 5, 'later', 'Great for Stockholm balconies where floor space is limited.', ARRAY['inspiration', 'balcony', 'herb']),
  ('inspire_companion_planting', 'Experiment with companion planting pairings', 'inspiration', 'inspire', 3, 9, 5, 'later', 'Pair herbs with vegetables to save space and support pollinators.', ARRAY['inspiration', 'planning']),
  ('inspire_kids_garden_corner', 'Set up a kids-friendly mini growing corner', 'inspiration', 'inspire', 4, 8, 5, 'later', 'Use fast-growing crops to keep momentum and make it fun for kids.', ARRAY['inspiration', 'family']),
  ('inspire_preserve_harvest', 'Try one simple preserve from your harvest', 'inspiration', 'inspire', 7, 10, 4, 'later', 'A small weekly preserve habit reduces waste during peak season.', ARRAY['inspiration', 'harvest'])
ON CONFLICT (item_key) DO NOTHING;

ALTER TABLE growing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE growing_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE growing_suggestions_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access" ON growing_profiles;
CREATE POLICY "Authenticated full access"
ON growing_profiles
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access" ON growing_windows;
CREATE POLICY "Authenticated full access"
ON growing_windows
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access" ON growing_suggestions_log;
CREATE POLICY "Authenticated full access"
ON growing_suggestions_log
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
