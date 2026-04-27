-- Canonical weekly promotion imports: upload all scraped offers, then match in the dashboard.

CREATE TABLE promotion_import_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  store_key TEXT NOT NULL,
  iso_year INT NOT NULL,
  week_number INT NOT NULL CHECK (week_number BETWEEN 1 AND 53),
  source TEXT NOT NULL DEFAULT 'manual_upload',
  imported_count INT NOT NULL DEFAULT 0,
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE weekly_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES promotion_import_runs(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  store_key TEXT NOT NULL,
  promotion_index INT,
  title TEXT NOT NULL,
  card_text TEXT NOT NULL DEFAULT '',
  price_hint TEXT,
  image_url TEXT,
  source_url TEXT NOT NULL,
  category_key TEXT,
  category_name TEXT,
  dedupe_key TEXT NOT NULL,
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (run_id, dedupe_key)
);

CREATE TABLE weekly_promotion_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES promotion_import_runs(id) ON DELETE CASCADE,
  promotion_id UUID NOT NULL REFERENCES weekly_promotions(id) ON DELETE CASCADE,
  interest TEXT NOT NULL,
  score INT NOT NULL CHECK (score BETWEEN 0 AND 100),
  match_kind TEXT NOT NULL DEFAULT 'watchlist',
  match_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (run_id, promotion_id, interest, match_kind)
);

CREATE TABLE food_style_favorite_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  style_id TEXT NOT NULL,
  style_label TEXT NOT NULL,
  watchlist_text TEXT NOT NULL,
  priority INT NOT NULL DEFAULT 100,
  reason TEXT,
  source TEXT NOT NULL DEFAULT 'admin',
  UNIQUE (style_id, watchlist_text)
);

CREATE INDEX promotion_import_runs_week_idx
  ON promotion_import_runs(store_key, iso_year, week_number, created_at DESC);
CREATE INDEX weekly_promotions_run_sort_idx ON weekly_promotions(run_id, sort_order);
CREATE INDEX weekly_promotions_run_title_idx ON weekly_promotions(run_id, title);
CREATE INDEX weekly_promotion_matches_run_score_idx
  ON weekly_promotion_matches(run_id, score DESC, created_at DESC);
CREATE INDEX food_style_favorite_suggestions_style_idx
  ON food_style_favorite_suggestions(style_id, priority, watchlist_text);

ALTER TABLE promotion_import_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_promotion_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_style_favorite_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access"
ON promotion_import_runs
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated full access"
ON weekly_promotions
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated full access"
ON weekly_promotion_matches
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated full access"
ON food_style_favorite_suggestions
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

INSERT INTO food_style_favorite_suggestions
  (style_id, style_label, watchlist_text, priority, reason, source)
VALUES
  ('vietnamese', 'Vietnamesiskt', 'Kycklingfilé', 10, 'Lean protein for pho, bun, rice bowls, and stir fries.', 'seed'),
  ('vietnamese', 'Vietnamesiskt', 'Fläskkarré', 20, 'Good for grilled pork, caramelized pork, and noodle bowls.', 'seed'),
  ('vietnamese', 'Vietnamesiskt', 'Räkor', 30, 'Useful when seafood offers appear for rolls, salads, and noodle dishes.', 'seed'),
  ('vietnamese', 'Vietnamesiskt', 'Gurka', 40, 'Fresh crunch for bowls, banh mi-style meals, and salads.', 'seed'),
  ('vietnamese', 'Vietnamesiskt', 'Koriander', 50, 'Common fresh herb signal for Vietnamese-style cooking.', 'seed'),
  ('vietnamese', 'Vietnamesiskt', 'Färsk chilipeppar', 60, 'Heat and garnish for soups, dips, and stir fries.', 'seed'),
  ('vietnamese', 'Vietnamesiskt', 'Ingefära', 70, 'Base flavor for broths, marinades, and stir fries.', 'seed'),
  ('vietnamese', 'Vietnamesiskt', 'Vitlök', 80, 'Base flavor in marinades and sauces.', 'seed'),
  ('korean', 'Koreanskt', 'Fläskkarré', 10, 'Good deal target for bulgogi-style pork and grilled meals.', 'seed'),
  ('korean', 'Koreanskt', 'Nötkött', 20, 'Useful for bulgogi, stews, and rice bowls when available.', 'seed'),
  ('korean', 'Koreanskt', 'Kycklinglårfilé', 30, 'Good for spicy chicken, grill, and braised dishes.', 'seed'),
  ('korean', 'Koreanskt', 'Rödkål', 40, 'Works for slaw, quick pickles, and side dishes.', 'seed'),
  ('korean', 'Koreanskt', 'Gurka', 50, 'Easy side dish ingredient and fresh counterpoint.', 'seed'),
  ('korean', 'Koreanskt', 'Vitlök', 60, 'Base flavor in marinades and sauces.', 'seed'),
  ('korean', 'Koreanskt', 'Ingefära', 70, 'Base flavor for stews, marinades, and sauces.', 'seed'),
  ('swedish-nordic', 'Svensk / nordisk husman', 'Potatis', 10, 'Core side for Swedish home cooking.', 'seed'),
  ('swedish-nordic', 'Svensk / nordisk husman', 'Fast potatis', 20, 'Useful staple when potato offers are specific.', 'seed'),
  ('swedish-nordic', 'Svensk / nordisk husman', 'Lax', 30, 'Common Nordic dinner anchor when fish is on offer.', 'seed'),
  ('swedish-nordic', 'Svensk / nordisk husman', 'Fisk', 40, 'Broad fish watch target for weekday Nordic meals.', 'seed'),
  ('swedish-nordic', 'Svensk / nordisk husman', 'Blandfärs', 50, 'Meatballs, patties, and gratins.', 'seed'),
  ('swedish-nordic', 'Svensk / nordisk husman', 'Grädde', 60, 'Sauces, stews, and casseroles.', 'seed'),
  ('swedish-nordic', 'Svensk / nordisk husman', 'Dill', 70, 'Nordic herb for fish, potatoes, and sauces.', 'seed')
ON CONFLICT (style_id, watchlist_text) DO NOTHING;
